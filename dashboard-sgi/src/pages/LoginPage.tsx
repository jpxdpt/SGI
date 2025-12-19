import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export const LoginPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegistering) {
        // Registro
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, companyName }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao criar conta');
        }

        showToast('Conta criada com sucesso! Pode agora iniciar sessão.', 'success');
        setIsRegistering(false);
        setPassword('');
      } else {
        // Login
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-xl p-8 relative overflow-hidden">
          {/* Brand Decor */}
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />

          <div className="flex items-center justify-center mb-8">
            <div className="h-16 w-16 rounded-xl bg-brand-500 text-white flex items-center justify-center font-semibold shadow-md transform transition-transform hover:scale-105">
              SGI
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
              {isRegistering ? 'Criar Nova Conta' : 'Sistema de Gestão Integrada'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isRegistering
                ? 'Registe-se para começar a gerir o seu sistema'
                : 'Inicie sessão para continuar para o painel'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-sm text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <div className="group animate-in fade-in slide-in-from-left-4 duration-300">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  placeholder="Ex: Manuel Silva"
                  disabled={isLoading}
                />
              </div>
            )}

            {isRegistering && (
              <div className="group animate-in fade-in slide-in-from-left-4 duration-400">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  placeholder="Ex: Minha Fábrica Lda"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                Endereço de Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                placeholder="exemplo@email.pt"
                disabled={isLoading}
              />
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">
                Palavra-passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>A processar...</span>
                </>
              ) : (
                <>
                  {isRegistering ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                  <span>{isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-border)] text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm font-medium text-brand-500 hover:text-brand-600 flex items-center justify-center gap-2 mx-auto group transition-colors"
            >
              {isRegistering ? (
                <>
                  <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
                  Voltar para o Login
                </>
              ) : (
                <>
                  Não tem uma conta? <span className="underline decoration-2 underline-offset-4">Registe-se aqui</span>
                </>
              )}
            </button>
          </div>

          {!isRegistering && (
            <div className="mt-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold mb-2">Modo Demonstração</p>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400">admin@demo.local / admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
