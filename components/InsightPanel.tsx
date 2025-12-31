import React, { useState } from 'react';
import { AiInsight, Transaction, Budget } from '../types';
import { getFinancialInsights } from '../services/geminiService';
import { BrainCircuit, TrendingUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  budget: Budget;
}

const InsightPanel: React.FC<Props> = ({ transactions, budget }) => {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateInsights = async () => {
    setLoading(true);
    try {
      const result = await getFinancialInsights(transactions, budget);
      setInsight(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg mb-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <BrainCircuit size={150} />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-indigo-400" />
            Análise Inteligente
          </h2>
          <button 
            onClick={handleGenerateInsights}
            disabled={loading || transactions.length === 0}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <TrendingUp size={16} />}
            {insight ? 'Atualizar Análise' : 'Gerar Previsão'}
          </button>
        </div>

        {!insight && !loading && (
          <p className="text-indigo-200">
            Clique em "Gerar Previsão" para que a IA analise seus gastos, compare com o orçamento e preveja seu próximo mês.
          </p>
        )}

        {loading && (
            <div className="animate-pulse flex flex-col gap-4">
                <div className="h-4 bg-indigo-700 rounded w-3/4"></div>
                <div className="h-4 bg-indigo-700 rounded w-1/2"></div>
                <div className="h-4 bg-indigo-700 rounded w-5/6"></div>
            </div>
        )}

        {insight && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <h3 className="text-indigo-300 text-sm uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                <TrendingUp size={14} /> Previsão
              </h3>
              <p className="text-sm md:text-base leading-relaxed">{insight.prediction}</p>
            </div>

            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <h3 className="text-indigo-300 text-sm uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle2 size={14} /> Orçamento
              </h3>
              <p className="text-sm md:text-base leading-relaxed">{insight.remainingBudgetAnalysis}</p>
            </div>

            <div className="md:col-span-2 bg-yellow-500/10 p-4 rounded-xl backdrop-blur-sm border border-yellow-500/20">
              <h3 className="text-yellow-400 text-sm uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle size={14} /> Anomalias Detectadas
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {insight.anomalies.map((anom, idx) => (
                    <li key={idx} className="text-sm md:text-base text-yellow-100/90">{anom}</li>
                ))}
                {insight.anomalies.length === 0 && <li className="text-sm text-yellow-100/70">Nenhuma anomalia detectada.</li>}
              </ul>
            </div>
             <div className="md:col-span-2 bg-indigo-500/20 p-4 rounded-xl backdrop-blur-sm border border-indigo-500/30">
               <h3 className="text-indigo-300 text-sm uppercase font-bold tracking-wider mb-2">Conselho Financeiro</h3>
               <p className="italic text-indigo-100 text-lg">"{insight.advice}"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightPanel;
