
import React, { useState, useMemo } from 'react';
import { InvestmentGoal, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Target, TrendingUp, Plus, X, Wallet, Search, CheckSquare, ArrowDownCircle, Coins, ArrowRightLeft } from 'lucide-react';
import CurrencyInput from './CurrencyInput';

interface Props {
    goals: InvestmentGoal[];
    existingTransactions: Transaction[];
    onAddGoal: (goal: InvestmentGoal) => void;
    onUpdateGoal: (goal: InvestmentGoal) => void;
    onDeleteGoal: (id: string) => void;
    onAddContribution: (goalId: string, amount: number) => void;
    onWithdraw: (goalId: string, amount: number) => void;
    onAddEarning: (goalId: string, amount: number) => void;
}

const InvestmentsTab: React.FC<Props> = ({ goals, existingTransactions, onAddGoal, onUpdateGoal, onDeleteGoal, onAddContribution, onWithdraw, onAddEarning }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newGoal, setNewGoal] = useState<Partial<InvestmentGoal>>({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        category: 'Imóvel'
    });
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [contributionAmount, setContributionAmount] = useState<Record<string, number>>({});
    const [withdrawAmount, setWithdrawAmount] = useState<Record<string, number>>({});
    const [earningAmount, setEarningAmount] = useState<Record<string, number>>({});
    const [activeAction, setActiveAction] = useState<{ goalId: string, type: 'withdraw' | 'earning' } | null>(null);

    const availableInvestmentTxs = useMemo(() => {
        const linkedIds = new Set(goals.flatMap(g => g.linkedTransactionIds || []));
        return existingTransactions.filter(t => t.type === 'investment' && !linkedIds.has(t.id));
    }, [existingTransactions, goals]);

    const handleCreateGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoal.name || !newGoal.targetAmount) return;

        const manualAmount = Number(newGoal.currentAmount) || 0;
        const linkedAmount = Array.from(selectedTxIds).reduce<number>((sum, id) => {
            const tx = availableInvestmentTxs.find(t => t.id === id);
            return sum + (tx ? tx.amount : 0);
        }, 0);

        onAddGoal({
            id: crypto.randomUUID(),
            name: newGoal.name,
            targetAmount: Number(newGoal.targetAmount),
            currentAmount: manualAmount + linkedAmount,
            category: newGoal.category || 'Outros',
            deadline: newGoal.deadline,
            color: '#6366f1',
            linkedTransactionIds: Array.from(selectedTxIds)
        });
        setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, category: 'Imóvel' });
        setSelectedTxIds(new Set());
        setShowAddForm(false);
    };

    const toggleTxSelection = (id: string) => {
        const next = new Set(selectedTxIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedTxIds(next);
    };

    const handleContribute = (goalId: string) => {
        const amount = contributionAmount[goalId] || 0;
        if (amount > 0) {
            onAddContribution(goalId, amount);
            setContributionAmount(prev => ({ ...prev, [goalId]: 0 }));
        }
    };

    const handleWithdrawAction = (goalId: string) => {
        const amount = withdrawAmount[goalId] || 0;
        if (amount > 0) {
            onWithdraw(goalId, amount);
            setWithdrawAmount(prev => ({ ...prev, [goalId]: 0 }));
            setActiveAction(null);
        }
    };

    const handleEarningAction = (goalId: string) => {
        const amount = earningAmount[goalId] || 0;
        if (amount > 0) {
            onAddEarning(goalId, amount);
            setEarningAmount(prev => ({ ...prev, [goalId]: 0 }));
            setActiveAction(null);
        }
    };

    const summary = useMemo(() => {
        const totalInvested = goals.reduce((acc, g) => acc + g.currentAmount, 0);
        const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
        const progress = totalTarget > 0 ? (totalInvested / totalTarget) * 100 : 0;
        return { totalInvested, totalTarget, progress };
    }, [goals]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-2 opacity-90"><Wallet size={20} /><span className="font-medium">Patrimônio Investido</span></div>
                    <p className="text-3xl font-bold">{formatCurrency(summary.totalInvested)}</p>
                    <div className="mt-4 h-2 bg-indigo-800/50 rounded-full overflow-hidden"><div className="h-full bg-white/30" style={{ width: `${summary.progress}%` }}></div></div>
                    <p className="text-xs mt-2 opacity-70">{summary.progress.toFixed(1)}% da meta global</p>
                </div>
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Target className="text-indigo-600" />Metas de Investimento</h2><p className="text-slate-500 text-sm mt-1">Acompanhe a evolução de seus objetivos financeiros.</p></div>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"><Plus size={18} /> Nova Meta</button>
                </div>
            </div>

            {showAddForm && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-700">Cadastrar Nova Meta</h3><button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button></div>
                    <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <input type="text" placeholder="Nome (ex: Lote Condomínio X)" className="p-2 border border-slate-300 rounded-lg" value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} required />
                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 bg-white"><span className="text-slate-500 text-sm">Alvo</span><CurrencyInput placeholder="Valor Total" className="p-2 w-full outline-none" value={newGoal.targetAmount || 0} onChange={val => setNewGoal({ ...newGoal, targetAmount: val })} /></div>
                        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 bg-white"><span className="text-slate-500 text-sm">Atual</span><CurrencyInput placeholder="Valor já pago (manual)" className="p-2 w-full outline-none" value={newGoal.currentAmount || 0} onChange={val => setNewGoal({ ...newGoal, currentAmount: val })} /></div>
                        <select className="p-2 border border-slate-300 rounded-lg" value={newGoal.category} onChange={e => setNewGoal({ ...newGoal, category: e.target.value })}><option value="Imóvel">Imóvel / Lote</option><option value="Veículo">Veículo</option><option value="Reserva">Reserva de Emergência</option><option value="Aposentadoria">Aposentadoria</option><option value="Outros">Outros</option></select>
                        <div className="md:col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowLinkModal(!showLinkModal)}><span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Search size={16} />Vincular transações existentes? ({selectedTxIds.size} selecionadas)</span><span className="text-indigo-600 text-sm">{showLinkModal ? 'Ocultar' : 'Mostrar'}</span></div>
                            {showLinkModal && availableInvestmentTxs.length > 0 && (
                                <div className="mt-3 max-h-40 overflow-y-auto space-y-2">
                                    {availableInvestmentTxs.map(tx => (
                                        <div key={tx.id} onClick={() => toggleTxSelection(tx.id)} className={`p-2 rounded border flex justify-between items-center cursor-pointer text-sm ${selectedTxIds.has(tx.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                                            <div className="flex items-center gap-2">{selectedTxIds.has(tx.id) ? <CheckSquare size={16} className="text-indigo-600" /> : <div className="w-4 h-4 border border-slate-300 rounded" />}<span className="text-slate-700">{tx.description}</span></div>
                                            <span className="font-semibold">{formatCurrency(tx.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button type="submit" className="md:col-span-4 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700">Criar Meta</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => {
                    const percent = (goal.currentAmount / goal.targetAmount) * 100;
                    const remaining = goal.targetAmount - goal.currentAmount;

                    return (
                        <div key={goal.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col group/card">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div><span className="text-xs uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{goal.category}</span><h3 className="font-bold text-slate-800 mt-2 text-lg">{goal.name}</h3></div>
                                    <button onClick={() => onDeleteGoal(goal.id)} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Saldo Atual: <strong className="text-slate-800">{formatCurrency(goal.currentAmount)}</strong></span><span className="text-slate-500">Meta: {formatCurrency(goal.targetAmount)}</span></div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(percent, 100)}%` }}></div></div>
                                    <div className="text-right mt-1"><span className="text-xs text-slate-400">Restante: {formatCurrency(remaining)} ({(100 - percent).toFixed(1)}%)</span></div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-3">
                                {activeAction?.goalId === goal.id ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex justify-between mb-2">
                                            <label className={`text-[10px] font-bold uppercase ${activeAction.type === 'earning' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {activeAction.type === 'earning' ? 'Registrar Rendimento' : 'Retirar do Investimento'}
                                            </label>
                                            <button onClick={() => setActiveAction(null)} className="text-[10px] text-slate-400 hover:text-slate-600">Cancelar</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <CurrencyInput
                                                autoFocus
                                                className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:border-indigo-500"
                                                value={activeAction.type === 'earning' ? earningAmount[goal.id] || 0 : withdrawAmount[goal.id] || 0}
                                                onChange={(val) => activeAction.type === 'earning' ? setEarningAmount(prev => ({ ...prev, [goal.id]: val })) : setWithdrawAmount(prev => ({ ...prev, [goal.id]: val }))}
                                            />
                                            <button
                                                onClick={() => activeAction.type === 'earning' ? handleEarningAction(goal.id) : handleWithdrawAction(goal.id)}
                                                className={`px-4 rounded text-white transition-colors ${activeAction.type === 'earning' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                                            >
                                                OK
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1 italic">
                                            {activeAction.type === 'earning' ? '* Rendimento não gera entrada no extrato.' : '* Retirada gera uma entrada de Receita no extrato principal.'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setActiveAction({ goalId: goal.id, type: 'earning' })} className="flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-all"><Coins size={14} /> Rendimento</button>
                                            <button onClick={() => setActiveAction({ goalId: goal.id, type: 'withdraw' })} className="flex items-center justify-center gap-1.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all"><ArrowRightLeft size={14} /> Retirada</button>
                                        </div>
                                        <div className="flex items-center gap-2 border-t border-slate-200 pt-3">
                                            <CurrencyInput placeholder="Aporte mensal" className="flex-1 p-1.5 border border-slate-200 rounded text-xs outline-none" value={contributionAmount[goal.id] || 0} onChange={(val) => setContributionAmount(prev => ({ ...prev, [goal.id]: val }))} />
                                            <button onClick={() => handleContribute(goal.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded transition-colors"><Plus size={16} /></button>
                                        </div>
                                        <p className="text-[9px] text-slate-400 leading-tight">* Aporte mensal gera uma despesa no extrato principal.</p>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default InvestmentsTab;
