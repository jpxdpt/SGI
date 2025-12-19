import { useState, useEffect, type ReactNode } from 'react';
import { Textarea, Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Plus, X, Minus, HelpCircle } from 'lucide-react';

export interface FTANode {
  id: string;
  label: string;
  description?: string;
  type: 'event' | 'gate';
  gateType?: 'AND' | 'OR';
  children: string[]; // IDs dos filhos
}

export interface FTAData {
  topEvent: string;
  topEventDescription?: string;
  nodes: Record<string, FTANode>;
  rootCause: string;
}

interface FTADiagramProps {
  initialData?: FTAData | null;
  onChange?: (data: FTAData) => void;
  readOnly?: boolean;
}

export const FTADiagram = ({ initialData, onChange, readOnly = false }: FTADiagramProps) => {
  const [data, setData] = useState<FTAData>({
    topEvent: '',
    topEventDescription: '',
    nodes: {},
    rootCause: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  const handleChange = (newData: FTAData) => {
    setData(newData);
    onChange?.(newData);
  };

  const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addNode = (parentId?: string) => {
    const newNodeId = generateId();
    const newNode: FTANode = {
      id: newNodeId,
      label: '',
      description: '',
      type: 'event',
      children: [],
    };

    const newNodes = { ...data.nodes, [newNodeId]: newNode };

    if (parentId && data.nodes[parentId]) {
      const parentNode = { ...data.nodes[parentId] };
      parentNode.children = [...parentNode.children, newNodeId];
      parentNode.type = parentNode.children.length > 1 ? 'gate' : 'event';
      if (parentNode.type === 'gate' && !parentNode.gateType) {
        parentNode.gateType = 'OR';
      }
      newNodes[parentId] = parentNode;
    } else {
      // Se não tem pai, é um nó raiz conectado ao top event
      // Vamos adicionar como filho direto do top event (representado como 'TOP')
      if (!data.nodes['TOP']) {
        newNodes['TOP'] = {
          id: 'TOP',
          label: data.topEvent || 'Top Event',
          type: 'event',
          children: [],
        };
      }
      if (newNodes['TOP']) {
        newNodes['TOP'] = {
          ...newNodes['TOP'],
          children: [...newNodes['TOP'].children, newNodeId],
          type: newNodes['TOP'].children.length > 1 ? 'gate' : 'event',
          gateType: newNodes['TOP'].children.length > 1 ? (newNodes['TOP'].gateType || 'OR') : undefined,
        };
      }
    }

    handleChange({ ...data, nodes: newNodes });
  };

  const updateNode = (nodeId: string, updates: Partial<FTANode>) => {
    const newNodes = { ...data.nodes };
    if (newNodes[nodeId]) {
      newNodes[nodeId] = { ...newNodes[nodeId], ...updates };
      handleChange({ ...data, nodes: newNodes });
    }
  };

  const removeNode = (nodeId: string) => {
    const nodeToRemove = data.nodes[nodeId];
    if (!nodeToRemove) return;

    // Remove o nó dos filhos dos pais
    const newNodes = { ...data.nodes };
    Object.keys(newNodes).forEach((parentId) => {
      if (newNodes[parentId].children.includes(nodeId)) {
        newNodes[parentId] = {
          ...newNodes[parentId],
          children: newNodes[parentId].children.filter((id) => id !== nodeId),
        };
        // Se o pai não tem mais filhos, pode voltar a ser evento
        if (newNodes[parentId].children.length === 0) {
          newNodes[parentId].type = 'event';
          delete newNodes[parentId].gateType;
        } else if (newNodes[parentId].children.length === 1) {
          newNodes[parentId].type = 'event';
          delete newNodes[parentId].gateType;
        }
      }
    });

    // Remove recursivamente todos os filhos
    const removeChildren = (id: string) => {
      const node = newNodes[id];
      if (node) {
        node.children.forEach((childId) => removeChildren(childId));
        delete newNodes[id];
      }
    };
    removeChildren(nodeId);

    handleChange({ ...data, nodes: newNodes });
  };

  const addChild = (parentId: string) => {
    addNode(parentId);
  };

  const getNodeDepth = (nodeId: string, depth = 0): number => {
    const node = data.nodes[nodeId];
    if (!node || node.children.length === 0) return depth;
    return Math.max(...node.children.map((childId) => getNodeDepth(childId, depth + 1)));
  };

  const renderNode = (nodeId: string, level = 0): ReactNode => {
    const node = data.nodes[nodeId];
    if (!node) return null;

    const hasChildren = node.children.length > 0;
    const isGate = node.type === 'gate';
    const isTopEvent = nodeId === 'TOP' || (!data.nodes['TOP'] && level === 0);

    return (
      <div key={nodeId} className="flex flex-col items-center">
        <div
          className={`
            relative p-3 rounded-lg border-2 min-w-[200px] mb-4
            ${isGate ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600'}
            ${isTopEvent ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500' : ''}
          `}
        >
          {isTopEvent && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-brand-500 text-white text-xs px-2 py-1 rounded">
              TOP EVENT
            </div>
          )}

          {isGate && (
            <div className="text-center mb-2">
              <div className="font-bold text-blue-600 dark:text-blue-400">
                {node.gateType || 'OR'} GATE
              </div>
            </div>
          )}

          {readOnly ? (
            <div className="text-center">
              <div className="font-medium text-sm text-[var(--color-foreground)]">{node.label || 'Sem label'}</div>
              {node.description && (
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{node.description}</div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder={isTopEvent ? 'Top Event' : isGate ? 'Nome do Gate' : 'Nome do Evento'}
                value={isTopEvent ? data.topEvent : node.label}
                onChange={(e) => {
                  if (isTopEvent) {
                    handleChange({ ...data, topEvent: e.target.value });
                  } else {
                    updateNode(nodeId, { label: e.target.value });
                  }
                }}
                className="text-sm"
              />
              <Textarea
                placeholder="Descrição (opcional)"
                value={isTopEvent ? (data.topEventDescription || '') : (node.description || '')}
                onChange={(e) => {
                  if (isTopEvent) {
                    handleChange({ ...data, topEventDescription: e.target.value });
                  } else {
                    updateNode(nodeId, { description: e.target.value });
                  }
                }}
                rows={2}
                className="text-xs"
              />
              {isGate && (
                <select
                  value={node.gateType || 'OR'}
                  onChange={(e) => updateNode(nodeId, { gateType: e.target.value as 'AND' | 'OR' })}
                  className="w-full px-2 py-1 text-xs border rounded bg-[var(--color-bg)] text-[var(--color-foreground)]"
                >
                  <option value="OR">OR (Qualquer)</option>
                  <option value="AND">AND (Todos)</option>
                </select>
              )}
              <div className="flex gap-1 justify-end">
                {!isTopEvent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNode(nodeId)}
                    icon={<X className="w-3 h-3" />}
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addChild(nodeId)}
                  icon={<Plus className="w-3 h-3" />}
                />
              </div>
            </div>
          )}
        </div>

        {hasChildren && (
          <div className="flex gap-4 items-start">
            {node.children.map((childId, index) => (
              <div key={childId} className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-slate-400"></div>
                {renderNode(childId, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const clearForm = () => {
    const emptyData: FTAData = {
      topEvent: '',
      topEventDescription: '',
      nodes: {},
      rootCause: '',
    };
    handleChange(emptyData);
  };

  const getRootNodes = (): string[] => {
    const allChildIds = new Set<string>();
    Object.values(data.nodes).forEach((node) => {
      node.children.forEach((childId) => allChildIds.add(childId));
    });
    return Object.keys(data.nodes).filter((id) => !allChildIds.has(id) && id !== 'TOP');
  };

  const rootNodes = getRootNodes();
  const topNodeId = data.nodes['TOP'] ? 'TOP' : null;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
          Fault Tree Analysis (FTA)
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Construa uma árvore de falhas hierárquica para identificar todas as causas que podem levar ao evento indesejado (top event).
        </p>
      </div>

      <div className="space-y-6">
        {/* Top Event */}
        {!topNodeId && (
          <div>
            <Textarea
              label="Top Event (Evento Indesejado)"
              placeholder="Descreva o evento indesejado que será analisado"
              value={data.topEvent}
              onChange={(e) => handleChange({ ...data, topEvent: e.target.value })}
              rows={2}
              readOnly={readOnly}
              helperText="Este é o evento principal que você quer prevenir"
            />
            <Textarea
              label="Descrição do Top Event"
              placeholder="Descrição detalhada (opcional)"
              value={data.topEventDescription || ''}
              onChange={(e) => handleChange({ ...data, topEventDescription: e.target.value })}
              rows={2}
              readOnly={readOnly}
            />
            {!readOnly && (
              <Button variant="primary" size="sm" onClick={() => addNode()} className="mt-2">
                Criar Árvore de Falhas
              </Button>
            )}
          </div>
        )}

        {/* Visualização da Árvore */}
        {topNodeId && (
          <div className="border border-[var(--color-border)] rounded-lg p-6 bg-slate-50 dark:bg-slate-900 overflow-x-auto">
            <div className="flex justify-center">
              {renderNode('TOP')}
            </div>
          </div>
        )}

        {/* Nós raiz sem pai */}
        {rootNodes.length > 0 && !topNodeId && (
          <div className="border border-[var(--color-border)] rounded-lg p-6 bg-slate-50 dark:bg-slate-900 overflow-x-auto">
            <div className="flex justify-center gap-4">
              {rootNodes.map((nodeId) => (
                <div key={nodeId}>
                  {renderNode(nodeId)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botão para adicionar nó raiz se não houver top event */}
        {!topNodeId && !readOnly && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => addNode()}>
              <Plus className="w-4 h-4" />
              Adicionar Evento Base
            </Button>
          </div>
        )}

        {/* Causa Raiz */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <Textarea
            label="Causa Raiz Identificada"
            placeholder="Síntese da causa raiz identificada através da análise"
            value={data.rootCause}
            onChange={(e) => handleChange({ ...data, rootCause: e.target.value })}
            rows={3}
            readOnly={readOnly}
            helperText="Resumo das principais causas identificadas na árvore de falhas"
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

