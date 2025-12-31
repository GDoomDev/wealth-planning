
import React, { useState, useMemo } from 'react';
import { Subscription, Transaction, PaymentMethod } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { Plus, X, Repeat, Calendar, Trash2, ShoppingBag, CreditCard, Edit2, Save, PowerOff, RefreshCw, AlertCircle, User, Infinity } from 'lucide-react';
import CurrencyInput from './CurrencyInput';

interface Props {
  subscriptions: Subscription[];
  transactions: Transaction[];
  onAddSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onUpdateSubscription: (sub: Subscription) => void;
  categories: string[];
  paymentMethods: PaymentMethod[];
}

const SubscriptionsTab: React.FC<Props> = ({ subscriptions, transactions, onAddSubscription, onDeleteSubscription, onUpdateSubscription, categories, paymentMethods }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  
  const initialFormState: Partial<Subscription> = {
    name: '',
    amount: 0,
    category: categories[0] || 'Outros',
    paymentMethod: paymentMethods[0]?.name || 'Cartão de Crédito',
    startDate: new Date().toISOString().split('T')[0],
    isIndefinite: true,
    activeUntil: null,
    isReimbursable: false,
    debtorName: ''
  };

  const [formSub, setFormSub] = useState<Partial<Subscription>>(initialFormState);

  const handleEdit = (sub: Subscription) => {
    setFormSub({ ...sub });
    setEditingSubId(sub.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setEditingSubId(null);
    setShowAddForm(false);
    setFormSub(initialFormState);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSub.name || !formSub.amount) return;
    const subData: Subscription = { 
      id: editingSubId || crypto.randomUUID(), 
      name: formSub.name || '', 
      amount: formSub.amount || 0, 
      category: formSub.category || 'Outros', 
      paymentMethod: formSub.paymentMethod || 'Cartão de Crédito', 
      startDate: formSub.startDate || '', 
      isIndefinite: !!formSub.isIndefinite, 
      activeUntil: formSub.isIndefinite ? null : formSub.activeUntil,
      isReimbursable: !!formSub.isReimbursable,
      debtorName: formSub.debtorName || ''
    };
    if (editingSubId) onUpdateSubscription(subData);
    else onAddSubscription(subData);
    
    handleCancel();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div><h2 className="text-xl font-bold text-slate-800">Assinaturas e Serviços</h2><p className="text-sm text-slate-500">Controle de custos fixos recorrentes.</p></div>
          <button 
            onClick={() => { setFormSub(initialFormState); setEditingSubId(null); setShowAddForm(true); }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={18}/> Novo Serviço
          </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-700">{editingSubId ? 'Editar Assinatura' : 'Configurar Assinatura'}</h3>
             <button onClick={handleCancel} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome do Serviço</label>
                <input required placeholder="Netflix, Spotify..." className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={formSub.name} onChange={e=>setFormSub({...formSub, name: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor Mensal</label>
                <CurrencyInput value={formSub.amount || 0} onChange={val=>setFormSub({...formSub, amount: val})} className="w-full p-2 border rounded-lg font-bold bg-white text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoria</label>
                  <select className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={formSub.category} onChange={e=>setFormSub({...formSub, category: e.target.value})}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Meio de Pagamento</label>
                  <select className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={formSub.paymentMethod} onChange={e=>setFormSub({...formSub, paymentMethod: e.target.value})}>{paymentMethods.map(pm=><option key={pm.id} value={pm.name}>{pm.name}</option>)}</select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data de Início</label>
                  <input type="date" className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={formSub.startDate} onChange={e=>setFormSub({...formSub, startDate: e.target.value})}/>
                </div>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-3 text-sm font-bold text-slate-700 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" checked={formSub.isIndefinite} onChange={e=>setFormSub({...formSub, isIndefinite: e.target.checked})}/>
                        <div className="flex items-center gap-1.5"><Infinity size={16} className="text-indigo-400"/> Duração Indeterminada</div>
                    </label>
                    <p className="text-[10px] text-slate-400 ml-7 mt-1">A assinatura continuará sendo projetada mensalmente sem data de término.</p>
                </div>

                {!formSub.isIndefinite && (
                    <div className="space-y-1 animate-in slide-in-from-right-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data de Término</label>
                        <input type="date" className="w-full p-2 border border-indigo-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={formSub.activeUntil || ''} onChange={e=>setFormSub({...formSub, activeUntil: e.target.value})}/>
                    </div>
                )}
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-100 flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={formSub.isReimbursable} onChange={e=>setFormSub({...formSub, isReimbursable: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                    É reembolsável?
                </label>
                {formSub.isReimbursable && (
                    <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left-2">
                        <User size={14} className="text-slate-400" />
                        <input type="text" placeholder="Quem deve pagar?" value={formSub.debtorName || ''} onChange={e=>setFormSub({...formSub, debtorName: e.target.value})} className="flex-1 p-1 text-sm border-b border-slate-200 outline-none focus:border-indigo-500 bg-transparent" />
                    </div>
                )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={handleCancel} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                <Save size={18}/> {editingSubId ? 'Salvar Alterações' : 'Salvar Assinatura'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
          {subscriptions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
               <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4"/>
               <p className="text-slate-400 font-medium">Nenhuma assinatura cadastrada.</p>
            </div>
          ) : (
            subscriptions.map(sub => (
                <div key={sub.id} className="bg-white p-6 rounded-2xl border border-slate-200 flex justify-between items-center group/sub transition-all hover:shadow-md">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><ShoppingBag size={24}/></div>
                        <div>
                          <h4 className="font-bold text-slate-800">{sub.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            <p className="text-xs text-slate-400">{sub.paymentMethod} • Dia {sub.startDate.split('-')[2]}</p>
                            <span className="text-[10px] text-slate-300">•</span>
                            {sub.isIndefinite ? (
                                <span className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1"><Infinity size={10}/> Indeterminada</span>
                            ) : (
                                <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1"><Calendar size={10}/> Até {formatDateBR(sub.activeUntil || '')}</span>
                            )}
                            {sub.isReimbursable && (
                              <>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <User size={10}/> Reembolsável: {sub.debtorName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-extrabold text-slate-900 mr-2">{formatCurrency(sub.amount)}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(sub)} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar"><Edit2 size={18}/></button>
                          <button onClick={() => onDeleteSubscription(sub.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={18}/></button>
                        </div>
                    </div>
                </div>
            ))
          )}
      </div>
    </div>
  );
};

export default SubscriptionsTab;
