
import React, { useState, useCallback, useMemo } from 'react';
import { Transaction, PaymentMethod, Subscription } from '../types';
import { formatCurrency } from '../utils/formatters';
import CurrencyInput from './CurrencyInput';
import { ArrowDownRight, ArrowUpRight, Trash2, Edit2, User, Calendar, Tag, CreditCard, Save, X, Info, Sparkles } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (transaction: Transaction, updateSiblings?: boolean) => void;
  categories: string[];
  paymentMethods: PaymentMethod[];
  selectedMonth: string;
  subscriptions: Subscription[];
}

const TransactionList: React.FC<Props> = ({ transactions, onDelete, onUpdate, categories, paymentMethods, selectedMonth, subscriptions }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Transaction | null>(null);
  const [updateSiblings, setUpdateSiblings] = useState(false);

  const getFinancialMonth = useCallback((dateStr: string) => {
    return dateStr.slice(0, 7);
  }, []);

  // Filtra as transações reais pelo mês da data informada
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => getFinancialMonth(t.date) === selectedMonth);
  }, [transactions, getFinancialMonth, selectedMonth]);

  // Projeta assinaturas se o mês for atual ou futuro
  const virtualSubscriptions = useMemo(() => {
    const nowMonth = new Date().toISOString().slice(0, 7);
    if (selectedMonth < nowMonth) return [];

    return subscriptions.filter(sub => {
      const alreadyLaunched = filteredTransactions.some(t => t.description.includes(`Assinatura: ${sub.name}`));
      return !alreadyLaunched;
    });
  }, [subscriptions, selectedMonth, filteredTransactions]);

  const sortedTransactions = [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date));

  const saveEditing = () => {
    if (editForm) {
      onUpdate(editForm, updateSiblings);
      setEditingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Detalhamento do Período</h3>
          <p className="text-xs text-slate-400 mt-1">Exibindo movimentações de {selectedMonth.split('-').reverse().join('/')}</p>
        </div>
      </div>

      <div className="max-h-[800px] overflow-y-auto">
        {sortedTransactions.length === 0 && virtualSubscriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Nenhuma transação encontrada para este período.</div>
        ) : (
          <>
            {/* Exibe assinaturas projetadas */}
            {virtualSubscriptions.map(sub => (
              <div key={sub.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-indigo-50/20 border-b border-indigo-100/30 gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                    <Sparkles size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-700 truncate">{sub.name} <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded ml-2 uppercase font-extrabold tracking-tighter">Projeção Fixa</span></p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10} /> Dia {sub.startDate.split('-')[2]}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-indigo-500 font-bold uppercase">{sub.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-extrabold text-lg text-slate-400 italic">
                    - {formatCurrency(sub.amount)}
                  </span>
                </div>
              </div>
            ))}

            {/* Transações Reais */}
            {sortedTransactions.map((t) => {
              const isEditing = editingId === t.id;

              if (isEditing && editForm) {
                return (
                  <div key={t.id} className="p-6 bg-indigo-50/30 border-b border-indigo-100 space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Edição Completa</span>
                      {t.groupId && (
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 cursor-pointer uppercase">
                          <input type="checkbox" checked={updateSiblings} onChange={e => setUpdateSiblings(e.target.checked)} className="rounded text-indigo-600" />
                          Atualizar parcelas?
                        </label>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descrição</label>
                        <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="p-2.5 border border-slate-200 bg-white rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor</label>
                        <CurrencyInput value={editForm.amount} onChange={(val) => setEditForm({ ...editForm, amount: val })} className="p-2.5 border border-slate-200 bg-white rounded-lg text-sm w-full font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tipo</label>
                        <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })} className="p-2.5 border border-slate-200 bg-white rounded-lg text-sm w-full">
                          <option value="expense">Despesa</option>
                          <option value="income">Receita</option>
                          <option value="investment">Investimento</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoria</label>
                        <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="p-2.5 border border-slate-200 bg-white rounded-lg text-sm w-full">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Método</label>
                        <select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })} className="p-2.5 border border-slate-200 bg-white rounded-lg text-sm w-full">
                          {paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data</label>
                        <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="p-2.5 border border-slate-200 bg-white rounded-lg text-sm w-full" />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 p-4 bg-white rounded-lg border border-slate-100">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={editForm.isReimbursable} onChange={e => setEditForm({ ...editForm, isReimbursable: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        É reembolsável?
                      </label>
                      {editForm.isReimbursable && (
                        <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left-2">
                          <User size={14} className="text-slate-400" />
                          <input type="text" placeholder="Nome de quem deve pagar" value={editForm.debtorName || ''} onChange={e => setEditForm({ ...editForm, debtorName: e.target.value })} className="flex-1 p-1 text-sm border-b border-slate-200 outline-none focus:border-indigo-500" />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button onClick={() => setEditingId(null)} className="px-6 py-2.5 text-slate-500 text-sm font-bold hover:bg-slate-100 rounded-xl transition-colors">Descartar</button>
                      <button onClick={saveEditing} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2">
                        <Save size={16} /> Salvar Alterações
                      </button>
                    </div>
                  </div>
                );
              }

              // Determinar estilos baseados no tipo para os ícones e valores
              const typeStyles = {
                income: 'bg-emerald-50 text-emerald-600',
                expense: 'bg-red-50 text-red-600',
                investment: 'bg-indigo-50 text-indigo-600'
              };

              const amountStyles = {
                income: 'text-emerald-600',
                expense: 'text-red-600',
                investment: 'text-indigo-600'
              };

              return (
                <div key={t.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 group gap-4 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-xl ${typeStyles[t.type] || 'bg-slate-50 text-slate-400'}`}>
                      {t.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{t.description}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={10} /> {t.date.split('-').reverse().join('/')}</span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 uppercase"><Tag size={10} /> {t.category}</span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1"><CreditCard size={10} /> {t.paymentMethod}</span>
                        {t.isReimbursable && (
                          <>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className={`text-[10px] font-bold px-1.5 rounded ${t.isReimbursed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                              {t.isReimbursed ? 'Reembolsado' : `Reembolsar: ${t.debtorName}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-extrabold text-lg ${amountStyles[t.type] || 'text-slate-900'}`}>
                      {t.type === 'expense' ? '-' : ''} {formatCurrency(t.amount)}
                    </span>
                    <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingId(t.id); setEditForm(t); setUpdateSiblings(false); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Editar"><Edit2 size={18} /></button>
                      <button onClick={() => onDelete(t.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
