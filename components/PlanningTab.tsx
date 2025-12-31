
import React, { useMemo, useState, useEffect } from 'react';
import { PlanningProfile, Budget, Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { Calculator, TrendingUp, DollarSign, PiggyBank, Plus, X, Calendar, Table2, Save } from 'lucide-react';
import CurrencyInput from './CurrencyInput';

interface Props {
  profiles: PlanningProfile[];
  transactions: Transaction[];
  budget: Budget;
  onSaveProfile: (profile: PlanningProfile) => void;
  onDeleteProfile: (id: string) => void;
  defaultBudget: Budget;
  draft: PlanningProfile;
  onUpdateDraft: (p: PlanningProfile) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const PlanningTab: React.FC<Props> = ({ profiles, transactions, budget, onSaveProfile, onDeleteProfile, defaultBudget, draft, onUpdateDraft }) => {
  const [viewMode, setViewMode] = useState<'edit' | 'table'>('edit');
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Sincroniza o rascunho apenas se o mês mudar para um que já tenha perfil salvo
  useEffect(() => {
    const existing = profiles.find(p => p.month === draft.month);
    if (existing && existing.id !== draft.id) {
        onUpdateDraft({ ...existing });
    }
  }, [draft.month, profiles]);

  const handleEditProfile = (profile: PlanningProfile) => {
      onUpdateDraft({ ...profile });
      setViewMode('edit');
  };

  const handleAddToPlan = () => {
      onSaveProfile(draft);
      alert('Planejamento salvo com sucesso!');
  };

  const handleIncomeChange = (val: number) => {
    onUpdateDraft({ ...draft, expectedIncome: val });
  };

  const handleExpenseChange = (category: string, val: number) => {
    onUpdateDraft({
      ...draft,
      plannedExpenses: {
        ...draft.plannedExpenses,
        [category]: val
      }
    });
  };

  const handleMonthChange = (newMonth: string) => {
      onUpdateDraft({
          ...draft,
          month: newMonth,
          // Ao mudar o mês, se não houver perfil salvo para ele, resetamos o rascunho mantendo o mês
          ...(profiles.find(p => p.month === newMonth) || {
              id: '',
              expectedIncome: 0,
              plannedExpenses: { ...defaultBudget }
          })
      });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;
    if (draft.plannedExpenses.hasOwnProperty(trimmedName)) return;

    onUpdateDraft({
        ...draft,
        plannedExpenses: {
            ...draft.plannedExpenses,
            [trimmedName]: 0
        }
    });
    setNewCategoryName('');
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
      const updatedExpenses = { ...draft.plannedExpenses };
      delete updatedExpenses[categoryToRemove];
      onUpdateDraft({ ...draft, plannedExpenses: updatedExpenses });
  };

  const stats = useMemo(() => {
    const totalPlannedExpenses = (Object.values(draft.plannedExpenses) as number[]).reduce((a, b) => a + b, 0);
    const projectedBalance = draft.expectedIncome - totalPlannedExpenses;
    const savingsRate = draft.expectedIncome > 0 ? (projectedBalance / draft.expectedIncome) * 100 : 0;
    
    const chartData = Object.entries(draft.plannedExpenses)
      .map(([name, value]) => ({ name, value: value as number }))
      .filter(item => item.value > 0);

    if (projectedBalance > 0) {
        chartData.push({ name: 'Saldo Livre (Poupança)', value: projectedBalance });
    }

    return { totalPlannedExpenses, projectedBalance, savingsRate, chartData };
  }, [draft]);

  const sortedProfiles = useMemo(() => {
      return [...profiles].sort((a, b) => a.month.localeCompare(b.month));
  }, [profiles]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('edit')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'edit' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Calculator size={16} /> Editor</button>
            <button onClick={() => setViewMode('table')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Table2 size={16} /> Evolução (Tabela)</button>
        </div>
      </div>

      {viewMode === 'table' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <div className="p-6 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">Histórico de Planejamentos</h3>
                  <p className="text-sm text-slate-500">Compare sua projeção mês a mês.</p>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                          <tr>
                              <th className="px-6 py-3">Mês</th>
                              <th className="px-6 py-3">Renda Esperada</th>
                              <th className="px-6 py-3">Gastos Planejados</th>
                              <th className="px-6 py-3">Saldo Previsto</th>
                              <th className="px-6 py-3 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody>
                          {sortedProfiles.map(p => {
                              const totalExp = (Object.values(p.plannedExpenses) as number[]).reduce((a,b)=>a+b,0);
                              const bal = p.expectedIncome - totalExp;
                              return (
                                  <tr key={p.id} className="bg-white border-b border-slate-50 hover:bg-slate-50">
                                      <td className="px-6 py-4 font-medium text-slate-900">{p.month}</td>
                                      <td className="px-6 py-4 text-emerald-600">{formatCurrency(p.expectedIncome)}</td>
                                      <td className="px-6 py-4 text-red-600">{formatCurrency(totalExp)}</td>
                                      <td className={`px-6 py-4 font-bold ${bal >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>{formatCurrency(bal)}</td>
                                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                                          <button onClick={() => handleEditProfile(p)} className="text-indigo-600 hover:underline">Editar</button>
                                          <button onClick={() => onDeleteProfile(p.id)} className="text-red-500 hover:underline">Excluir</button>
                                      </td>
                                  </tr>
                              )
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {viewMode === 'edit' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                             <h2 className="text-xl font-bold text-slate-800">{draft.id ? 'Planejamento Salvo' : 'Novo Planejamento'}</h2>
                             {draft.id && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase font-bold">Sincronizado</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-indigo-600" />
                            <input type="month" value={draft.month} onChange={(e) => handleMonthChange(e.target.value)} className="p-2 pl-3 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 outline-none" />
                        </div>
                    </div>
                    
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col md:w-1/3">
                        <label className="text-emerald-800 text-xs font-bold uppercase block mb-1">Renda Esperada</label>
                        <CurrencyInput value={draft.expectedIncome} onChange={handleIncomeChange} className="bg-transparent text-2xl font-bold text-emerald-700 outline-none w-full border-b border-emerald-200" />
                    </div>

                    <button onClick={handleAddToPlan} className="h-12 px-6 bg-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95"><Save size={18} /> Salvar Plano</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2"><DollarSign size={18} className="text-slate-400"/> Projeção de Gastos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(draft.plannedExpenses).map(([category, amount]) => (
                            <div key={category} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                                <label className="flex-1 font-medium text-slate-700 truncate pr-2">{category}</label>
                                <div className="flex items-center gap-2">
                                    <CurrencyInput value={amount as number} onChange={(val) => handleExpenseChange(category, val)} className="w-36 p-1.5 bg-white border border-slate-200 rounded text-right font-bold" />
                                    <button onClick={() => handleRemoveCategory(category)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleAddCategory} className="border-t border-slate-100 pt-4 mt-4 flex gap-2">
                        <input type="text" placeholder="Nova categoria" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"><Plus size={16} /></button>
                    </form>
                </div>
                <div className="space-y-6">
                    <div className={`p-6 rounded-2xl shadow-sm border transition-all ${stats.projectedBalance >= 0 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-red-500 text-white border-red-600'}`}>
                        <div className="flex items-center justify-between mb-4"><p className="text-indigo-100 font-medium">Saldo Projetado</p><span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">{stats.savingsRate.toFixed(1)}% Livre</span></div>
                        <p className="text-3xl font-bold">{formatCurrency(stats.projectedBalance)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.chartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                    {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.name === 'Saldo Livre (Poupança)' ? '#10b981' : COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend wrapperStyle={{fontSize: '11px'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PlanningTab;
