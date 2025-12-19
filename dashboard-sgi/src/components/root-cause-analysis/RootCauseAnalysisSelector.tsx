import { useState, useEffect } from 'react';
import { FiveWhysForm, type FiveWhysData } from './FiveWhysForm';
import { IshikawaDiagram, type IshikawaData } from './IshikawaDiagram';
import { FTADiagram, type FTAData } from './FTADiagram';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';

export type AnalysisType = 'FIVE_WHYS' | 'ISHIKAWA' | 'FTA' | null;

interface RootCauseAnalysisSelectorProps {
  actionItemId: string;
  initialType?: AnalysisType;
  initialData?: any;
  onChange?: (type: AnalysisType, data: any) => void;
  readOnly?: boolean;
}

export const RootCauseAnalysisSelector = ({
  actionItemId,
  initialType,
  initialData,
  onChange,
  readOnly = false,
}: RootCauseAnalysisSelectorProps) => {
  const [analysisType, setAnalysisType] = useState<AnalysisType>(initialType || null);
  const [fiveWhysData, setFiveWhysData] = useState<FiveWhysData | null>(null);
  const [ishikawaData, setIshikawaData] = useState<IshikawaData | null>(null);
  const [ftaData, setFtaData] = useState<FTAData | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialType === 'FIVE_WHYS') {
        setFiveWhysData(initialData);
      } else if (initialType === 'ISHIKAWA') {
        setIshikawaData(initialData);
      } else if (initialType === 'FTA') {
        setFtaData(initialData);
      }
    }
  }, [initialData, initialType]);

  const handleTypeChange = (newType: AnalysisType) => {
    setAnalysisType(newType);
    // Limpar dados ao mudar de tipo
    setFiveWhysData(null);
    setIshikawaData(null);
    setFtaData(null);
    onChange?.(newType, null);
  };

  const handleFiveWhysChange = (data: FiveWhysData) => {
    setFiveWhysData(data);
    onChange?.(analysisType, data);
  };

  const handleIshikawaChange = (data: IshikawaData) => {
    setIshikawaData(data);
    onChange?.(analysisType, data);
  };

  const handleFTAChange = (data: FTAData) => {
    setFtaData(data);
    onChange?.(analysisType, data);
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Card className="p-4">
          <Select
            label="Tipo de Análise de Causa Raiz"
            value={analysisType || ''}
            onChange={(e) => handleTypeChange(e.target.value as AnalysisType || null)}
            options={[
              { value: '', label: 'Selecione um tipo de análise...' },
              { value: 'FIVE_WHYS', label: '5 Porquês' },
              { value: 'ISHIKAWA', label: 'Diagrama de Ishikawa (Espinha de Peixe)' },
              { value: 'FTA', label: 'Fault Tree Analysis (FTA)' },
            ]}
            helperText="Escolha o método de análise de causa raiz que deseja usar"
          />
        </Card>
      )}

      {analysisType === 'FIVE_WHYS' && (
        <FiveWhysForm
          initialData={fiveWhysData || undefined}
          onChange={handleFiveWhysChange}
          readOnly={readOnly}
        />
      )}

      {analysisType === 'ISHIKAWA' && (
        <IshikawaDiagram
          initialData={ishikawaData || undefined}
          onChange={handleIshikawaChange}
          readOnly={readOnly}
        />
      )}

      {analysisType === 'FTA' && (
        <FTADiagram
          initialData={ftaData || undefined}
          onChange={handleFTAChange}
          readOnly={readOnly}
        />
      )}

      {!analysisType && !readOnly && (
        <Card className="p-6 text-center text-slate-500">
          Selecione um tipo de análise de causa raiz acima para começar.
        </Card>
      )}
    </div>
  );
};







