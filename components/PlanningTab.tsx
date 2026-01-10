import React, { useState, useMemo, useEffect } from 'react';
import { PlanningProfile, Budget, Transaction, Subscription, PaymentMethod, UserPreferences, ExtraExpense, ExtraIncome } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { getTransactionEffectiveDate } from '../utils/financeUtils';
import { Calendar, Save, DollarSign, Wallet, CreditCard, TrendingUp, AlertCircle, CheckCircle2, ShoppingBag, Plus, X, ChevronDown, ChevronUp, Edit2, Calculator, RotateCcw } from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import DonutChart from './DonutChart';

interface Props {
    profiles: PlanningProfile[];
    transactions: Transaction[];
    budget: Budget;
    onSaveProfile: (profile: PlanningProfile) => void;
    onDeleteProfile: (id: string) => void;
    defaultBudget: Budget;
    draft: PlanningProfile;
    onUpdateDraft: (p: PlanningProfile) => void;
    subscriptions: Subscription[];
    paymentMethods: PaymentMethod[];
    preferences: UserPreferences;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const PlanningTab: React.FC<Props> = ({ profiles, transactions, budget, onSaveProfile, onDeleteProfile, defaultBudget, draft, onUpdateDraft, subscriptions, paymentMethods, preferences }) => {
    // Estado local para controles de interface
    const [targetMonth, setTargetMonth] = useState<string>(
        draft.month || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7)
    );

    // Extra Items State
    const [extraExpenses, setExtraExpenses] = useState<ExtraExpense[]>([]);
    const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>([]);
    const [includeReimbursements, setIncludeReimbursements] = useState(true);

    // Form State for Extra Expenses
    const [extraForm, setExtraForm] = useState<{
        id: string | null;
        description: string;
        amount: number;
        isInstallment: boolean;
        installmentsCount: number;
        valueType: 'total' | 'installment';
        rawVal: number;
    }>({
        id: null,
        description: '',
        amount: 0,
        isInstallment: false,
        installmentsCount: 1,
        valueType: 'total',
        rawVal: 0
    });

    // Form State for Extra Incomes
    const [newIncomeDesc, setNewIncomeDesc] = useState('');
    const [newIncomeAmount, setNewIncomeAmount] = useState(0);

    // Estados de edição manual (override)
    const [manualSalary, setManualSalary] = useState<number | null>(null);
    const [manualBudget, setManualBudget] = useState<Budget | null>(null);

    // Atualiza o rascunho quando o mês alvo muda
    useEffect(() => {
        // Tenta achar um perfil salvo, se não, usa o rascunho limpo
        const savedProfile = profiles.find(p => p.month === targetMonth);
        if (savedProfile) {
            onUpdateDraft(savedProfile);
            setManualSalary(savedProfile.expectedIncome);
            setManualBudget(savedProfile.plannedExpenses);
            setExtraExpenses(savedProfile.extraExpenses || []);
            setExtraIncomes(savedProfile.extraIncomes || []);
        } else {
            resetLocalState();
            // Mantém apenas o targetMonth no draft novo
            onUpdateDraft({
                id: '',
                month: targetMonth,
                expectedIncome: 0,
                plannedExpenses: { ...defaultBudget },
                extraExpenses: [],
                extraIncomes: []
            });
        }
    }, [targetMonth, profiles]);

    const resetLocalState = () => {
        setManualSalary(null);
        setManualBudget(null);
        setExtraExpenses([]);
        setExtraIncomes([]);
        setExtraForm({
            id: null,
            description: '',
            amount: 0,
            isInstallment: false,
            installmentsCount: 1,
            valueType: 'total',
            rawVal: 0
        });
        setNewIncomeDesc('');
        setNewIncomeAmount(0);
    };


