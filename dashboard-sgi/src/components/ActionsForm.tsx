import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { Select } from './ui/Select';
import type { ActionItem, Conformidade, AcaoStatus } from '../types/models';

interface ActionsFormProps {
  actions: Partial<ActionItem>[];
  onChange: (actions: Partial<ActionItem>[]) => void;
  origem: 'Interna' | 'Externa';
  auditId: string;
}

export const ActionsForm = ({ actions, onChange, origem, auditId }: ActionsFormProps) => {
  const addAction = () => {
      const newAction: Partial<ActionItem> = {
      origem,
      acaoRelacionada: auditId,
      conformidade: undefined,
      numeroAssociado: '',
      ambito: '',
      descricao: '',
      causaRaizIdentificada: '',
      acaoCorretiva: '',
      local: '',
      responsavel: '',
      inicio: '',
      termino: '',
      status: 'Andamento',
      mes: '',
      evidencia: '',
      avaliacaoEficacia: '',
    };
    onChange([...actions, newAction]);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, field: keyof ActionItem, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ações Geradas</h3>
        <Button type="button" variant="secondary" onClick={addAction} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Ação
        </Button>
      </div>

      {actions.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          Nenhuma ação adicionada. Clique em "Adicionar Ação" para criar uma.
        </p>
      )}

      {actions.map((action, index) => (
        <div key={index} className="border border-[var(--color-border)] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-sm">Ação #{index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeAction(index)}
              className="text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Conformidade"
              value={action.conformidade || ''}
              onChange={(e) => updateAction(index, 'conformidade', e.target.value as Conformidade)}
            >
              <option value="">Selecione...</option>
              <option value="Conformidade">Conformidade</option>
              <option value="Não conformidade">Não conformidade</option>
            </Select>

            <Input
              label="Número Associado"
              value={action.numeroAssociado || ''}
              onChange={(e) => updateAction(index, 'numeroAssociado', e.target.value)}
            />
          </div>

          <Input
            label="Âmbito"
            value={action.ambito || ''}
            onChange={(e) => updateAction(index, 'ambito', e.target.value)}
            placeholder="Ex: 9001, 14001, NP4469"
          />

          <Textarea
            label="Descrição"
            value={action.descricao || ''}
            onChange={(e) => updateAction(index, 'descricao', e.target.value)}
            rows={3}
            required
          />

          <Textarea
            label="Causa Raíz Identificada"
            value={action.causaRaizIdentificada || ''}
            onChange={(e) => updateAction(index, 'causaRaizIdentificada', e.target.value)}
            rows={3}
            placeholder="Análise de causa (metodologia 5 Porquês, Ishikawa) e causa raiz"
          />

          <Textarea
            label="Ação Corretiva"
            value={action.acaoCorretiva || ''}
            onChange={(e) => updateAction(index, 'acaoCorretiva', e.target.value)}
            rows={3}
            placeholder="Descrição detalhada da ação específica a implementar"
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Local"
              value={action.local || ''}
              onChange={(e) => updateAction(index, 'local', e.target.value)}
              placeholder="Ex: SGI, D. Técnico e Qualidade, Operações, Manutenção"
            />

            <Input
              label="Responsável"
              value={action.responsavel || ''}
              onChange={(e) => updateAction(index, 'responsavel', e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Início"
              type="date"
              value={action.inicio || ''}
              onChange={(e) => updateAction(index, 'inicio', e.target.value)}
            />

            <Input
              label="Término"
              type="date"
              value={action.termino || ''}
              onChange={(e) => updateAction(index, 'termino', e.target.value)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={action.status || 'Andamento'}
              onChange={(e) => updateAction(index, 'status', e.target.value as AcaoStatus)}
            >
              <option value="Andamento">Andamento</option>
              <option value="Executada">Executada</option>
              <option value="Executada+Atraso">Executada+Atraso</option>
              <option value="Atrasada">Atrasada</option>
            </Select>

            <Input
              label="Mês"
              value={action.mes || ''}
              onChange={(e) => updateAction(index, 'mes', e.target.value)}
              placeholder="Ex: Janeiro 2025"
            />
          </div>

          <Textarea
            label="Evidência"
            value={action.evidencia || ''}
            onChange={(e) => updateAction(index, 'evidencia', e.target.value)}
            rows={3}
            placeholder="Documentação/registo que comprova a implementação da ação"
          />

          <Textarea
            label="Avaliação de Eficácia"
            value={action.avaliacaoEficacia || ''}
            onChange={(e) => updateAction(index, 'avaliacaoEficacia', e.target.value)}
            rows={3}
            placeholder="Critérios para verificar se a ação resolveu efetivamente o problema"
          />

        </div>
      ))}
    </div>
  );
};

