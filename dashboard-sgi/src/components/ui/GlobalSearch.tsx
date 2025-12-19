import { Search, X, ArrowRight, ClipboardList, Briefcase, ListChecks } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchInternalAudits,
  fetchExternalAudits,
  fetchActionItems,
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface SearchResult {
  id: string;
  type: 'internal_audit' | 'external_audit' | 'action';
  title: string;
  subtitle: string;
  link: string;
  icon: React.ReactNode;
}

const useGlobalSearch = (query: string) => {
  const safeLower = (value?: string | null) => (typeof value === 'string' ? value.toLowerCase() : '');

  const internalAuditsQuery = useQuery({ queryKey: ['audits', 'internal'], queryFn: () => fetchInternalAudits() });
  const externalAuditsQuery = useQuery({ queryKey: ['audits', 'external'], queryFn: () => fetchExternalAudits() });
  const actionsQuery = useQuery({ queryKey: ['actions'], queryFn: () => fetchActionItems() });

  const searchResults = (): SearchResult[] => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Buscar em auditorias internas
    (internalAuditsQuery.data ?? []).forEach((audit) => {
      const match =
        safeLower(audit.id).includes(lowerQuery) ||
        safeLower((audit as any).setor).includes(lowerQuery) ||
        safeLower((audit as any).responsavel).includes(lowerQuery) ||
        safeLower((audit as any).descricao).includes(lowerQuery);

      if (match) {
        results.push({
          id: `internal-${audit.id}`,
          type: 'internal_audit',
          title: audit.id,
          subtitle: `${(audit as any).setor ?? 'Sem setor'} - ${(audit as any).responsavel ?? ''}`,
          link: '/auditorias-internas',
          icon: <ClipboardList className="h-4 w-4" />,
        });
      }
    });

    // Buscar em auditorias externas
    (externalAuditsQuery.data ?? []).forEach((audit) => {
      const match =
        safeLower(audit.id).includes(lowerQuery) ||
        safeLower((audit as any).setor).includes(lowerQuery) ||
        safeLower((audit as any).responsavel).includes(lowerQuery) ||
        safeLower((audit as any).entidadeAuditora).includes(lowerQuery) ||
        safeLower((audit as any).descricao).includes(lowerQuery);

      if (match) {
        results.push({
          id: `external-${audit.id}`,
          type: 'external_audit',
          title: audit.id,
          subtitle: `${(audit as any).entidadeAuditora || (audit as any).setor || ''} - ${(audit as any).responsavel ?? ''}`,
          link: '/auditorias-externas',
          icon: <Briefcase className="h-4 w-4" />,
        });
      }
    });

    // Buscar em ações
    (actionsQuery.data ?? []).forEach((action) => {
      const match =
        safeLower(action.id).includes(lowerQuery) ||
        safeLower((action as any).setor).includes(lowerQuery) ||
        safeLower((action as any).descricao).includes(lowerQuery);

      if (match) {
        results.push({
          id: `action-${action.id}`,
          type: 'action',
          title: action.id,
          subtitle: `${action.setor} - ${action.descricao.substring(0, 50)}...`,
          link: '/acoes',
          icon: <ListChecks className="h-4 w-4" />,
        });
      }
    });


    return results.slice(0, 10); // Limitar a 10 resultados
  };

  return searchResults();
};

export const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useGlobalSearch(query);

  useEffect(() => {
    setIsOpen(query.length > 0 && results.length > 0);
  }, [query, results.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && focusedIndex >= 0 && results[focusedIndex]) {
      handleResultClick(results[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.link);
    setIsOpen(false);
    setQuery('');
    setFocusedIndex(-1);
  };

  const typeLabels = {
    internal_audit: 'Auditoria Interna',
    external_audit: 'Auditoria Externa',
    action: 'Ação',
  };

  return (
    <div className="relative flex-1 max-w-md" ref={searchRef}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFocusedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && results.length > 0 && setIsOpen(true)}
          placeholder="Pesquisar..."
          className="flex-1 bg-transparent border-0 outline-0 text-sm min-w-0"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-3 w-3 text-slate-400" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 animate-scale-in max-h-[400px] overflow-y-auto">
          <div className="p-2">
            {results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleResultClick(result)}
                className={clsx(
                  'w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-1',
                  'flex items-start gap-3',
                  focusedIndex === index && 'bg-slate-100 dark:bg-slate-800',
                )}
              >
                <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500 shrink-0 mt-0.5">
                  {result.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    <span className="text-xs text-slate-400 shrink-0">{typeLabels[result.type]}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.length > 0 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 animate-scale-in p-8 text-center">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50 text-slate-400" />
          <p className="text-sm text-slate-500">Nenhum resultado encontrado</p>
        </div>
      )}
    </div>
  );
};