    // CÁLCULOS AUTOMÁTICOS
    const projections = useMemo(() => {
        const nextMonth = targetMonth;

        // 1. Salário Esperado (Último salário recebido)
        const lastSalaryTx = transactions
            .filter(t => t.type === 'income' && (t.description.toLowerCase().includes('salário') || t.description.toLowerCase().includes('salario')))
            .sort((a, b) => b.date.localeCompare(a.date))[0];
        const projectedSalary = lastSalaryTx ? lastSalaryTx.amount : 0;

        // 2. Reembolsos Pendentes (que caem neste mês)
        const pendingReimbursements = transactions.filter(t => {
            if (!t.isReimbursable || t.isReimbursed) return false;
            // O reembolso deve ser previsto para o mesmo mês que a despesa acontece (data efetiva)
            const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
            return effectiveDate.slice(0, 7) === nextMonth;
        });
        const totalPendingReimbursements = pendingReimbursements.reduce((sum, t) => sum + t.amount, 0);

        // 3. Parcelas Previstas (Credit Card installments falling in target month)
        const projectedInstallments = transactions.filter(t => {
            if (!t.groupId) return false;
            const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
            return effectiveDate.slice(0, 7) === nextMonth && t.type === 'expense';
        });
        const totalProjectedInstallments = projectedInstallments.reduce((sum, t) => sum + t.amount, 0);

        // 4. Assinaturas (Recorrentes ativas) - Lógica aprimorada
        const activeSubscriptions = subscriptions.filter(sub => {
            if (sub.activeUntil && nextMonth > sub.activeUntil.slice(0, 7)) return false;
            if (nextMonth < sub.startDate.slice(0, 7)) return false;

            const billingDay = parseInt(sub.startDate.split('-')[2]);
            const [yearStr, monthStr] = nextMonth.split('-');
            const year = parseInt(yearStr);
            const month = parseInt(monthStr); // 1-12

            // Verifica o mês atual E o mês anterior (pois cartão pode jogar para frente)
            // Candidatos: A cobrança que ocorreria no mês alvo, e a do mês anterior.
            const candidates = [0, -1].map(offset => {
                const d = new Date(year, month - 1 + offset, billingDay);
                return d.toISOString().slice(0, 10);
            });

            return candidates.some(candidateDate => {
                // Check validity (startDate constraints)
                if (candidateDate < sub.startDate) return false;
                if (sub.activeUntil && candidateDate > sub.activeUntil) return false;

                // Simulate transaction
                const dummyTx: Transaction = {
                    id: 'temp', amount: sub.amount, category: sub.category, description: sub.name,
                    date: candidateDate, paymentMethod: sub.paymentMethod, type: 'expense'
                };
                const effectiveDate = getTransactionEffectiveDate(dummyTx, paymentMethods, preferences);
                return effectiveDate.slice(0, 7) === nextMonth;
            });
        });
        const totalSubscriptions = activeSubscriptions.reduce((sum, s) => sum + s.amount, 0);

        // 5. Entradas Confirmadas (Non-salary incomes in target month)
        const confirmedIncomes = transactions.filter(t => {
            const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
            const isTargetMonth = effectiveDate.slice(0, 7) === nextMonth;
            const isIncome = t.type === 'income';
            const isNotSalary = !t.description.toLowerCase().includes('salário') && !t.description.toLowerCase().includes('salario');

            return isTargetMonth && isIncome && isNotSalary;
        });
        const totalConfirmedIncomes = confirmedIncomes.reduce((sum, t) => sum + t.amount, 0);

        return {
            projectedSalary,
            pendingReimbursements,
            totalPendingReimbursements,
            projectedInstallments,
            totalProjectedInstallments,
            activeSubscriptions,
            totalSubscriptions,
            confirmedIncomes,
            totalConfirmedIncomes
        };
    }, [transactions, subscriptions, targetMonth, paymentMethods, preferences]);

    // VALORES FINAIS
    const totalExtraIncomes = extraIncomes.reduce((acc, curr) => acc + curr.amount, 0);
    const finalIncome = manualSalary !== null ? manualSalary : projections.projectedSalary;
    const finalTotalIncome = finalIncome + (includeReimbursements ? projections.totalPendingReimbursements : 0) + totalExtraIncomes + projections.totalConfirmedIncomes;

    const currentBudget = manualBudget || defaultBudget;

