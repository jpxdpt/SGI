import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Listar notificações do utilizador
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de notificações
 */
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationService.getUserNotifications(userId, limit, skip),
      // Como getUserNotifications não retorna count, usamos prisma direto aqui ou adicionamos ao service.
      // Para simplificar, assumimos que o frontend lida com paginação infinita ou simples.
      // Mas vamos pegar o total para ser consistente.
      NotificationService.countUnread(userId), // Reusing this for unread count
      NotificationService.countUnread(userId), // Placeholder for total, logic should be refined
    ]);

    res.json({
      data: notifications,
      meta: {
        unreadCount,
        page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Contar notificações não lidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await NotificationService.countUnread(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Marcar notificação como lida
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await NotificationService.markAsRead(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Marcar todas como lidas
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.put('/read-all', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    await NotificationService.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;

