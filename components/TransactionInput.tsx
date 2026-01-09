
import React, { useState, useRef } from 'react';
import { parseTransactionFromText } from '../services/geminiService';
import { Transaction, InvestmentGoal, TransactionType, PaymentMethod } from '../types';
import { Send, Loader2, Sparkles, Upload, FileText, X, PlusCircle, User } from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import DateInput from './DateInput';
import * as XLSX from 'xlsx';

interface Props {
  onAddTransactions: (transactions: Transaction[]) => void;
  investmentGoals: InvestmentGoal[];
  categories: string[];
  paymentMethods: PaymentMethod[];
}

const TransactionInput: React.FC<Props> = ({ onAddTransactions, investmentGoals, categories, paymentMethods }) => {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<{ message: string; originalInput: string } | null>(null);
  const [clarificationResponse, setClarificationResponse] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [manualForm, setManualForm] = useState<Partial<Transaction>>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: categories[0] || 'Outros',
    paymentMethod: paymentMethods[0]?.name || 'Pix',
    amount: 0,
    isReimbursable: false,
    debtorName: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = async (text: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await parseTransactionFromText(text, investmentGoals, paymentMethods);
      if (result.status === 'need_clarification' && result.clarificationMessage) {
        setClarification({ message: result.clarificationMessage, originalInput: text });
        setIsProcessing(false);
        return;
      }
      const newTransactions: Transaction[] = (result.transactions || []).map(t => ({
        ...t,
        id: crypto.randomUUID(),
      }));
      if (newTransactions.length > 0) {
        onAddTransactions(newTransactions);
        setInput('');
        setClarification(null);
      } else {
        setError("Não identifiquei transações. Tente ser mais específico.");
      }
    } catch (err) {
      setError("Ocorreu um erro ao processar com a IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.description || !manualForm.amount) return;
    onAddTransactions([{
      ...manualForm as Transaction,
      id: crypto.randomUUID(),
      type: manualForm.type as TransactionType || 'expense',
      isReimbursed: false
    }]);
    setShowManual(false);
    setManualForm({ type: 'expense', date: new Date().toISOString().split('T')[0], category: categories[0] || 'Outros', paymentMethod: paymentMethods[0]?.name || 'Pix', amount: 0, isReimbursable: false, debtorName: '' });
  };

  return (
    <>
      {clarification && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-white relative">
              <button onClick={() => setClarification(null)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
              <h3 className="text-xl font-bold">O Assistente tem uma dúvida</h3>
              <div className="bg-white/10 border border-white/20 p-5 rounded-2xl mt-4"><p className="text-lg font-medium italic">"{clarification.message}"</p></div>
            </div>
            <div className="p-8 bg-slate-50">
              <textarea autoFocus value={clarificationResponse} onChange={(e) => setClarificationResponse(e.target.value)} placeholder="Sua resposta..." className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none h-32 resize-none shadow-sm transition-all" />
              <div className="flex items-center justify-between gap-4 mt-6">
                <button onClick={() => setClarification(null)} className="px-6 py-3 text-slate-500 font-bold">Cancelar</button>
                <button onClick={() => processText(`Contexto: ${clarification.originalInput}. Resposta: ${clarificationResponse}`)} className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3">
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} /><span>Enviar Resposta</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-600 font-semibold"><Sparkles size={20} /><h2>Assistente Financeiro</h2></div>
          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const content = file.name.endsWith('.xlsx') ? XLSX.utils.sheet_to_csv(XLSX.read(await file.arrayBuffer()).Sheets[XLSX.read(await file.arrayBuffer()).SheetNames[0]]) : await file.text();
              processText(`Importe estas transações:\n${content.slice(0, 10000)}`);
            }} />
            <button onClick={() => setShowManual(!showManual)} className="text-xs flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg font-medium transition-colors"><PlusCircle size={14} /> Manual</button>
            <button onClick={() => fileInputRef.current?.click()} className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition-colors"><Upload size={14} /> Importar</button>
          </div>
        </div>

        {showManual ? (
          <form onSubmit={handleManualSubmit} className="bg-slate-50 p-6 rounded-xl border border-indigo-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Input Manual</span><button type="button" onClick={() => setShowManual(false)} className="text-slate-400 hover:text-red-500"><X size={16} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required type="text" placeholder="Descrição" value={manualForm.description || ''} onChange={e => setManualForm({ ...manualForm, description: e.target.value })} className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
              <CurrencyInput value={manualForm.amount || 0} onChange={val => setManualForm({ ...manualForm, amount: val })} className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <select className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white" value={manualForm.type} onChange={e => setManualForm({ ...manualForm, type: e.target.value as any })}>
                <option value="expense">Despesa</option><option value="income">Receita</option><option value="investment">Investimento</option>
              </select>
              <select className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white" value={manualForm.category} onChange={e => setManualForm({ ...manualForm, category: e.target.value })}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white" value={manualForm.paymentMethod} onChange={e => setManualForm({ ...manualForm, paymentMethod: e.target.value })}>
                {paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
              </select>
              <DateInput value={manualForm.date || ''} onChange={val => setManualForm({ ...manualForm, date: val })} className="p-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-100 flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={manualForm.isReimbursable} onChange={e => setManualForm({ ...manualForm, isReimbursable: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                É reembolsável?
              </label>
              {manualForm.isReimbursable && (
                <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left-2">
                  <User size={14} className="text-slate-400" />
                  <input type="text" placeholder="Quem deve pagar?" value={manualForm.debtorName || ''} onChange={e => setManualForm({ ...manualForm, debtorName: e.target.value })} className="flex-1 p-1 text-sm border-b border-slate-200 outline-none focus:border-indigo-500" />
                </div>
              )}
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md">Adicionar Transação</button>
          </form>
        ) : (
          <form onSubmit={e => { e.preventDefault(); if (input.trim()) processText(input); }} className="relative">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ex: Paguei 50 no almoço usando Nubank." className="w-full p-4 pr-14 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white outline-none h-24 text-slate-800 placeholder:text-slate-400 resize-none transition-all" disabled={isProcessing} />
            <button type="submit" disabled={isProcessing || !input.trim()} className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
        <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1"><FileText size={12} /> A IA entende seus meios de pagamento e cartões cadastrados.</p>
      </div>
    </>
  );
};

export default TransactionInput;
