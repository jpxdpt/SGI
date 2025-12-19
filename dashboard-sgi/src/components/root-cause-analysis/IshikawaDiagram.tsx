import { useState, useEffect } from 'react';
import { Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Plus, X, HelpCircle } from 'lucide-react';

export interface IshikawaCategory {
  id: string;
  name: string;
  causes: string[];
}

export interface IshikawaData {
  problem: string;
  categories: IshikawaCategory[];
  rootCause: string;
}

interface IshikawaDiagramProps {
  initialData?: IshikawaData | null;
  onChange?: (data: IshikawaData) => void;
  readOnly?: boolean;
}

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Método', causes: [] },
  { id: '2', name: 'Máquina', causes: [] },
  { id: '3', name: 'Material', causes: [] },
  { id: '4', name: 'Mão-de-obra', causes: [] },
  { id: '5', name: 'Meio Ambiente', causes: [] },
  { id: '6', name: 'Medição', causes: [] },
];

export const IshikawaDiagram = ({ initialData, onChange, readOnly = false }: IshikawaDiagramProps) => {
  const [data, setData] = useState<IshikawaData>({
    problem: '',
    categories: DEFAULT_CATEGORIES.map(cat => ({ ...cat })),
    rootCause: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleChange = (newData: IshikawaData) => {
    setData(newData);
    onChange?.(newData);
  };

  const handleProblemChange = (problem: string) => {
    handleChange({ ...data, problem });
  };

  const handleRootCauseChange = (rootCause: string) => {
    handleChange({ ...data, rootCause });
  };

  const addCause = (categoryId: string) => {
    const newCategories = data.categories.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, causes: [...cat.causes, ''] };
      }
      return cat;
    });
    handleChange({ ...data, categories: newCategories });
  };

  const updateCause = (categoryId: string, causeIndex: number, value: string) => {
    const newCategories = data.categories.map(cat => {
      if (cat.id === categoryId) {
        const newCauses = [...cat.causes];
        newCauses[causeIndex] = value;
        return { ...cat, causes: newCauses };
      }
      return cat;
    });
    handleChange({ ...data, categories: newCategories });
  };

  const removeCause = (categoryId: string, causeIndex: number) => {
    const newCategories = data.categories.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, causes: cat.causes.filter((_, idx) => idx !== causeIndex) };
      }
      return cat;
    });
    handleChange({ ...data, categories: newCategories });
  };

  const clearForm = () => {
    const emptyData: IshikawaData = {
      problem: '',
      categories: DEFAULT_CATEGORIES.map(cat => ({ ...cat, causes: [] })),
      rootCause: '',
    };
    handleChange(emptyData);
  };

  // Renderizar o diagrama visual
  const renderDiagram = () => {
    const maxCauses = Math.max(...data.categories.map(cat => cat.causes.length), 1);

    return (
      <div className="relative w-full overflow-x-auto p-8 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <svg width="100%" height={Math.max(400, maxCauses * 80 + 200)} viewBox="0 0 800 500" className="border border-[var(--color-border)] rounded">
          {/* Linha principal horizontal (espinha) */}
          <line
            x1="400"
            y1="250"
            x2="750"
            y2="250"
            stroke="currentColor"
            strokeWidth="3"
            className="text-[var(--color-foreground)]"
          />

          {/* Cabeça do peixe (problema) */}
          <polygon
            points="750,250 800,200 800,300"
            fill="var(--color-bg)"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--color-foreground)]"
          />
          <text
            x="775"
            y="250"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs font-medium fill-[var(--color-foreground)]"
          >
            Problema
          </text>

          {/* Categorias (espinhas diagonais) */}
          {data.categories.map((category, catIndex) => {
            const angle = catIndex % 2 === 0 ? -30 : 30;
            const yOffset = Math.floor(catIndex / 2) * 120;
            const x1 = 500;
            const y1 = 250 + yOffset;
            const x2 = 400;
            const y2 = y1;
            const x3 = x2 - 100 * Math.cos((angle * Math.PI) / 180);
            const y3 = y2 - 100 * Math.sin((angle * Math.PI) / 180);

            return (
              <g key={category.id}>
                {/* Linha diagonal da categoria */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x3}
                  y2={y3}
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-slate-400"
                />

                {/* Label da categoria */}
                <text
                  x={x3 - 10}
                  y={y3}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-[var(--color-foreground)]"
                >
                  {category.name}
                </text>

                {/* Causas (pequenos ramos) */}
                {category.causes.map((cause, causeIndex) => {
                  const causeY = y3 + (causeIndex - (category.causes.length - 1) / 2) * 40;
                  const causeX = x3 - 80;

                  return (
                    <g key={causeIndex}>
                      <line
                        x1={x3}
                        y1={y3}
                        x2={causeX}
                        y2={causeY}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-slate-300"
                      />
                      <circle
                        cx={causeX}
                        cy={causeY}
                        r="3"
                        fill="currentColor"
                        className="text-brand-500"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
          Diagrama de Ishikawa (Espinha de Peixe)
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Analise as causas de um problema organizando-as em categorias: Método, Máquina, Material, Mão-de-obra, Meio Ambiente e Medição.
        </p>
      </div>

      <div className="space-y-6">
        {/* Problema */}
        <div>
          <Textarea
            label="Problema Identificado"
            placeholder="Descreva o problema ou não conformidade"
            value={data.problem}
            onChange={(e) => handleProblemChange(e.target.value)}
            rows={2}
            readOnly={readOnly}
            helperText="Este será exibido na 'cabeça' do peixe no diagrama"
          />
        </div>

        {/* Diagrama Visual */}
        <div>
          <label className="text-sm font-medium text-[var(--color-foreground)] mb-2 block">
            Visualização do Diagrama
          </label>
          {renderDiagram()}
        </div>

        {/* Categorias e Causas */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-[var(--color-foreground)] block">
            Causas por Categoria
          </label>
          {data.categories.map((category) => (
            <div key={category.id} className="border border-[var(--color-border)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-[var(--color-foreground)]">{category.name}</h4>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addCause(category.id)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Adicionar Causa
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {category.causes.map((cause, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Textarea
                      placeholder={`Causa ${index + 1} em ${category.name}`}
                      value={cause}
                      onChange={(e) => updateCause(category.id, index, e.target.value)}
                      rows={1}
                      readOnly={readOnly}
                      className="flex-1"
                    />
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCause(category.id, index)}
                        icon={<X className="w-4 h-4" />}
                      />
                    )}
                  </div>
                ))}
                {category.causes.length === 0 && (
                  <p className="text-sm text-slate-500 italic">
                    Nenhuma causa adicionada nesta categoria
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Causa Raiz */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <Textarea
            label="Causa Raiz Identificada"
            placeholder="Síntese da causa raiz identificada através da análise"
            value={data.rootCause}
            onChange={(e) => handleRootCauseChange(e.target.value)}
            rows={3}
            readOnly={readOnly}
            helperText="Resumo das principais causas identificadas e a causa raiz"
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







