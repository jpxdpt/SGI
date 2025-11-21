import { prisma } from '../prisma';
import { Notification } from '@prisma/client';

// Interface para dados de criação de notificação
export interface NotificationData {
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

// Interface para envio de email
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class NotificationService {
  /**
   * Envia uma notificação in-app e opcionalmente por email
   */
  static async send(data: NotificationData, emailOptions?: EmailOptions): Promise<Notification> {
    // Criar notificação in-app
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
      },
    });

    // Enviar email se solicitado
    if (emailOptions) {
      await this.sendEmail(emailOptions);
    }

    return notification;
  }

  /**
   * Envia um email (Mock ou implementação real futura)
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    // TODO: Implementar envio real com nodemailer quando configurado
    console.log(`[Email Mock] Enviando para: ${options.to}`);
    console.log(`[Email Mock] Assunto: ${options.subject}`);
    console.log(`[Email Mock] Conteúdo: ${options.text || 'HTML content'}`);
    
    // Simulação de delay
    // await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Obtém notificações de um utilizador
   */
  static async getUserNotifications(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Conta notificações não lidas
   */
  static async countUnread(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Marca uma notificação como lida
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Garantir que pertence ao utilizador
      },
      data: {
        read: true,
      },
    });
  }

  /**
   * Marca todas as notificações como lidas
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  }
}

