/**
 * Função centralizada para fazer logout automático quando o token expira
 * Pode ser chamada de qualquer lugar sem depender do React Context
 */
export const handleTokenExpired = (): never => {
  // Limpar tokens e dados do utilizador
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('sgi_current_tenant');
  
  // Redirecionar para login
  window.location.href = '/login';
  
  // Lançar erro para interromper a execução
  throw new Error('Sessão expirada. Por favor, inicie sessão novamente.');
};

/**
 * Verifica se uma resposta HTTP indica erro de autenticação (401/403)
 */
export const isAuthError = (status: number): boolean => {
  return status === 401 || status === 403;
};

/**
 * Helper para tratar erros de autenticação em respostas fetch
 */
export const checkAuthError = async (response: Response): Promise<void> => {
  if (isAuthError(response.status)) {
    handleTokenExpired();
  }
};

