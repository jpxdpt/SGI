import { verifyAccessToken, verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../middleware/auth';

describe('JWT Middleware', () => {
  const mockUser = {
    userId: 'test-user-id',
    email: 'test@test.local',
    role: 'ADMIN',
    tenantId: 'test-tenant-id',
  };

  describe('generateAccessToken e verifyAccessToken', () => {
    it('deve gerar e verificar token de acesso válido', () => {
      const token = generateAccessToken(mockUser.userId, mockUser.email, mockUser.role, mockUser.tenantId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = verifyAccessToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.userId);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.role).toBe(mockUser.role);
      expect(payload?.tenantId).toBe(mockUser.tenantId);
    });

    it('deve retornar null para token inválido', () => {
      const payload = verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });
  });

  describe('generateRefreshToken e verifyRefreshToken', () => {
    it('deve gerar e verificar refresh token válido', () => {
      const token = generateRefreshToken(mockUser.userId, mockUser.email, mockUser.role, mockUser.tenantId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const payload = verifyRefreshToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(mockUser.userId);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.role).toBe(mockUser.role);
      expect(payload?.tenantId).toBe(mockUser.tenantId);
    });

    it('deve retornar null para refresh token inválido', () => {
      const payload = verifyRefreshToken('invalid-token');
      expect(payload).toBeNull();
    });
  });
});











