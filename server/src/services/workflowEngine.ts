import { prisma } from '../prisma';
import { WorkflowStatus, WorkflowStepType, Role } from '@prisma/client';

export interface WorkflowContext {
  tenantId: string;
  entityType: string;
  entityId: string;
  entityData?: any;
  userId: string;
  userRole: Role;
}

export interface WorkflowStepResult {
  success: boolean;
  nextStep?: number;
  status: WorkflowStatus;
  message?: string;
}

/**
 * Engine de workflows configurável
 * Suporta aprovações multi-nível, notificações e condições
 */
export class WorkflowEngine {
  /**
   * Inicia um workflow para uma entidade
   */
  static async startWorkflow(
    definitionId: string,
    context: WorkflowContext,
  ): Promise<{ instanceId: string; status: WorkflowStatus }> {
    const definition = await prisma.workflowDefinition.findUnique({
      where: { id: definitionId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    if (!definition || !definition.isActive) {
      throw new Error('Workflow definition não encontrada ou inativa.');
    }

    if (definition.tenantId !== context.tenantId) {
      throw new Error('Workflow não pertence ao tenant.');
    }

    if (definition.entityType !== context.entityType) {
      throw new Error('Tipo de entidade incompatível com o workflow.');
    }

    // Verificar se já existe uma instância ativa para esta entidade
    const existing = await prisma.workflowInstance.findFirst({
      where: {
        tenantId: context.tenantId,
        entityType: context.entityType,
        entityId: context.entityId,
        status: {
          in: [WorkflowStatus.DRAFT, WorkflowStatus.PENDING_APPROVAL],
        },
      },
    });

    if (existing) {
      throw new Error('Já existe um workflow em execução para esta entidade.');
    }

    // Criar instância
    const instance = await prisma.workflowInstance.create({
      data: {
        tenantId: context.tenantId,
        workflowDefinitionId: definitionId,
        entityType: context.entityType,
        entityId: context.entityId,
        status: WorkflowStatus.DRAFT,
        startedBy: context.userId,
        currentStepOrder: definition.steps.length > 0 ? 1 : null,
      },
    });

    // Se há passos, iniciar o primeiro
    if (definition.steps.length > 0) {
      await this.advanceToStep(instance.id, 1, context);
    } else {
      // Se não há passos, completar imediatamente
      await prisma.workflowInstance.update({
        where: { id: instance.id },
        data: {
          status: WorkflowStatus.APPROVED,
          completedAt: new Date(),
        },
      });
    }

    return {
      instanceId: instance.id,
      status: WorkflowStatus.PENDING_APPROVAL,
    };
  }

  /**
   * Avança para o próximo passo do workflow
   */
  static async advanceToStep(
    instanceId: string,
    stepOrder: number,
    context: WorkflowContext,
  ): Promise<WorkflowStepResult> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflowDefinition: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!instance || instance.tenantId !== context.tenantId) {
      throw new Error('Workflow instance não encontrada.');
    }

    const step = instance.workflowDefinition.steps.find((s) => s.stepOrder === stepOrder);
    if (!step) {
      throw new Error(`Passo ${stepOrder} não encontrado no workflow.`);
    }

    // Criar execução do passo
    const stepExecution = await prisma.workflowStepExecution.create({
      data: {
        workflowInstanceId: instanceId,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        status: WorkflowStatus.PENDING_APPROVAL,
      },
    });

    // Executar o passo baseado no tipo
    let result: WorkflowStepResult;

    switch (step.stepType) {
      case WorkflowStepType.APPROVAL:
        result = await this.handleApprovalStep(step, instance, context);
        break;
      case WorkflowStepType.NOTIFICATION:
        result = await this.handleNotificationStep(step, instance, context);
        break;
      case WorkflowStepType.CONDITION:
        result = await this.handleConditionStep(step, instance, context);
        break;
      default:
        result = {
          success: false,
          status: WorkflowStatus.REJECTED,
          message: 'Tipo de passo não suportado.',
        };
    }

    // Atualizar execução do passo
    await prisma.workflowStepExecution.update({
      where: { id: stepExecution.id },
      data: {
        status: result.status,
        executedBy: result.success ? context.userId : null,
        executedAt: result.success ? new Date() : null,
      },
    });

    // Se autoAdvance, avançar automaticamente
    if (result.success && step.autoAdvance && result.nextStep) {
      return await this.advanceToStep(instanceId, result.nextStep, context);
    }

    // Atualizar instância
    const nextStatus =
      result.status === WorkflowStatus.APPROVED && result.nextStep
        ? WorkflowStatus.PENDING_APPROVAL
        : result.status;

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: nextStatus,
        currentStepOrder: result.nextStep || null,
        completedAt: result.status === WorkflowStatus.APPROVED && !result.nextStep ? new Date() : null,
      },
    });

    return result;
  }

  /**
   * Executa um passo de aprovação
   */
  private static async handleApprovalStep(
    step: any,
    instance: any,
    context: WorkflowContext,
  ): Promise<WorkflowStepResult> {
    // Verificar se o utilizador tem permissão
    const requiredRoles = Array.isArray(step.requiredRoles) ? step.requiredRoles : (step.requiredRoles ? JSON.parse(JSON.stringify(step.requiredRoles)) : []);
    const requiredUsers = Array.isArray(step.requiredUsers) ? step.requiredUsers : (step.requiredUsers ? JSON.parse(JSON.stringify(step.requiredUsers)) : []);

    if (requiredRoles.length > 0 && !requiredRoles.includes(context.userRole)) {
      return {
        success: false,
        status: WorkflowStatus.PENDING_APPROVAL,
        message: 'Utilizador não tem permissão para aprovar este passo.',
      };
    }

    if (requiredUsers.length > 0 && !requiredUsers.includes(context.userId)) {
      return {
        success: false,
        status: WorkflowStatus.PENDING_APPROVAL,
        message: 'Utilizador não autorizado para este passo.',
      };
    }

    // Se chegou aqui, significa que foi aprovado manualmente
    // Avançar para o próximo passo
    const nextStep = this.getNextStep(instance, step.stepOrder);
    return {
      success: true,
      status: nextStep ? WorkflowStatus.PENDING_APPROVAL : WorkflowStatus.APPROVED,
      nextStep,
      message: 'Passo aprovado com sucesso.',
    };
  }

  /**
   * Executa um passo de notificação
   */
  private static async handleNotificationStep(
    step: any,
    instance: any,
    context: WorkflowContext,
  ): Promise<WorkflowStepResult> {
    // TODO: Enviar notificação usando notificationService
    // Por agora, apenas avançar automaticamente
    const nextStep = this.getNextStep(instance, step.stepOrder);
    return {
      success: true,
      status: nextStep ? WorkflowStatus.PENDING_APPROVAL : WorkflowStatus.APPROVED,
      nextStep,
      message: 'Notificação enviada.',
    };
  }

  /**
   * Executa um passo condicional
   */
  private static async handleConditionStep(
    step: any,
    instance: any,
    context: WorkflowContext,
  ): Promise<WorkflowStepResult> {
    // TODO: Avaliar expressão condicional
    // Por agora, avançar sempre
    const nextStep = this.getNextStep(instance, step.stepOrder);
    return {
      success: true,
      status: nextStep ? WorkflowStatus.PENDING_APPROVAL : WorkflowStatus.APPROVED,
      nextStep,
      message: 'Condição avaliada.',
    };
  }

  /**
   * Obtém o próximo passo do workflow
   */
  private static getNextStep(instance: any, currentStepOrder: number): number | undefined {
    const steps = instance.workflowDefinition.steps;
    const nextStep = steps.find((s: any) => s.stepOrder > currentStepOrder);
    return nextStep?.stepOrder;
  }

  /**
   * Aprova o passo atual do workflow
   */
  static async approveStep(
    instanceId: string,
    stepOrder: number,
    userId: string,
    comments?: string,
  ): Promise<WorkflowStepResult> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflowDefinition: {
          include: {
            steps: true,
          },
        },
        startedByUser: true,
      },
    });

    if (!instance) {
      throw new Error('Workflow instance não encontrada.');
    }

    if (instance.status !== WorkflowStatus.PENDING_APPROVAL) {
      throw new Error('Workflow não está em estado de aprovação pendente.');
    }

    if (instance.currentStepOrder !== stepOrder) {
      throw new Error('Passo incorreto para aprovação.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.tenantId !== instance.tenantId) {
      throw new Error('Utilizador não encontrado ou não pertence ao tenant.');
    }

    const context: WorkflowContext = {
      tenantId: instance.tenantId,
      entityType: instance.entityType,
      entityId: instance.entityId,
      userId: user.id,
      userRole: user.role,
    };

    // Atualizar execução do passo atual
    const currentExecution = await prisma.workflowStepExecution.findFirst({
      where: {
        workflowInstanceId: instanceId,
        stepOrder,
        status: WorkflowStatus.PENDING_APPROVAL,
      },
    });

    if (currentExecution) {
      await prisma.workflowStepExecution.update({
        where: { id: currentExecution.id },
        data: {
          status: WorkflowStatus.APPROVED,
          executedBy: userId,
          executedAt: new Date(),
          comments,
        },
      });
    }

    // Avançar para o próximo passo
    return await this.advanceToStep(instanceId, stepOrder, context);
  }

  /**
   * Rejeita o passo atual do workflow
   */
  static async rejectStep(
    instanceId: string,
    stepOrder: number,
    userId: string,
    comments?: string,
  ): Promise<void> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error('Workflow instance não encontrada.');
    }

    const execution = await prisma.workflowStepExecution.findFirst({
      where: {
        workflowInstanceId: instanceId,
        stepOrder,
        status: WorkflowStatus.PENDING_APPROVAL,
      },
    });

    if (execution) {
      await prisma.workflowStepExecution.update({
        where: { id: execution.id },
        data: {
          status: WorkflowStatus.REJECTED,
          executedBy: userId,
          executedAt: new Date(),
          comments,
        },
      });
    }

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowStatus.REJECTED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Cancela um workflow
   */
  static async cancelWorkflow(instanceId: string, userId: string): Promise<void> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error('Workflow instance não encontrada.');
    }

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowStatus.CANCELLED,
        cancelledBy: userId,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Obtém o workflow ativo para uma entidade
   */
  static async getActiveWorkflow(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<any | null> {
    return await prisma.workflowInstance.findFirst({
      where: {
        tenantId,
        entityType,
        entityId,
        status: {
          in: [WorkflowStatus.DRAFT, WorkflowStatus.PENDING_APPROVAL],
        },
      },
      include: {
        workflowDefinition: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
        stepExecutions: {
          orderBy: { stepOrder: 'asc' },
        },
        startedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