    // O que já está "comprometido" do orçamento (Assinaturas + Parcelas)
    // Agrupado por categoria para mostrar quanto sobra livre
    const committedByCategory = useMemo(() => {
        const acc: Record<string, number> = {};
        [...projections.projectedInstallments, ...projections.activeSubscriptions.map(s => ({ ...s, type: 'expense' } as any))].forEach(item => {
            acc[item.category] = (acc[item.category] || 0) + item.amount;
        });
        return acc;
    }, [projections]);

    const totalExtras = extraExpenses.reduce((a, b) => a + b.amount, 0);

    const finalExpensesByCategory = useMemo(() => {
        const result: Record<string, number> = {};
        Object.keys(currentBudget).forEach(cat => {
            const budgetVal = currentBudget[cat] || 0;
            const committedVal = committedByCategory[cat] || 0;
            result[cat] = Math.max(budgetVal, committedVal);
        });
        return result;
    }, [currentBudget, committedByCategory]);

    const totalFinalExpenses = Object.values(finalExpensesByCategory).reduce((a: number, b: number) => a + b, 0) + totalExtras;
    const projectedBalance = finalTotalIncome - totalFinalExpenses;

    // Chart Data
    const chartData = useMemo(() => {
        const data = Object.entries(finalExpensesByCategory)
            .map(([name, value]: [string, number]) => ({ name, value }))
            .filter(i => i.value > 0);
        if (totalExtras > 0) data.push({ name: 'Extras', value: totalExtras });
        return data;
    }, [finalExpensesByCategory, totalExtras]);


    // Handlers
    const handleSave = () => {
        const profileToSave: PlanningProfile = {
            id: draft.id || crypto.randomUUID(),
            month: targetMonth,
            expectedIncome: finalIncome,
            plannedExpenses: currentBudget,
            extraExpenses: extraExpenses,
            extraIncomes: extraIncomes
        };
        onSaveProfile(profileToSave);
        alert('Planejamento Salvo!');
    };

    const handleReset = () => {
        if (confirm('Tem certeza? Isso apagará todas as edições manuais e valores extras deste mês.')) {
            // Se já existir salvo, deletamos? Ou apenas resetamos o local?
            // User pediu "Resetar Cenário", idealmente volta ao estado "virgem" (automático)
            resetLocalState();

            // Opcional: Se quiser deletar do banco
            const savedProfile = profiles.find(p => p.month === targetMonth);
            if (savedProfile) {
                onDeleteProfile(savedProfile.id);
            }
        }
    };

    // --- Extra Expenses Handlers ---
    const handleSaveExtra = (e: React.FormEvent) => {
        e.preventDefault();
        if (!extraForm.description || !extraForm.rawVal) return;

        let calculatedAmount = extraForm.rawVal;
        if (extraForm.isInstallment && extraForm.valueType === 'total') {
            calculatedAmount = extraForm.rawVal / extraForm.installmentsCount;
        }

        const newExtra: ExtraExpense = {
            id: extraForm.id || crypto.randomUUID(),
            description: extraForm.description,
            amount: calculatedAmount,
            isInstallment: extraForm.isInstallment,
            installmentsCount: extraForm.isInstallment ? extraForm.installmentsCount : undefined,
            installmentValue: extraForm.isInstallment ? calculatedAmount : undefined,
            totalValue: extraForm.isInstallment && extraForm.valueType === 'total' ? extraForm.rawVal : undefined
        };

        if (extraForm.id) {
            setExtraExpenses(prev => prev.map(ex => ex.id === extraForm.id ? newExtra : ex));
        } else {
            setExtraExpenses(prev => [...prev, newExtra]);
        }

        setExtraForm({ id: null, description: '', amount: 0, isInstallment: false, installmentsCount: 1, valueType: 'total', rawVal: 0 });
    };

    const handleEditExtra = (extra: ExtraExpense) => {
        setExtraForm({
            id: extra.id,
            description: extra.description,
            amount: extra.amount,
            isInstallment: !!extra.isInstallment,
            installmentsCount: extra.installmentsCount || 1,
            valueType: extra.totalValue ? 'total' : 'installment',
            rawVal: extra.totalValue || extra.amount
        });
    };

