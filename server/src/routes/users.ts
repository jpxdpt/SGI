import express from 'express';
import { prisma } from '../prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/password';

const router = express.Router();

// Listar todos os utilizadores do tenant
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const users = await prisma.user.findMany({
            where: { tenantId: req.user.tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json(users);
    } catch (error) {
        console.error('[USERS_GET_ERROR]', error);
        res.status(500).json({ message: 'Erro ao listar utilizadores.' });
    }
});

// Criar utilizador
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Dados incompletos.' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: 'Email já em uso.' });
        }

        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role,
                tenantId: req.user.tenantId,
            },
        });

        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        console.error('[USERS_CREATE_ERROR]', error);
        res.status(500).json({ message: 'Erro ao criar utilizador.' });
    }
});

// Eliminar utilizador
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        const { id } = req.params;

        // Impedir que se elimine a si próprio
        if (id === req.user.id) {
            return res.status(400).json({ message: 'Não podes eliminar a tua própria conta.' });
        }

        await prisma.user.delete({
            where: { id },
        });

        res.json({ message: 'Utilizador eliminado com sucesso.' });
    } catch (error) {
        console.error('[USERS_DELETE_ERROR]', error);
        res.status(500).json({ message: 'Erro ao eliminar utilizador.' });
    }
});

export default router;
