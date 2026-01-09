
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Budget, PlanningProfile, InvestmentGoal, Subscription, PaymentMethod, UserPreferences } from './types';
import TransactionInput from './components/TransactionInput';
import DashboardCharts from './components/DashboardCharts';
import TransactionList from './components/TransactionList';
import PlanningTab from './components/PlanningTab';
import InvestmentsTab from './components/InvestmentsTab';
import ReimbursementsTab from './components/ReimbursementsTab';
import SettingsTab from './components/SettingsTab';
import ConfigurationTab from './components/ConfigurationTab';
import InstallmentsTab from './components/InstallmentsTab';
import SubscriptionsTab from './components/SubscriptionsTab';
import PaymentMethodsTab from './components/PaymentMethodsTab';
import InvoicesTab from './components/InvoicesTab';
import AuthModal from './components/AuthModal';
import UndoToast from './components/UndoToast';

import Sidebar from './components/Sidebar';
import { saveUserData, logoutUser, getAuthInstance, subscribeToUserData } from './services/firebase';
import { formatCurrency } from './utils/formatters';
import { getTransactionEffectiveDate } from './utils/financeUtils';
import { Wallet, Settings, LayoutDashboard, Calculator, TrendingUp, Users, Layers, LogIn, LogOut, Repeat, UserCircle, CreditCard, CalendarDays, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Settings2, Menu, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from './utils/reportExporter';

const DEFAULT_BUDGET: Budget = {
  'Alimentação': 1500,
  'Moradia': 2500,
  'Transporte': 800,
  'Lazer': 500,
  'Saúde': 400,
  'Investimentos': 1000,
  'Outros': 300
};

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pix', name: 'Pix', type: 'other', color: '#10b981' },
  { id: 'money', name: 'Dinheiro', type: 'other', color: '#f59e0b' },
  { id: 'debit', name: 'Débito', type: 'other', color: '#6366f1' },
  { id: 'credit_card_default', name: 'Cartão de Crédito', type: 'credit_card', closingDay: 25, dueDay: 5, color: '#4f46e5' }
];

const DEFAULT_PREFERENCES: UserPreferences = {
  creditCardLogic: 'transaction_date'
};