    const removeExtra = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExtraExpenses(prev => prev.filter(ex => ex.id !== id));
        if (extraForm.id === id) setExtraForm({ id: null, description: '', amount: 0, isInstallment: false, installmentsCount: 1, valueType: 'total', rawVal: 0 });
    };

    // --- Extra Incomes Handlers ---
    const handleAddIncome = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newIncomeDesc || !newIncomeAmount) return;
        setExtraIncomes([...extraIncomes, { id: crypto.randomUUID(), description: newIncomeDesc, amount: newIncomeAmount }]);
        setNewIncomeDesc('');
        setNewIncomeAmount(0);
    };

    const removeIncome = (id: string) => {
        setExtraIncomes(prev => prev.filter(i => i.id !== id));
    };


    const toggleCategoryBudget = (cat: string, val: number) => {
        setManualBudget(prev => ({ ...(prev || defaultBudget), [cat]: val }));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Header e Seletor de Mês */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-indigo-600" />
                        Simulador de Futuro
                    </h2>
                    <p className="text-sm text-slate-500">Projete suas finanças com base em seus compromissos e metas.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 text-indigo-500 pointer-events-none" size={18} />
                        <input
                            type="month"
                            value={targetMonth}
                            onChange={(e) => setTargetMonth(e.target.value)}
                            className="pl-10 p-2 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>
                    <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-all active:scale-95" title="Limpar edições e voltar ao automático">
                        <RotateCcw size={18} />
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                        <Save size={18} /> Salvar Cenário
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Coluna 1: Entradas */}
                <div className="space-y-6">
                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                        <h3 className="font-bold text-emerald-800 flex items-center gap-2 mb-4"><Wallet size={20} /> Entradas Previstas</h3>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Salário Esperado</label>
                                <div className="flex items-center gap-2">
                                    <CurrencyInput
                                        value={finalIncome}
                                        onChange={setManualSalary}
                                        className="text-2xl font-bold text-slate-700 w-full outline-none bg-transparent"
                                    />
                                    {manualSalary !== null && manualSalary !== projections.projectedSalary && (
                                        <button onClick={() => setManualSalary(null)} className="text-xs text-orange-500 underline" title="Voltar ao calculado autom.">Reset</button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Baseado no último salário: {formatCurrency(projections.projectedSalary)}</p>
                            </div>

                            {projections.totalPendingReimbursements > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Reembolsos Pendentes</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="includeReimbursements"
                                                checked={includeReimbursements}
                                                onChange={(e) => setIncludeReimbursements(e.target.checked)}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                                            />
                                            <label htmlFor="includeReimbursements" className="text-[10px] text-slate-500 cursor-pointer select-none">Considerar na Renda?</label>
                                        </div>
                                    </div>
                                    <p className={`text-xl font-bold transition-colors ${includeReimbursements ? 'text-emerald-600' : 'text-slate-300 decoration-slate-400 line-through'}`}>
                                        {formatCurrency(projections.totalPendingReimbursements)}
                                    </p>
                                    <div className={`mt-2 space-y-1 transition-opacity ${includeReimbursements ? 'opacity-100' : 'opacity-50'}`}>
                                        {projections.pendingReimbursements.map(t => (
                                            <div key={t.id} className="flex justify-between items-center gap-2 text-xs text-slate-500 border-b border-slate-50 pb-1 last:border-0">
                                                <span className="truncate flex-1 min-w-0" title={t.description}>{t.description}</span>
                                                <span className="whitespace-nowrap font-medium">{formatCurrency(t.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section: Confirmed Incomes (Realized) */}
                            {projections.totalConfirmedIncomes > 0 && (
                                <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-left-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Entradas Realizadas / Reembolsos</label>
                                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(projections.totalConfirmedIncomes)}</p>
                                    <div className="mt-2 space-y-1">
                                        {projections.confirmedIncomes.map(t => (
                                            <div key={t.id} className="flex justify-between items-center gap-2 text-xs text-slate-500 border-b border-slate-50 pb-1 last:border-0">
                                                <span className="truncate flex-1 min-w-0" title={t.description}>{t.description}</span>
                                                <span className="whitespace-nowrap font-medium">{formatCurrency(t.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Section: Extra Incomes */}
                            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Entradas Extras / Bônus</label>

                                {extraIncomes.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {extraIncomes.map(inc => (
                                            <div key={inc.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-1">
                                                <span className="text-slate-600">{inc.description}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-emerald-600">{formatCurrency(inc.amount)}</span>
                                                    <button onClick={() => removeIncome(inc.id)} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={handleAddIncome} className="flex gap-2">
                                    <input
                                        type="text" placeholder="Ex: Venda"
                                        className="flex-1 p-1 border border-slate-300 rounded text-xs"
                                        value={newIncomeDesc} onChange={e => setNewIncomeDesc(e.target.value)}
                                    />
                                    <CurrencyInput
                                        value={newIncomeAmount} onChange={setNewIncomeAmount}
                                        className="w-20 p-1 border border-slate-300 rounded text-xs" placeholder="R$"
                                    />
                                    <button type="submit" className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700"><Plus size={14} /></button>
                                </form>
                            </div>

                            <div className="pt-4 border-t border-emerald-200/50 flex justify-between items-center">
                                <span className="font-bold text-emerald-900">Total Entradas</span>
                                <span className="font-bold text-2xl text-emerald-700">{formatCurrency(finalTotalIncome)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Resumo/Gráfico */}
                    <div className={`p-6 rounded-2xl border transition-all duration-500 flex flex-col justify-center items-center text-center ${projectedBalance >= 0 ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-red-500 text-white border-red-600'}`}>
                        <p className="text-indigo-100 text-sm font-medium mb-1">Saldo Projetado</p>
                        <p className="text-4xl font-extrabold tracking-tight mb-2">{formatCurrency(projectedBalance)}</p>
                        {projectedBalance < 0 && <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-bold flex items-center gap-1"><AlertCircle size={12} /> Atenção: Orçamento Estourado</span>}
                        {projectedBalance >= 0 && <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Cenário Positivo</span>}


                    </div>
                </div>

                {/* Coluna 2 e 3: Saídas e Planejamento */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard size={20} className="text-red-500" /> Planejamento de Saídas</h3>
                        <span className="text-sm font-bold text-slate-500">Total: {formatCurrency(totalFinalExpenses)}</span>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar flex-1">
                        {Object.keys(currentBudget)
                            .sort((a, b) => (finalExpensesByCategory[b] || 0) - (finalExpensesByCategory[a] || 0))
                            .map((cat, idx) => {
                                const budgetVal = currentBudget[cat] || 0;
                                const committedVal = committedByCategory[cat] || 0;
                                const isOver = committedVal > budgetVal;
                                const finalVal = Math.max(budgetVal, committedVal);

                                // Detalhes da categoria
                                const catInstallments = projections.projectedInstallments.filter(t => t.category === cat);
                                const catSubs = projections.activeSubscriptions.filter(s => s.category === cat);

                                return (
                                    <div key={cat} className={`rounded-xl border p-4 space-y-3 transition-colors ${isOver ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex justify-between items-start">
                                            <label className={`font-bold text-sm ${isOver ? 'text-red-800' : 'text-slate-700'}`}>{cat}</label>
                                            <div className="text-right">
                                                <CurrencyInput
                                                    value={budgetVal}
                                                    onChange={(v) => toggleCategoryBudget(cat, v)}
                                                    className={`text-right font-bold text-lg bg-transparent w-28 outline-none ${isOver ? 'text-red-600' : 'text-slate-800'} border-b border-dashed border-slate-300 focus:border-indigo-500`}
                                                />
                                                <p className="text-[10px] text-slate-400">Orçamento Definido</p>
                                            </div>
                                        </div>

                                        {/* Barra de progresso visual */}
                                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${Math.min((committedVal / budgetVal) * 100, 100)}%` }}
                                            />
                                        </div>

                                        {isOver && (
                                            <p className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                                                <AlertCircle size={10} />
                                                Comprometido: {formatCurrency(committedVal)} (+{formatCurrency(committedVal - budgetVal)})
                                            </p>
                                        )}

                                        {/* Lista de Compromissos */}
                                        {(catInstallments.length > 0 || catSubs.length > 0) && (
                                            <div className="mt-2 pt-2 border-t border-black/5 space-y-1">
                                                {catInstallments.map(t => (
                                                    <div key={t.id} className="flex justify-between text-[10px] text-slate-500">
                                                        <span className="truncate">{t.description}</span>
                                                        <span>{formatCurrency(t.amount)}</span>
                                                    </div>
                                                ))}
                                                {catSubs.map(s => (
                                                    <div key={s.id} className="flex justify-between text-[10px] text-indigo-500">
                                                        <span className="truncate flex items-center gap-1"><ShoppingBag size={8} /> {s.name}</span>
                                                        <span>{formatCurrency(s.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>

                    {/* Seção de Extras Aprimorada */}
                    <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-2xl">
                        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Calculator size={16} /> Gastos Extras (Fora do Orçamento)</h4>

                        <div className="space-y-2 mb-4">
                            {extraExpenses.map((extra) => (
                                <div key={extra.id} onClick={() => handleEditExtra(extra)} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 text-sm hover:border-indigo-300 cursor-pointer group transition-all">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700">{extra.description}</span>
                                        {extra.isInstallment && (
                                            <span className="text-[10px] text-indigo-500 bg-indigo-50 w-fit px-1.5 rounded">
                                                {extra.installmentsCount}x de {formatCurrency(extra.installmentValue || extra.amount)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-red-600">{formatCurrency(extra.amount)}</span>
                                        <button onClick={(e) => removeExtra(extra.id, e)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSaveExtra} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">{extraForm.id ? 'Editar Gasto Extra' : 'Adicionar Novo Gasto Extra'}</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Descrição (ex: Presente)"
                                    className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                                    value={extraForm.description}
                                    onChange={e => setExtraForm({ ...extraForm, description: e.target.value })}
                                    required
                                />
                                {!extraForm.isInstallment && (
                                    <CurrencyInput
                                        value={extraForm.rawVal}
                                        onChange={val => setExtraForm({ ...extraForm, rawVal: val })}
                                        className="w-32 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                                        placeholder="Valor"
                                    />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isInstallment"
                                    checked={extraForm.isInstallment}
                                    onChange={e => setExtraForm({ ...extraForm, isInstallment: e.target.checked })}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isInstallment" className="text-sm text-slate-600 cursor-pointer select-none">É uma compra parcelada?</label>
                            </div>

                            {extraForm.isInstallment && (
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2 grid grid-cols-3 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-indigo-600 uppercase">Nº Parcelas</label>
                                        <input
                                            type="number"
                                            min="2"
                                            max="99"
                                            value={extraForm.installmentsCount}
                                            onChange={e => setExtraForm({ ...extraForm, installmentsCount: parseInt(e.target.value) || 1 })}
                                            className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-center font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-200"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-indigo-600 uppercase">Total</label>
                                        <CurrencyInput
                                            value={extraForm.valueType === 'total' ? extraForm.rawVal : (extraForm.rawVal * extraForm.installmentsCount)}
                                            onChange={(val) => setExtraForm({ ...extraForm, rawVal: val, valueType: 'total' })}
                                            className="w-full p-2 bg-white border border-indigo-200 rounded-lg font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-200"
                                            placeholder="R$ 0,00"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-indigo-600 uppercase">Por Mês</label>
                                        <CurrencyInput
                                            value={extraForm.valueType === 'installment' ? extraForm.rawVal : (extraForm.rawVal / Math.max(1, extraForm.installmentsCount))}
                                            onChange={(val) => setExtraForm({ ...extraForm, rawVal: val, valueType: 'installment' })}
                                            className="w-full p-2 bg-white border border-indigo-200 rounded-lg font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-200"
                                            placeholder="R$ 0,00"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                {extraForm.id && (
                                    <button
                                        type="button"
                                        onClick={() => setExtraForm({ id: null, description: '', amount: 0, isInstallment: false, installmentsCount: 1, valueType: 'total', rawVal: 0 })}
                                        className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm"
                                    >
                                        Cancelar Edição
                                    </button>
                                )}
                                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                                    <Plus size={16} /> {extraForm.id ? 'Atualizar Gasto' : 'Adicionar Gasto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanningTab;
