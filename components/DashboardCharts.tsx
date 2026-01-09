
import React, { useMemo, useCallback, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, Budget, PaymentMethod, Subscription, UserPreferences } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { getTransactionEffectiveDate } from '../utils/financeUtils';
import { ChevronDown, ChevronUp, History, ShoppingBag, CreditCard } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  budget: Budget;
  paymentMethods: PaymentMethod[];
  selectedMonth: string;
  subscriptions: Subscription[];
  preferences: UserPreferences;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const DashboardCharts: React.FC<Props> = ({ transactions, budget, paymentMethods, selectedMonth, subscriptions, preferences }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const getFinancialMonth = useCallback((dateStr: string) => {
    return dateStr.slice(0, 7);
  }, []);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
      return effectiveDate.slice(0, 7) === selectedMonth;
    });
  }, [transactions, paymentMethods, preferences, selectedMonth]);

  const monthlyBalanceHistory = useMemo(() => {
    const data: Record<string, { income: number; expense: number; investment: number }> = {};
    const nowMonthStr = new Date().toISOString().slice(0, 7);

    // Mostra 6 meses em torno do selecionado para contexto
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const startDate = new Date(selYear, selMonth - 4, 1);
    const endDate = new Date(selYear, selMonth + 1, 1);
    const startMonthStr = startDate.toISOString().slice(0, 7);
    const endMonthStr = endDate.toISOString().slice(0, 7);

    // 1. Transações Reais
    transactions.forEach(t => {
      const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
      const key = effectiveDate.slice(0, 7);
      if (key >= startMonthStr && key <= endMonthStr) {
        if (!data[key]) data[key] = { income: 0, expense: 0, investment: 0 };
        if (t.type === 'income') data[key].income += t.amount;
        if (t.type === 'expense') data[key].expense += t.amount;
        if (t.type === 'investment') data[key].investment += t.amount;
      }
    });

    // 2. Projeções de Assinaturas (apenas para meses >= hoje)
    const monthsInView: string[] = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
      monthsInView.push(curr.toISOString().slice(0, 7));
      curr.setMonth(curr.getMonth() + 1);
    }

    monthsInView.forEach(m => {
      if (m >= nowMonthStr) {
        if (!data[m]) data[m] = { income: 0, expense: 0, investment: 0 };

        subscriptions.forEach(sub => {
          // Verifica se já existe transação de assinatura lançada para este mês
          const alreadyLaunched = transactions.some(t => {
            const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
            return effectiveDate.slice(0, 7) === m && t.description.includes(`Assinatura: ${sub.name}`);
          });

          if (!alreadyLaunched) {
            const billingDay = parseInt(sub.startDate.split('-')[2]);
            const simulatedDate = `${m}-${String(billingDay).padStart(2, '0')}`;

            if (simulatedDate >= sub.startDate && (!sub.activeUntil || simulatedDate <= sub.activeUntil)) {
              const dummyTx: Transaction = {
                id: 'dummy',
                amount: sub.amount,
                category: sub.category,
                description: sub.name,
                date: simulatedDate,
                paymentMethod: sub.paymentMethod,
                type: 'expense'
              };
              const effectiveDate = getTransactionEffectiveDate(dummyTx, paymentMethods, preferences);
              const effectiveMonth = effectiveDate.slice(0, 7);

              if (effectiveMonth >= startMonthStr && effectiveMonth <= endMonthStr) {
                if (!data[effectiveMonth]) data[effectiveMonth] = { income: 0, expense: 0, investment: 0 };
                data[effectiveMonth].expense += sub.amount;
              }
            }
          }
        });
      }
    });

    return Object.entries(data)
      .map(([key, values]) => ({
        name: `${key.split('-')[1]}/${key.split('-')[0].slice(2)}`,
        sortKey: key,
        ...values
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions, selectedMonth, subscriptions, paymentMethods, preferences]);

  const budgetVsActual = useMemo(() => {
    const nowMonthStr = new Date().toISOString().slice(0, 7);
    const currentMonthExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    // Adiciona projeções de assinaturas (se o mês for >= agora)
    if (selectedMonth >= nowMonthStr) {
      subscriptions.forEach(sub => {
        const alreadyLaunched = monthlyTransactions.some(t => t.description.includes(`Assinatura: ${sub.name}`));
        if (!alreadyLaunched) {
          const billingDay = parseInt(sub.startDate.split('-')[2]);
          const simulatedDate = `${selectedMonth}-${String(billingDay).padStart(2, '0')}`;

          if (simulatedDate >= sub.startDate && (!sub.activeUntil || simulatedDate <= sub.activeUntil)) {
            const dummyTx: Transaction = {
              id: 'dummy',
              amount: sub.amount,
              category: sub.category,
              description: sub.name,
              date: simulatedDate,
              paymentMethod: sub.paymentMethod,
              type: 'expense'
            };
            const effectiveDate = getTransactionEffectiveDate(dummyTx, paymentMethods, preferences);
            if (effectiveDate.slice(0, 7) === selectedMonth) {
              currentMonthExpenses[sub.category] = (currentMonthExpenses[sub.category] || 0) + sub.amount;
            }
          }
        }
      });
    }

    return Object.keys(budget).map((category, index) => {
      const budgetAmount = budget[category] || 0;
      const spentAmount = currentMonthExpenses[category] || 0;
      const remaining = Math.max(0, budgetAmount - spentAmount);
      const isOverBudget = spentAmount > budgetAmount;
      const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

      // Extract details for the "Secret Menu"
      const details = [
        ...monthlyTransactions.filter(t => t.category === category && t.type === 'expense').map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          date: t.date,
          isProjection: false,
          paymentMethod: t.paymentMethod
        })),
        ...(selectedMonth >= nowMonthStr ? subscriptions.filter(s => s.category === category).map(s => {
          const alreadyLaunched = monthlyTransactions.some(t => t.description.includes(`Assinatura: ${s.name}`));
          if (alreadyLaunched) return null;

          const billingDay = parseInt(s.startDate.split('-')[2]);
          const simulatedDate = `${selectedMonth}-${String(billingDay).padStart(2, '0')}`;
          if (simulatedDate < s.startDate || (s.activeUntil && simulatedDate > s.activeUntil)) return null;

          const dummyTx: Transaction = {
            id: 'dummy',
            amount: s.amount,
            category: s.category,
            description: s.name,
            date: simulatedDate,
            paymentMethod: s.paymentMethod,
            type: 'expense'
          };
          const effectiveDate = getTransactionEffectiveDate(dummyTx, paymentMethods, preferences);
          if (effectiveDate.slice(0, 7) !== selectedMonth) return null;

          return {
            id: `proj-${s.id}`,
            description: s.name,
            amount: s.amount,
            date: simulatedDate,
            isProjection: true,
            paymentMethod: s.paymentMethod
          };
        }).filter(Boolean) as any[] : [])
      ];

      return {
        name: category,
        budget: budgetAmount,
        spent: spentAmount,
        remaining,
        percentage,
        isOverBudget,
        details: details.sort((a, b) => b.date.localeCompare(a.date)),
        chartData: [
          { name: 'Gasto', value: spentAmount, fill: isOverBudget ? '#ef4444' : COLORS[index % COLORS.length] },
          { name: 'Restante', value: remaining, fill: '#f1f5f9' }
        ]
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [monthlyTransactions, budget, selectedMonth, subscriptions, paymentMethods, preferences]);

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {budgetVsActual.map((item) => {
          const isExpanded = expandedCategory === item.name;

          return (
            <div
              key={item.name}
              className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${isExpanded ? 'border-indigo-300 ring-2 ring-indigo-50 md:col-span-2 lg:col-span-2' : 'border-slate-200 hover:border-indigo-200'}`}
            >
              <div
                className="p-4 flex items-center justify-between cursor-pointer group"
                onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-700 text-sm truncate" title={item.name}>{item.name}</p>
                    {isExpanded ? <ChevronUp size={14} className="text-indigo-500" /> : <ChevronDown size={14} className="text-slate-300 group-hover:text-indigo-400" />}
                  </div>
                  <div className="mt-1"><p className={`font-bold ${item.isOverBudget ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(item.spent).replace('R$', '')}</p></div>
                  <div className="mt-1 space-y-0.5"><p className="text-[10px] text-slate-400 truncate">Meta: {formatCurrency(item.budget)}</p></div>
                </div>
                <div className="h-16 w-16 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={item.chartData} cx="50%" cy="50%" innerRadius={18} outerRadius={25} dataKey="value" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>{item.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie></PieChart></ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className={`text-[9px] font-bold ${item.isOverBudget ? 'text-red-600' : 'text-slate-500'}`}>{item.percentage.toFixed(0)}%</span></div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="pt-3 border-t border-indigo-50 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {item.details.length === 0 ? (
                      <p className="text-[10px] text-slate-400 text-center py-4">Nenhuma transação neste mês</p>
                    ) : (
                      item.details.map((detail: any, idx: number) => (
                        <div key={`${detail.id}-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100/50">
                          <div className="flex items-center gap-2 min-w-0">
                            {detail.isProjection ? (
                              <ShoppingBag size={12} className="text-indigo-400 flex-shrink-0" />
                            ) : (
                              <History size={12} className="text-slate-400 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 truncate leading-tight">{detail.description}</p>
                              <p className="text-[9px] text-slate-400 flex items-center gap-1">
                                {formatDateBR(detail.date)}
                                {detail.isProjection && <span className="bg-indigo-100 text-indigo-600 px-1 rounded-[4px] font-bold text-[8px]">PROJEÇÃO</span>}
                                {!detail.isProjection && <span className="flex items-center gap-0.5"><CreditCard size={8} /> {detail.paymentMethod}</span>}
                              </p>
                            </div>
                          </div>
                          <p className="text-[11px] font-extrabold text-slate-800 ml-2 whitespace-nowrap">
                            {formatCurrency(detail.amount)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between">Evolução Mensal <span className="text-[10px] text-slate-400 uppercase font-medium tracking-widest">Baseado na data das transações</span></h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyBalanceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.05} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.05} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.05} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(val) => `R$${val / 1000}k`} tick={{ fill: '#64748b' }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Saídas" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
              <Area type="monotone" dataKey="investment" name="Investido" stroke="#6366f1" fillOpacity={1} fill="url(#colorInvestment)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
