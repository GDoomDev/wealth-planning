
import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { User, CheckCircle2, Clock, ArrowRight, FilterX, RotateCcw } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onReimburse: (transaction: Transaction) => void;
  onUndoReimburse: (transaction: Transaction) => void;
}

const ReimbursementsTab: React.FC<Props> = ({ transactions, onReimburse, onUndoReimburse }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const reimbursables = transactions.filter(t => t.isReimbursable);
  
  const pending = reimbursables.filter(t => !t.isReimbursed);
  const completed = reimbursables.filter(t => t.isReimbursed);
  
  const pendingTotal = pending.reduce((sum, t) => sum + t.amount, 0);

  const displayedTransactions = filter === 'all' 
    ? reimbursables 
    : filter === 'pending' 
        ? pending 
        : completed;

  const handleFilterClick = (type: 'pending' | 'completed') => {
      if (filter === type) {
          setFilter('all');
      } else {
          setFilter(type);
      }
  };

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
                onClick={() => handleFilterClick('pending')}
                className={`text-left p-6 rounded-2xl border transition-all duration-200 ${
                    filter === 'pending' 
                        ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-200 shadow-md transform scale-[1.02]' 
                        : 'bg-orange-50 border-orange-100 hover:bg-orange-100'
                }`}
            >
                <p className="text-orange-800 font-medium mb-1 flex items-center gap-2">
                    <Clock size={16}/> A Receber
                </p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(pendingTotal)}</p>
                <p className="text-sm text-orange-400 mt-2">{pending.length} transações pendentes</p>
            </button>

            <button 
                onClick={() => handleFilterClick('completed')}
                className={`text-left p-6 rounded-2xl border transition-all duration-200 ${
                    filter === 'completed' 
                        ? 'bg-emerald-100 border-emerald-300 ring-2 ring-emerald-200 shadow-md transform scale-[1.02]' 
                        : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
                }`}
            >
                <p className="text-emerald-800 font-medium mb-1 flex items-center gap-2">
                    <CheckCircle2 size={16}/> Já Reembolsado
                </p>
                <p className="text-3xl font-bold text-emerald-600">
                    {formatCurrency(completed.reduce((sum, t) => sum + t.amount, 0))}
                </p>
                <p className="text-sm text-emerald-400 mt-2">{completed.length} transações concluídas</p>
            </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">
                    {filter === 'all' && 'Todos os Reembolsos'}
                    {filter === 'pending' && 'Pendentes de Recebimento'}
                    {filter === 'completed' && 'Reembolsos Recebidos'}
                </h3>
                {filter !== 'all' && (
                    <button 
                        onClick={() => setFilter('all')}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg"
                    >
                        <FilterX size={12}/> Limpar Filtro
                    </button>
                )}
            </div>
            
            {displayedTransactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    {filter === 'all' ? 'Nenhuma transação marcada como reembolsável.' : 'Nenhuma transação encontrada para este filtro.'}
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {displayedTransactions.sort((a,b) => b.date.localeCompare(a.date)).map(t => (
                        <div key={t.id} className="p-4 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4 flex-1 w-full">
                                <div className={`p-3 rounded-full ${t.isReimbursed ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800">{t.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                        <span className="font-semibold text-indigo-600">
                                            {t.debtorName || 'Devedor não informado'}
                                        </span>
                                        <span>•</span>
                                        <span>{t.date.split('-').reverse().join('/')}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between w-full md:w-auto mt-4 md:mt-0 gap-4">
                                <span className="font-bold text-slate-700 min-w-[100px] text-right">{formatCurrency(t.amount)}</span>
                                
                                {t.isReimbursed ? (
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium px-3 py-1 bg-emerald-50 rounded-full">
                                            <CheckCircle2 size={14} /> Recebido
                                        </span>
                                        <button 
                                            onClick={() => onUndoReimburse(t)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-full hover:bg-red-50"
                                            title="Desfazer Reembolso"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => onReimburse(t)}
                                        className="flex items-center gap-1 text-white text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                                    >
                                        Marcar como Pago <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default ReimbursementsTab;
