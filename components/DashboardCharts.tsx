
import React, { useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, Budget, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/formatters';

interface Props {
  transactions: Transaction[];
  budget: Budget;
  paymentMethods: PaymentMethod[];
  selectedMonth: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const DashboardCharts: React.FC<Props> = ({ transactions, budget, paymentMethods, selectedMonth }) => {
  
  const getFinancialMonth = useCallback((dateStr: string) => {
    return dateStr.slice(0, 7);
  }, []);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => getFinancialMonth(t.date) === selectedMonth);
  }, [transactions, getFinancialMonth, selectedMonth]);

  const monthlyBalanceHistory = useMemo(() => {
    const data: Record<string, { income: number; expense: number; investment: number }> = {};
    
    // Mostra 6 meses em torno do selecionado para contexto
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const startDate = new Date(selYear, selMonth - 4, 1);
    const endDate = new Date(selYear, selMonth + 1, 1);

    transactions.forEach(t => {
      const key = getFinancialMonth(t.date);
      if (key >= startDate.toISOString().slice(0, 7) && key <= endDate.toISOString().slice(0, 7)) {
        if (!data[key]) data[key] = { income: 0, expense: 0, investment: 0 };
        if (t.type === 'income') data[key].income += t.amount;
        if (t.type === 'expense') data[key].expense += t.amount;
        if (t.type === 'investment') data[key].investment += t.amount;
      }
    });
    
    return Object.entries(data)
      .map(([key, values]) => ({ 
        name: `${key.split('-')[1]}/${key.split('-')[0].slice(2)}`, 
        sortKey: key, 
        ...values 
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions, getFinancialMonth, selectedMonth]);

  const budgetVsActual = useMemo(() => {
    const currentMonthExpenses = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

    return Object.keys(budget).map((category, index) => {
      const budgetAmount = budget[category] || 0;
      const spentAmount = currentMonthExpenses[category] || 0;
      const remaining = Math.max(0, budgetAmount - spentAmount);
      const isOverBudget = spentAmount > budgetAmount;
      const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      return { 
        name: category, 
        budget: budgetAmount, 
        spent: spentAmount, 
        remaining, 
        percentage, 
        isOverBudget, 
        chartData: [
          { name: 'Gasto', value: spentAmount, fill: isOverBudget ? '#ef4444' : COLORS[index % COLORS.length] }, 
          { name: 'Restante', value: remaining, fill: '#f1f5f9' }
        ] 
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [monthlyTransactions, budget]);

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {budgetVsActual.map((item) => (
              <div key={item.name} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate" title={item.name}>{item.name}</p>
                      <div className="mt-1"><p className={`font-bold ${item.isOverBudget ? 'text-red-600' : 'text-slate-800'}`}>{formatCurrency(item.spent).replace('R$', '')}</p></div>
                      <div className="mt-1 space-y-0.5"><p className="text-[10px] text-slate-400 truncate">Meta: {formatCurrency(item.budget)}</p></div>
                  </div>
                  <div className="h-16 w-16 relative flex-shrink-0">
                       <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={item.chartData} cx="50%" cy="50%" innerRadius={18} outerRadius={25} dataKey="value" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>{item.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie></PieChart></ResponsiveContainer>
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className={`text-[9px] font-bold ${item.isOverBudget ? 'text-red-600' : 'text-slate-500'}`}>{item.percentage.toFixed(0)}%</span></div>
                  </div>
              </div>
          ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center justify-between">Evolução Mensal <span className="text-[10px] text-slate-400 uppercase font-medium tracking-widest">Baseado na data das transações</span></h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyBalanceHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.05}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.05}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.05}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(val) => `R$${val/1000}k`} tick={{fill: '#64748b'}} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
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
