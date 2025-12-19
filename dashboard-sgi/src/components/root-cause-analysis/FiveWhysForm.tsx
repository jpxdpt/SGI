import { useState, useEffect } from 'react';
import { Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { HelpCircle, ArrowDown } from 'lucide-react';

export interface FiveWhysData {
  problem: string;
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
  rootCause: string;
}

interface FiveWhysFormProps {
  initialData?: FiveWhysData | null;
  onChange?: (data: FiveWhysData) => void;
  readOnly?: boolean;
}

export const FiveWhysForm = ({ initialData, onChange, readOnly = false }: FiveWhysFormProps) => {
  const [data, setData] = useState<FiveWhysData>({
    problem: '',
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    rootCause: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleChange = (field: keyof FiveWhysData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange?.(newData);
  };

  const clearForm = () => {
    const emptyData: FiveWhysData = {
      problem: '',
      why1: '',
      why2: '',
      why3: '',
      why4: '',
      why5: '',
      rootCause: '',
    };
    setData(emptyData);
    onChange?.(emptyData);
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
          Análise 5 Porquês
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Identifique a causa raiz através de uma análise sistemática, perguntando "porquê?" cinco vezes consecutivas.
        </p>
      </div>

      <div className="space-y-6">
        {/* Problema */}
        <div>
          <Textarea
            label="1. Problema Identificado"
            placeholder="Descreva o problema ou não conformidade observada"
            value={data.problem}
            onChange={(e) => handleChange('problem', e.target.value)}
            rows={3}
            readOnly={readOnly}
            helperText="Seja específico e objetivo na descrição do problema"
          />
        </div>

        {/* 1º Porquê */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-5 h-5 text-brand-500" />
            <label className="text-sm font-medium text-[var(--color-foreground)]">
              2. Por que isso aconteceu?
            </label>
            <HelpCircle className="w-4 h-4 text-slate-400" title="Primeira causa imediata" />
          </div>
          <Textarea
            placeholder="Resposta ao primeiro porquê"
            value={data.why1}
            onChange={(e) => handleChange('why1', e.target.value)}
            rows={2}
            readOnly={readOnly}
          />
        </div>

        {/* 2º Porquê */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-5 h-5 text-brand-500" />
            <label className="text-sm font-medium text-[var(--color-foreground)]">
              3. Por que isso aconteceu?
            </label>
            <HelpCircle className="w-4 h-4 text-slate-400" title="Segunda causa mais profunda" />
          </div>
          <Textarea
            placeholder="Resposta ao segundo porquê"
            value={data.why2}
            onChange={(e) => handleChange('why2', e.target.value)}
            rows={2}
            readOnly={readOnly}
            disabled={!data.why1 && !readOnly}
          />
        </div>

        {/* 3º Porquê */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-5 h-5 text-brand-500" />
            <label className="text-sm font-medium text-[var(--color-foreground)]">
              4. Por que isso aconteceu?
            </label>
            <HelpCircle className="w-4 h-4 text-slate-400" title="Terceira causa mais profunda" />
          </div>
          <Textarea
            placeholder="Resposta ao terceiro porquê"
            value={data.why3}
            onChange={(e) => handleChange('why3', e.target.value)}
            rows={2}
            readOnly={readOnly}
            disabled={!data.why2 && !readOnly}
          />
        </div>

        {/* 4º Porquê */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-5 h-5 text-brand-500" />
            <label className="text-sm font-medium text-[var(--color-foreground)]">
              5. Por que isso aconteceu?
            </label>
            <HelpCircle className="w-4 h-4 text-slate-400" title="Quarta causa mais profunda" />
          </div>
          <Textarea
            placeholder="Resposta ao quarto porquê"
            value={data.why4}
            onChange={(e) => handleChange('why4', e.target.value)}
            rows={2}
            readOnly={readOnly}
            disabled={!data.why3 && !readOnly}
          />
        </div>

        {/* 5º Porquê */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown className="w-5 h-5 text-brand-500" />
            <label className="text-sm font-medium text-[var(--color-foreground)]">
              6. Por que isso aconteceu?
            </label>
            <HelpCircle className="w-4 h-4 text-slate-400" title="Quinta causa mais profunda - normalmente a causa raiz" />
          </div>
          <Textarea
            placeholder="Resposta ao quinto porquê"
            value={data.why5}
            onChange={(e) => handleChange('why5', e.target.value)}
            rows={2}
            readOnly={readOnly}
            disabled={!data.why4 && !readOnly}
          />
        </div>

        {/* Causa Raiz */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <Textarea
            label="7. Causa Raiz Identificada"
            placeholder="Síntese da causa raiz identificada através da análise"
            value={data.rootCause}
            onChange={(e) => handleChange('rootCause', e.target.value)}
            rows={3}
            readOnly={readOnly}
            helperText="Esta é a causa fundamental que, se corrigida, impedirá a recorrência do problema"
          />
        </div>
      </div>

      {!readOnly && (
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={clearForm} size="sm">
            Limpar Formulário
          </Button>
        </div>
      )}
    </Card>
  );
};