interface UndoAction {
  message: string;
  undo: () => void;
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<Budget>(DEFAULT_BUDGET);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENT_METHODS);
  const [totalSalary, setTotalSalary] = useState<number>(0);
  const [planningProfiles, setPlanningProfiles] = useState<PlanningProfile[]>([]);
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'investments' | 'planning' | 'settings' | 'configuration' | 'reimbursements' | 'installments' | 'subscriptions' | 'payment_methods' | 'invoices'>('dashboard');
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Estado do mês selecionado (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [planningDraft, setPlanningDraft] = useState<PlanningProfile>({
    id: '',
    month: new Date().toISOString().slice(0, 7),
    expectedIncome: 0,
    plannedExpenses: { ...DEFAULT_BUDGET }
  });

  const getFinancialMonth = useCallback((dateStr: string) => {
    return dateStr.slice(0, 7);
  }, []);

  const changeMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const summary = useMemo(() => {
    const monthlyTransactions = transactions.filter(t => {
      const effectiveDate = getTransactionEffectiveDate(t, paymentMethods, preferences);
      return getFinancialMonth(effectiveDate) === selectedMonth;
    });

    let totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    let totalExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    let totalInvestment = monthlyTransactions.filter(t => t.type === 'investment').reduce((acc, t) => acc + t.amount, 0);

    const nowMonth = new Date().toISOString().slice(0, 7);
    if (selectedMonth >= nowMonth) {
      subscriptions.forEach(sub => {
        // Verificamos se a assinatura já foi lançada manualmente como transação
        const alreadyLaunched = monthlyTransactions.some(t => t.description.includes(`Assinatura: ${sub.name}`));

        if (!alreadyLaunched) {
          // Simulamos a data de cobrança para o mês selecionado
          const billingDay = parseInt(sub.startDate.split('-')[2]);
          const simulatedDate = `${selectedMonth}-${String(billingDay).padStart(2, '0')}`;

          // A assinatura só conta se a data simulada for >= data de início
          // E se não houver data de término ou a data simulada for <= término
          if (simulatedDate >= sub.startDate && (!sub.activeUntil || simulatedDate <= sub.activeUntil)) {
            // Aplicamos a lógica de fechamento de cartão
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

            // Se a data efetiva cair neste mês selecionado, somamos
            if (effectiveDate.slice(0, 7) === selectedMonth) {
              totalExpense += sub.amount;
            }
          }
        }
      });
    }

    return {
      totalIncome,
      totalExpense,
      totalInvestment,
      balance: totalIncome - totalExpense - totalInvestment
    };
  }, [transactions, getFinancialMonth, selectedMonth, subscriptions, paymentMethods, preferences]);


  const isFutureView = useMemo(() => {
    const now = new Date().toISOString().slice(0, 7);
    return selectedMonth > now;
  }, [selectedMonth]);

  const formattedSelectedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  }, [selectedMonth]);

  const setAndSaveTransactions = (valOrFn: Transaction[] | ((prev: Transaction[]) => Transaction[])) => {
    setTransactions(prev => {
      const newValue = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (user) saveUserData(user.uid, 'transactions', newValue);
      else localStorage.setItem('transactions', JSON.stringify(newValue));
      return newValue;
    });
  };

  const setAndSavePaymentMethods = (valOrFn: PaymentMethod[] | ((prev: PaymentMethod[]) => PaymentMethod[])) => {
    setPaymentMethods(prev => {
      const newValue = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (user) saveUserData(user.uid, 'paymentMethods', newValue);
      else localStorage.setItem('paymentMethods', JSON.stringify(newValue));
      return newValue;
    });
  };

  const setAndSaveBudget = (valOrFn: Budget | ((prev: Budget) => Budget)) => {
    setBudget(prev => {
      const newValue = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (user) saveUserData(user.uid, 'budget', newValue);
      else localStorage.setItem('budget', JSON.stringify(newValue));
      return newValue;
    });
  };

  const setAndSaveSubscriptions = (valOrFn: Subscription[] | ((prev: Subscription[]) => Subscription[])) => {
    setSubscriptions(prev => {
      const newValue = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (user) saveUserData(user.uid, 'subscriptions', newValue);
      else localStorage.setItem('subscriptions', JSON.stringify(newValue));
      return newValue;
    });
  };

  const setAndSavePlanning = (valOrFn: PlanningProfile[] | ((prev: PlanningProfile[]) => PlanningProfile[])) => {
    setPlanningProfiles(prev => {
      const newValue = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (user) saveUserData(user.uid, 'planningProfiles', newValue);
      else localStorage.setItem('planningProfiles', JSON.stringify(newValue));
      return newValue;
    });
  };

  const setAndSaveGoals = (valOrFn: InvestmentGoal[] | ((prev: InvestmentGoal[]) => InvestmentGoal[])) => {
    setInvestmentGoals(prev => {
      const newValue = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      if (user) saveUserData(user.uid, 'investmentGoals', newValue);
      else localStorage.setItem('investmentGoals', JSON.stringify(newValue));
      return newValue;
    });
  };

  const setAndSaveSalary = (newSalary: number) => {
    setTotalSalary(newSalary);
    if (user) saveUserData(user.uid, 'totalSalary', newSalary);
    else localStorage.setItem('totalSalary', newSalary.toString());
  };

  const setAndSavePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    if (user) saveUserData(user.uid, 'preferences', newPrefs);
    else localStorage.setItem('preferences', JSON.stringify(newPrefs));
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setTransactions([]);
    setSubscriptions([]);
    setPreferences(DEFAULT_PREFERENCES);
    loadLocalData();
  };

  const handleSaveProfile = (profile: PlanningProfile) => {
    setAndSavePlanning(prev => {
      const exists = prev.find(p => p.month === profile.month);
      if (exists) {
        return prev.map(p => p.month === profile.month ? { ...profile, id: exists.id } : p);
      }
      return [...prev, { ...profile, id: crypto.randomUUID() }];
    });
  };

  const handleUpdateGroup = (groupId: string, newTitle: string, newStartDate: string, newCount: number, newTotalAmount: number, newCategory: string, newPaymentMethod: string, isReimbursable?: boolean, debtorName?: string) => {
    setAndSaveTransactions(prev => {
      const oldGroup = prev.filter(t => t.groupId === groupId);
      if (oldGroup.length === 0) return prev;

      const others = prev.filter(t => t.groupId !== groupId);

      const installmentAmount = newTotalAmount / newCount;
      const newTxs: Transaction[] = [];
      const baseDate = new Date(newStartDate + 'T12:00:00');

      for (let i = 0; i < newCount; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);
        newTxs.push({
          id: crypto.randomUUID(),
          description: `${newTitle} (${i + 1}/${newCount})`,
          amount: installmentAmount,
          category: newCategory,
          paymentMethod: newPaymentMethod,
          date: installmentDate.toISOString().split('T')[0],
          type: 'expense',
          groupId,
          isReimbursable: isReimbursable !== undefined ? isReimbursable : !!oldGroup[0].isReimbursable,
          isReimbursed: false,
          debtorName: debtorName !== undefined ? debtorName : oldGroup[0].debtorName
        });
      }
      return [...others, ...newTxs];
    });
  };

  useEffect(() => {
    const auth = getAuthInstance();
    if (!auth) { loadLocalData(); return; }
    const unsubAuth = auth.onAuthStateChanged((u: any) => {
      setUser(u);
      if (u) {
        subscribeToUserData(u.uid, 'transactions', (data) => data && setTransactions(data));
        subscribeToUserData(u.uid, 'budget', (data) => data !== undefined && setBudget(data));
        subscribeToUserData(u.uid, 'paymentMethods', (data) => data && setPaymentMethods(data));
        subscribeToUserData(u.uid, 'totalSalary', (data) => data !== undefined && setTotalSalary(Number(data)));
        subscribeToUserData(u.uid, 'planningProfiles', (data) => data && setPlanningProfiles(data));
        subscribeToUserData(u.uid, 'investmentGoals', (data) => data && setInvestmentGoals(data));
        subscribeToUserData(u.uid, 'subscriptions', (data) => data && setSubscriptions(data));
        subscribeToUserData(u.uid, 'preferences', (data) => data && setPreferences(data));

      } else { loadLocalData(); }
    });
    return () => unsubAuth();
  }, []);

  const loadLocalData = () => {
    try {
      const t = localStorage.getItem('transactions');
      const b = localStorage.getItem('budget');
      const s = localStorage.getItem('totalSalary');
      const p = localStorage.getItem('planningProfiles');
      const i = localStorage.getItem('investmentGoals');
      const sub = localStorage.getItem('subscriptions');
      const pm = localStorage.getItem('paymentMethods');
      if (t) setTransactions(JSON.parse(t));
      if (b) setBudget(JSON.parse(b));
      if (s) setTotalSalary(Number(s));
      if (p) setPlanningProfiles(JSON.parse(p));
      if (i) setInvestmentGoals(JSON.parse(i));
      if (sub) setSubscriptions(JSON.parse(sub));
      if (pm) setPaymentMethods(JSON.parse(pm));
      const prefs = localStorage.getItem('preferences');
      if (prefs) setPreferences(JSON.parse(prefs));

    } catch (e) { }
  };

  const categories = useMemo(() => Object.keys(budget).sort(), [budget]);

  const handleUpdateCategoryName = (oldName: string, newName: string, newValue: number) => {
    setAndSaveBudget(prev => {
      const next = { ...prev };
      delete next[oldName];
      next[newName] = newValue;
      return next;
    });
    setAndSaveTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
    setAndSaveSubscriptions(prev => prev.map(s => s.category === oldName ? { ...s, category: newName } : s));
  };

  const addTransactions = (newTransactions: Transaction[]) => {
    setAndSaveTransactions(prev => [...newTransactions, ...prev]);
  };

  const handleAddGroup = (title: string, category: string, paymentMethod: string, date: string, count: number, totalAmount: number, isReimbursable: boolean, debtorName?: string) => {
    const groupId = crypto.randomUUID();
    const installmentAmount = totalAmount / count;
    const newTxs: Transaction[] = [];
    const baseDate = new Date(date + 'T12:00:00');

    for (let i = 0; i < count; i++) {
      const installmentDate = new Date(baseDate);
      installmentDate.setMonth(baseDate.getMonth() + i);
      newTxs.push({
        id: crypto.randomUUID(),
        description: `${title} (${i + 1}/${count})`,
        amount: installmentAmount,
        category,
        paymentMethod,
        date: installmentDate.toISOString().split('T')[0],
        type: 'expense',
        groupId,
        isReimbursable,
        isReimbursed: false,
        debtorName
      });
    }
    addTransactions(newTxs);
  };

  const handleAnticipateGroup = (groupId: string, discountedAmount: number, numToAdvance: number) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    setAndSaveTransactions(prev => {
      const groupTxs = [...prev].filter(t => t.groupId === groupId).sort((a, b) => a.date.localeCompare(b.date));
      if (groupTxs.length === 0) return prev;

      const prototype = groupTxs[0];
      const baseDesc = prototype.description.replace(/\(\d+\/\d+\)$/, '').trim();
      const futureTxs = groupTxs.filter(t => t.date > todayStr);
      const installmentsToReschedule = futureTxs.slice(numToAdvance);
      const rescheduled = installmentsToReschedule.map((t, index) => {
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1 + index, 1);
        const originalDay = parseInt(t.date.split('-')[2], 10);
        nextMonthDate.setDate(originalDay);
        return { ...t, date: nextMonthDate.toISOString().split('T')[0] };
      });

      const otherTxs = prev.filter(t => t.groupId !== groupId);
      const anticipationTx: Transaction = {
        id: crypto.randomUUID(),
        description: `Antecipação (${numToAdvance} parc.): ${baseDesc}`,
        amount: discountedAmount,
        category: prototype.category,
        paymentMethod: prototype.paymentMethod,
        date: todayStr,
        type: 'expense',
        groupId: groupId
      };

      return [...otherTxs, ...groupTxs.filter(t => t.date <= todayStr), ...rescheduled, anticipationTx];
    });
  };

  const handleReimburse = (t: Transaction) => {
    const incomeId = crypto.randomUUID();
    const incomeTx: Transaction = {
      id: incomeId,
      amount: t.amount,
      category: 'Outros',
      paymentMethod: t.paymentMethod,
      type: 'income',
      description: `Reembolso Recebido: ${t.description}`,
      date: new Date().toISOString().split('T')[0],
      relatedTransactionId: t.id
    };

    setAndSaveTransactions(prev => [
      incomeTx,
      ...prev.map(item => item.id === t.id ? { ...item, isReimbursed: true, relatedTransactionId: incomeId } : item)
    ]);
  };

  const handleUndoReimburse = (t: Transaction) => {
    const incomeId = t.relatedTransactionId;
    setAndSaveTransactions(prev =>
      prev
        .filter(item => item.id !== incomeId)
        .map(item => item.id === t.id ? { ...item, isReimbursed: false, relatedTransactionId: undefined } : item)
    );
  };

  // --- Funções de Exclusão com Suporte a Undo ---

  const handleDeleteTransaction = (id: string) => {
    const item = transactions.find(t => t.id === id);
    if (!item) return;

    // Se for um investimento do tipo "Aporte", devemos abater da meta correspondente
    // Se for "Retirada", devemos devolver o valor para a meta
    let goalToUpdate: InvestmentGoal | undefined;
    let isContribution = false;
    let isWithdrawal = false;

    if (item.type === 'investment' && item.description.startsWith('Aporte: ')) {
      const goalName = item.description.replace('Aporte: ', '').trim();
      goalToUpdate = investmentGoals.find(g => g.name === goalName);
      isContribution = true;
    } else if (item.type === 'income' && item.description.startsWith('Retirada do Investimento - ')) {
      const goalName = item.description.replace('Retirada do Investimento - ', '').trim();
      goalToUpdate = investmentGoals.find(g => g.name === goalName);
      isWithdrawal = true;
    }

    const prevTransactions = [...transactions];
    const prevGoals = [...investmentGoals];

    setAndSaveTransactions(prevTransactions.filter(t => t.id !== id));

    if (goalToUpdate) {
      setAndSaveGoals(prev => prev.map(g => {
        if (g.id === goalToUpdate!.id) {
          if (isContribution) {
            return { ...g, currentAmount: Math.max(0, g.currentAmount - item.amount) };
          } else if (isWithdrawal) {
            return { ...g, currentAmount: g.currentAmount + item.amount };
          }
        }
        return g;
      }));
    }

    setUndoAction({
      message: `Transação "${item.description}" excluída.`,
      undo: () => {
        setAndSaveTransactions(prevTransactions);
        if (goalToUpdate) {
          setAndSaveGoals(prevGoals);
        }
      }
    });
  };

  const handleDeleteSubscription = (id: string) => {
    const item = subscriptions.find(s => s.id === id);
    if (!item) return;
    const prevData = [...subscriptions];
    setAndSaveSubscriptions(prevData.filter(s => s.id !== id));
    setUndoAction({
      message: `Assinatura "${item.name}" excluída.`,
      undo: () => setAndSaveSubscriptions(prevData)
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    const firstItem = transactions.find(t => t.groupId === groupId);
    if (!firstItem) return;
    const desc = firstItem.description.replace(/\(\d+\/\d+\)$/, '').trim();
    const prevData = [...transactions];
    setAndSaveTransactions(prevData.filter(t => t.groupId !== groupId));
    setUndoAction({
      message: `Parcelamento "${desc}" excluído.`,
      undo: () => setAndSaveTransactions(prevData)
    });
  };

  const handleDeleteGoal = (id: string) => {
    const item = investmentGoals.find(g => g.id === id);
    if (!item) return;
    const prevData = [...investmentGoals];
    setAndSaveGoals(prevData.filter(g => g.id !== id));
    setUndoAction({
      message: `Meta "${item.name}" excluída.`,
      undo: () => setAndSaveGoals(prevData)
    });
  };

  const handleDeletePaymentMethod = (id: string) => {
    const item = paymentMethods.find(pm => pm.id === id);
    if (!item) return;
    const prevData = [...paymentMethods];
    setAndSavePaymentMethods(prevData.filter(pm => pm.id !== id));
    setUndoAction({
      message: `Meio de Pagamento "${item.name}" excluído.`,
      undo: () => setAndSavePaymentMethods(prevData)
    });
  };

  const handleDeleteProfile = (id: string) => {
    const item = planningProfiles.find(p => p.id === id);
    if (!item) return;
    const prevData = [...planningProfiles];
    setAndSavePlanning(prevData.filter(p => p.id !== id));
    setUndoAction({
      message: `Planejamento de ${item.month} excluído.`,
      undo: () => setAndSavePlanning(prevData)
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onLogin={() => setShowAuthModal(true)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 items-center justify-between z-40">
          <div className="flex items-center gap-3 text-indigo-700 font-extrabold text-2xl tracking-tight">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-indigo-200 shadow-lg">
              <Wallet size={24} />
            </div>
            <span className="whitespace-nowrap">Wealth Planning</span>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100">
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Usuário</p>
                  <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{user.email}</p>
                </div>
                <UserCircle className="text-indigo-600" size={32} />
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2 transition-colors border-l border-slate-200 ml-1" title="Sair">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-indigo-100 transition-all active:scale-95">
                <LogIn size={20} /> <span>Entrar</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Header (Visible only on mobile) */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-lg">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <Wallet size={20} />
            </div>
            <span>Wealth Plan</span>
          </div>

          <button onClick={() => setShowAuthModal(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
            {user ? <UserCircle size={24} className="text-indigo-600" /> : <LogIn size={24} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>

            {/* Seletor de Meses */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-indigo-600">
                  <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center min-w-[180px]">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Período Selecionado</span>
                  <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                    <CalendarIcon size={18} className="text-indigo-600" />
                    {formattedSelectedMonth}
                  </h3>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-indigo-600">
                  <ChevronRight size={24} />
                </button>
              </div>
              <button
                onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
              >
                Hoje
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">Visão Geral Financeira</h2>
                  <p className="text-xs text-slate-500">
                    Os gastos são contabilizados na data da compra/parcela.
                  </p>
                </div>
              </div>

              <button
                onClick={() => exportToExcel(transactions, subscriptions, paymentMethods, preferences)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-sm transition-all border border-emerald-200"
              >
                <FileSpreadsheet size={18} />
                Exportar Relatório Excel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
                <p className="text-sm text-slate-500 font-medium mb-1 flex items-center gap-2">
                  Saldo Projetado
                  {isFutureView && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">PROJEÇÃO</span>}
                </p>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrency(summary.balance)}</p>
                <div className="absolute -right-2 -bottom-2 text-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity rotate-12">
                  <TrendingUp size={64} />
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500 font-medium mb-1">Entradas</p>
                <p className="text-2xl font-bold text-emerald-600">+ {formatCurrency(summary.totalIncome)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500 font-medium mb-1">Saídas</p>
                <p className="text-2xl font-bold text-red-600">- {formatCurrency(summary.totalExpense)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-sm text-slate-500 font-medium mb-1">Investido</p>
                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.totalInvestment)}</p>
              </div>
            </div>

            {!isFutureView && (
              <TransactionInput
                onAddTransactions={addTransactions}
                investmentGoals={investmentGoals}
                categories={categories}
                paymentMethods={paymentMethods}
              />
            )}

            <DashboardCharts
              transactions={transactions}
              budget={budget}
              paymentMethods={paymentMethods}
              selectedMonth={selectedMonth}
              subscriptions={subscriptions}
              preferences={preferences}
            />

            <TransactionList
              transactions={transactions}
              onDelete={handleDeleteTransaction}
              onUpdate={(t, sib) => updateTransaction(t, sib)}
              categories={categories}
              paymentMethods={paymentMethods}
              selectedMonth={selectedMonth}
              subscriptions={isFutureView ? subscriptions : []}
              preferences={preferences}
            />
          </div>
          {activeTab === 'payment_methods' && <PaymentMethodsTab paymentMethods={paymentMethods} onAdd={pm => setAndSavePaymentMethods(prev => [...prev, pm])} onUpdate={pm => setAndSavePaymentMethods(prev => prev.map(item => item.id === pm.id ? pm : item))} onDelete={handleDeletePaymentMethod} />}
          {activeTab === 'invoices' && <InvoicesTab transactions={transactions} paymentMethods={paymentMethods} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab subscriptions={subscriptions} transactions={transactions} onAddSubscription={(s) => setAndSaveSubscriptions(prev => [...prev, s])} onDeleteSubscription={handleDeleteSubscription} onUpdateSubscription={(s) => setAndSaveSubscriptions(prev => prev.map(item => item.id === s.id ? s : item))} categories={categories} paymentMethods={paymentMethods} />}
          {activeTab === 'installments' && <InstallmentsTab transactions={transactions} onUpdateGroup={handleUpdateGroup} onAddGroup={handleAddGroup} onAnticipateGroup={handleAnticipateGroup} onDeleteGroup={handleDeleteGroup} categories={categories} paymentMethods={paymentMethods} />}
          {activeTab === 'planning' && <PlanningTab profiles={planningProfiles} transactions={transactions} budget={budget} onSaveProfile={handleSaveProfile} onDeleteProfile={handleDeleteProfile} defaultBudget={budget} draft={planningDraft} onUpdateDraft={setPlanningDraft} />}
          {activeTab === 'investments' && <InvestmentsTab goals={investmentGoals} existingTransactions={transactions} onAddGoal={(goal) => setAndSaveGoals(prev => [...prev, goal])} onUpdateGoal={(goal) => setAndSaveGoals(prev => prev.map(g => g.id === goal.id ? goal : g))} onDeleteGoal={handleDeleteGoal} onAddContribution={(goalId, amount) => {
            const goal = investmentGoals.find(g => g.id === goalId);
            if (goal) {
              const newTx: Transaction = { id: crypto.randomUUID(), amount, category: 'Investimentos', type: 'investment', description: `Aporte: ${goal.name}`, date: new Date().toISOString().split('T')[0], paymentMethod: 'Pix' };
              addTransactions([newTx]);
              setAndSaveGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g));
            }
          }} onWithdraw={(goalId, amount) => {
            const goal = investmentGoals.find(g => g.id === goalId);
            if (goal) {
              const newTx: Transaction = { id: crypto.randomUUID(), amount, category: 'Investimentos', type: 'income', description: `Retirada do Investimento - ${goal.name}`, date: new Date().toISOString().split('T')[0], paymentMethod: 'Pix' };
              addTransactions([newTx]);
              setAndSaveGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: Math.max(0, g.currentAmount - amount) } : g));
            }
          }} onAddEarning={(goalId, amount) => {
            setAndSaveGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g));
          }} />}
          {activeTab === 'settings' && <SettingsTab budget={budget} totalSalary={totalSalary} onUpdateBudget={setAndSaveBudget} onUpdateSalary={setAndSaveSalary} onRenameCategory={handleUpdateCategoryName} />}
          {activeTab === 'configuration' && <ConfigurationTab preferences={preferences} onUpdatePreferences={setAndSavePreferences} />}
          {activeTab === 'reimbursements' && <ReimbursementsTab transactions={transactions} onReimburse={handleReimburse} onUndoReimburse={handleUndoReimburse} />}
        </main>

        {undoAction && (
          <UndoToast
            message={undoAction.message}
            onUndo={undoAction.undo}
            onClose={() => setUndoAction(null)}
          />
        )}

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLoginSuccess={setUser} />}
      </div>
    </div>
  );

  function updateTransaction(updatedTransaction: Transaction, updateSiblings = false) {
    if (updateSiblings && updatedTransaction.groupId) {
      const baseDescription = updatedTransaction.description.replace(/\(\d+\/\d+\)$/, '').trim();
      setAndSaveTransactions(prev => prev.map(t => {
        if (t.groupId === updatedTransaction.groupId) {
          const suffixMatch = t.description.match(/\(\d+\/\d+\)$/);
          const suffix = suffixMatch ? suffixMatch[0] : '';
          return { ...t, category: updatedTransaction.category, cardName: updatedTransaction.cardName, description: `${baseDescription} ${suffix}`.trim(), isReimbursable: updatedTransaction.isReimbursable, debtorName: updatedTransaction.debtorName };
        }
        return t;
      }));
    } else {
      setAndSaveTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    }
  }
};
export default App;
