
export type TransactionType = 'expense' | 'income' | 'investment';
export type PaymentMethodType = 'credit_card' | 'other';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  closingDay?: number; // Apenas para cartões
  dueDay?: number;     // Apenas para cartões
  color?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  paymentMethod: string; // Nome ou ID do Meio de Pagamento
  cardName?: string; 
  type: TransactionType;
  description: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  isReimbursable?: boolean; 
  isReimbursed?: boolean;   
  debtorName?: string; 
  relatedTransactionId?: string; 
  groupId?: string; 
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  category: string;
  paymentMethod: string;
  startDate: string; // ISO Date string (YYYY-MM-DD)
  activeUntil?: string | null; // ISO Date string or null for indefinite
  isIndefinite: boolean;
  cardName?: string;
  isReimbursable?: boolean;
  debtorName?: string;
}

export interface Budget {
  [category: string]: number;
}

export interface PlanningProfile {
  id: string;
  month: string; // YYYY-MM
  expectedIncome: number;
  plannedExpenses: Budget;
}

export interface InvestmentGoal {
  id: string;
  name: string; 
  targetAmount: number; 
  currentAmount: number; 
  category: string; 
  deadline?: string; 
  color?: string;
  linkedTransactionIds?: string[]; 
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  balance: number;
}

export interface AiInsight {
  prediction: string;
  remainingBudgetAnalysis: string;
  anomalies: string[];
  advice: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
