# Plano de Implementação: Workflow Engine Executor

## Estado Atual

✅ **Já existe:**
- Schema Prisma completo: `WorkflowDefinition`, `WorkflowStep`, `WorkflowInstance`, `WorkflowStepExecution`
- Página frontend `WorkflowsPage.tsx` para criar/editar definições de workflows
- Enums: `WorkflowStatus`, `WorkflowStepType`

❌ **Falta implementar:**
- Executor de workflows (engine que processa instâncias)
- Service layer para lógica de negócio
- Controllers e rotas para operações de workflow
- Integração com entidades (auditorias, ações, ocorrências)

## Objetivos

1. Criar um engine de execução de workflows configurável
2. Permitir iniciar workflows baseados em definições
3. Processar passos sequenciais (APPROVAL, NOTIFICATION, CONDITION)
4. Gerenciar estados e transições de workflows
5. Integrar workflows com entidades do sistema (auditorias, ações, documentos)

## Arquitetura

### 1. Backend: Workflow Engine Service

**Ficheiros a criar:**
- `server/src/services/workflowEngineService.ts` - Motor principal de execução
- `server/src/services/workflowExecutor.ts` - Executor de passos individuais
- `server/src/services/workflowConditionEvaluator.ts` - Avaliador de condições
- `server/src/controllers/workflowController.ts` - Controllers para operações
- `server/src/routes/workflows.ts` - Rotas da API

**Funcionalidades principais:**
- `startWorkflow(definitionId, entityType, entityId, userId)` - Iniciar uma instância
- `executeNextStep(instanceId, userId, data?)` - Executar próximo passo
- `approveStep(stepExecutionId, userId, comments?)` - Aprovar passo
- `rejectStep(stepExecutionId, userId, comments?)` - Rejeitar passo
- `cancelWorkflow(instanceId, userId)` - Cancelar workflow
- `evaluateConditions(step, instance)` - Avaliar condições para avançar
- `sendNotifications(step, instance)` - Enviar notificações

### 2. Tipos de Passos (WorkflowStepType)

#### APPROVAL (Aprovação)
- Requer ação manual de utilizador
- Valida roles/usuários permitidos
- Permite comentários
- Pode ter timeout

#### NOTIFICATION (Notificação)
- Envia notificação automática
- Usa template configurado
- Pode avançar automaticamente (`autoAdvance`)

#### CONDITION (Condição)
- Avalia expressão condicional
- Baseado em dados da entidade
- Decide próximo passo ou finaliza workflow

### 3. Estados do Workflow

```
DRAFT → PENDING_APPROVAL → APPROVED / REJECTED / CANCELLED
```

### 4. Fluxo de Execução

1. **Iniciar Workflow:**
   - Criar `WorkflowInstance`
   - Status: `DRAFT`
   - Buscar primeiro passo da definição
   - Criar `WorkflowStepExecution` para primeiro passo

2. **Executar Passo:**
   - Se APPROVAL: criar aprovação, aguardar ação manual
   - Se NOTIFICATION: enviar notificação, avançar se `autoAdvance`
   - Se CONDITION: avaliar expressão, decidir próximo passo

3. **Avançar para Próximo Passo:**
   - Marcar passo atual como concluído
   - Buscar próximo passo (se houver)
   - Criar novo `WorkflowStepExecution`
   - Atualizar `currentStepOrder`

4. **Finalizar Workflow:**
   - Último passo concluído
   - Status: `APPROVED` ou `REJECTED`
   - Atualizar `completedAt`

## Implementação

### Fase 1: Service Layer (Backend)

#### 1.1 WorkflowEngineService
```typescript
class WorkflowEngineService {
  async startWorkflow(definitionId, entityType, entityId, userId, tenantId)
  async executeStep(stepExecutionId, userId, action, data?)
  async approveStep(stepExecutionId, userId, comments?)
  async rejectStep(stepExecutionId, userId, comments?)
  async cancelWorkflow(instanceId, userId)
  async getWorkflowStatus(instanceId)
  async getPendingSteps(instanceId, userId)
}
```

#### 1.2 WorkflowExecutor
```typescript
class WorkflowExecutor {
  async executeApprovalStep(step, instance, userId, action)
  async executeNotificationStep(step, instance)
  async executeConditionStep(step, instance)
  async getEntityData(entityType, entityId, tenantId)
  async evaluateCondition(expression, entityData)
}
```

### Fase 2: API Endpoints

#### Rotas
- `POST /api/workflows/start` - Iniciar workflow
- `POST /api/workflows/:instanceId/execute` - Executar passo
- `POST /api/workflows/:instanceId/approve` - Aprovar passo
- `POST /api/workflows/:instanceId/reject` - Rejeitar passo
- `POST /api/workflows/:instanceId/cancel` - Cancelar workflow
- `GET /api/workflows/instances` - Listar instâncias
- `GET /api/workflows/instances/:id` - Detalhes da instância
- `GET /api/workflows/instances/pending` - Passos pendentes do utilizador

### Fase 3: Frontend

#### Componentes
- `WorkflowInstanceList.tsx` - Lista de instâncias em execução
- `WorkflowInstanceDetail.tsx` - Detalhes da instância
- `WorkflowStepCard.tsx` - Card de passo individual
- `WorkflowActionModal.tsx` - Modal para aprovar/rejeitar
- `WorkflowStartModal.tsx` - Modal para iniciar workflow

#### Páginas
- Atualizar `WorkflowsPage.tsx` com:
  - Tab para instâncias ativas
  - Integração para iniciar workflows de entidades
  - Visualização de status e progresso

### Fase 4: Integrações

#### Entidades suportadas
- InternalAudit
- ExternalAudit
- ActionItem
- Occurrence
- Document

#### Integração automática
- Botão "Iniciar Workflow" em páginas de entidades
- Seleção de definição de workflow
- Status visual nas listagens

## Ordem de Implementação

1. ✅ Criar `WorkflowEngineService` com métodos básicos
2. ✅ Criar `WorkflowExecutor` para processar passos
3. ✅ Implementar avaliação de condições simples
4. ✅ Criar controllers e rotas
5. ✅ Testar execução básica (APPROVAL)
6. ✅ Implementar NOTIFICATION step
7. ✅ Implementar CONDITION step
8. ✅ Frontend: Lista de instâncias
9. ✅ Frontend: Interface de aprovação
10. ✅ Integração com entidades

## Exemplos de Uso

### Workflow de Aprovação de Auditoria
```
1. APPROVAL - Gestor deve aprovar auditoria
2. NOTIFICATION - Notificar equipa de qualidade
3. APPROVAL - Diretor final deve aprovar
4. CONDITION - Se aprovado, criar ações automaticamente
```

### Workflow de Resolução de Ocorrência
```
1. NOTIFICATION - Notificar responsável
2. APPROVAL - Responsável confirma receção
3. CONDITION - Se gravidade = Crítica, notificar diretor
4. APPROVAL - Aprovar resolução
```

## Tecnologias

- **Backend**: Node.js, Prisma, Express
- **Frontend**: React, React Query
- **Condições**: Avaliação simples (JSON expressions) ou biblioteca como `json-rules-engine`


