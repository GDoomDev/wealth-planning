
import React, { useMemo, useState } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { CreditCard, Calendar, Edit2, X, Layers, Plus, User, Zap, Trash2, Save } from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import DateInput from './DateInput';

interface Props {
  transactions: Transaction[];
  onUpdateGroup: (groupId: string, newTitle: string, newStartDate: string, newCount: number, newTotalAmount: number, newCategory: string, newPaymentMethod: string, isReimbursable?: boolean, debtorName?: string) => void;
  onAddGroup: (title: string, category: string, paymentMethod: string, date: string, count: number, totalAmount: number, isReimbursable: boolean, debtorName?: string) => void;
  onAnticipateGroup: (groupId: string, discountedAmount: number, numToAdvance: number) => void;
  onDeleteGroup: (groupId: string) => void;
  categories: string[];
  paymentMethods: PaymentMethod[];
}

interface InstallmentGroup {
  groupId: string;
  description: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: Transaction[];
  startDate: string;
  endDate: string;
  progress: number;
  category: string;
  paymentMethod: string;
}

const InstallmentsTab: React.FC<Props> = ({ transactions, onUpdateGroup, onAddGroup, onAnticipateGroup, onDeleteGroup, categories, paymentMethods }) => {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [anticipatingGroup, setAnticipatingGroup] = useState<InstallmentGroup | null>(null);
  const [discountedValue, setDiscountedValue] = useState(0);
  const [numToAdvance, setNumToAdvance] = useState(1);

  // States para o modo de edição
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCount, setEditCount] = useState(0);
  const [editTotal, setEditTotal] = useState(0);
  const [editCategory, setEditCategory] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editIsReimbursable, setEditIsReimbursable] = useState(false);
  const [editDebtorName, setEditDebtorName] = useState('');

  const [createForm, setCreateForm] = useState({
    title: '',
    category: categories[0] || 'Outros',
    paymentMethod: paymentMethods[0]?.name || 'Cartão de Crédito',
    date: new Date().toISOString().split('T')[0],
    count: 2,
    totalAmount: 0,
    installmentAmount: 0,
    isReimbursable: false,
    debtorName: ''
  });

  const groups = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach(t => { if (t.groupId) { if (!grouped[t.groupId]) grouped[t.groupId] = []; grouped[t.groupId].push(t); } });
    return Object.entries(grouped).map(([groupId, txs]) => {
      const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const today = new Date().toISOString().split('T')[0];
      const totalAmount = sorted.reduce((sum, t) => sum + t.amount, 0);
      const paid = sorted.filter(t => t.date <= today).reduce((sum, t) => sum + t.amount, 0);
      return {
        groupId,
        description: first.description.replace(/\(\d+\/\d+\)$/, '').trim(),
        totalAmount,
        paidAmount: paid,
        remainingAmount: totalAmount - paid,
        installments: sorted,
        startDate: first.date,
        endDate: sorted[sorted.length - 1].date,
        progress: totalAmount > 0 ? (paid / totalAmount) * 100 : 0,
        category: first.category,
        paymentMethod: first.paymentMethod
      };
    }).sort((a, b) => b.endDate.localeCompare(a.endDate));
  }, [transactions]);

  const handleStartEdit = (group: InstallmentGroup) => {
    setEditingGroupId(group.groupId);
    setEditTitle(group.description);
    setEditDate(group.startDate);
    setEditCount(group.installments.length);
    setEditTotal(group.totalAmount);
    setEditCategory(group.category);
    setEditPaymentMethod(group.paymentMethod);
    setEditIsReimbursable(!!group.installments[0].isReimbursable);
    setEditDebtorName(group.installments[0].debtorName || '');
  };

  const handleSaveEdit = (groupId: string) => {
    onUpdateGroup(groupId, editTitle, editDate, editCount, editTotal, editCategory, editPaymentMethod, editIsReimbursable, editDebtorName);
    setEditingGroupId(null);
  };

  const handleStartAnticipation = (group: InstallmentGroup) => {
    const today = new Date().toISOString().split('T')[0];
    const futureInstallments = group.installments.filter(t => t.date > today);
    setAnticipatingGroup(group);
    setNumToAdvance(futureInstallments.length);
    const nominalValue = futureInstallments.reduce((acc, t) => acc + t.amount, 0);
    setDiscountedValue(nominalValue);
  };

  const confirmAnticipation = () => {
    if (anticipatingGroup) {
      onAnticipateGroup(anticipatingGroup.groupId, discountedValue, numToAdvance);
      setAnticipatingGroup(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Layers className="text-indigo-600" /> Gestão de Parcelamentos</h2><p className="text-sm text-slate-500">Acompanhe e projete suas compras parceladas.</p></div>
        <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"><Plus size={18} /> Novo Parcelamento</button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-700">Adicionar Compra Parcelada</h3><button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button></div>
            <form onSubmit={e => { e.preventDefault(); onAddGroup(createForm.title, createForm.category, createForm.paymentMethod, createForm.date, createForm.count, createForm.totalAmount, createForm.isReimbursable, createForm.debtorName); setShowCreateModal(false); }} className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrição</label><input required type="text" className="w-full p-2 border border-slate-300 rounded text-sm bg-white" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Categoria</label><select className="w-full p-2 border border-slate-300 rounded text-sm bg-white" value={createForm.category} onChange={e => setCreateForm({ ...createForm, category: e.target.value })}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Meio de Pagamento</label><select className="w-full p-2 border border-slate-300 rounded text-sm bg-white" value={createForm.paymentMethod} onChange={e => setCreateForm({ ...createForm, paymentMethod: e.target.value })}>{paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data da 1ª Parcela</label>
                  <DateInput value={createForm.date} onChange={val => setCreateForm({ ...createForm, date: val })} className="w-full p-2 border border-slate-300 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div><label className="text-[10px] text-indigo-600 block mb-1">Nº Parcelas</label><input type="number" min="2" className="w-full p-1.5 border border-indigo-200 rounded text-sm text-center font-bold bg-white" value={createForm.count} onChange={e => { const c = Math.max(1, Number(e.target.value)); setCreateForm({ ...createForm, count: c, installmentAmount: createForm.totalAmount / c }); }} /></div>
                <div><label className="text-[10px] text-indigo-600 block mb-1">Total</label><CurrencyInput value={createForm.totalAmount} onChange={val => setCreateForm({ ...createForm, totalAmount: val, installmentAmount: val / createForm.count })} className="w-full p-1.5 border border-indigo-200 rounded text-sm bg-white font-bold" /></div>
                <div><label className="text-[10px] text-indigo-600 block mb-1">Por Mês</label><CurrencyInput value={createForm.installmentAmount} onChange={val => setCreateForm({ ...createForm, installmentAmount: val, totalAmount: val * createForm.count })} className="w-full p-1.5 border border-indigo-200 rounded text-sm bg-white font-bold text-indigo-700" /></div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-100 flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={createForm.isReimbursable} onChange={e => setCreateForm({ ...createForm, isReimbursable: e.target.checked })} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  É reembolsável?
                </label>
                {createForm.isReimbursable && (
                  <div className="flex items-center gap-2 flex-1 animate-in slide-in-from-left-2">
                    <User size={14} className="text-slate-400" />
                    <input type="text" placeholder="Quem deve pagar?" value={createForm.debtorName || ''} onChange={e => setCreateForm({ ...createForm, debtorName: e.target.value })} className="flex-1 p-1 text-sm border-b border-slate-200 outline-none focus:border-indigo-500" />
                  </div>
                )}
              </div>
              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Criar Parcelamento</button>
            </form>
          </div>
        </div>
      )}

      {anticipatingGroup && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50 text-emerald-800">
              <h3 className="font-bold flex items-center gap-2"><Zap size={18} /> Antecipar Parcelas</h3>
              <button onClick={() => setAnticipatingGroup(null)} className="text-emerald-400 hover:text-red-500"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Você está antecipando parcelas de <strong>{anticipatingGroup.description}</strong>.
              </p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Parcelas a Antecipar</label>
                <input
                  type="number"
                  min="1"
                  max={anticipatingGroup.installments.filter(t => t.date > new Date().toISOString().split('T')[0]).length}
                  className="w-full p-2 border border-slate-300 rounded text-sm bg-white"
                  value={numToAdvance}
                  onChange={e => setNumToAdvance(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Valor Total com Desconto</label>
                <CurrencyInput
                  value={discountedValue}
                  onChange={setDiscountedValue}
                  className="w-full p-2 border border-slate-300 rounded text-sm bg-white font-bold text-emerald-600"
                />
              </div>
              <button
                onClick={confirmAnticipation}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md"
              >
                Confirmar Antecipação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {groups.map(group => {
          const isEditing = editingGroupId === group.groupId;
          const isFinished = group.progress >= 100;
          const futureCount = group.installments.filter(t => t.date > new Date().toISOString().split('T')[0]).length;

          return (
            <div key={group.groupId} className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all ${isFinished && !isEditing ? 'opacity-75 grayscale-[0.5]' : ''}`}>
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Editando Parcelamento</span>
                      <button onClick={() => setEditingGroupId(null)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-bold ml-1">Descrição</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase font-bold ml-1">Categoria</label>
                        <select
                          className="w-full p-2 border border-slate-200 rounded text-xs bg-white outline-none"
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value)}
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase font-bold ml-1">Método</label>
                        <select
                          className="w-full p-2 border border-slate-200 rounded text-xs bg-white outline-none"
                          value={editPaymentMethod}
                          onChange={e => setEditPaymentMethod(e.target.value)}
                        >
                          {paymentMethods.map(pm => <option key={pm.id} value={pm.name}>{pm.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-bold ml-1">Data de Início</label>
                      <DateInput
                        value={editDate}
                        onChange={val => setEditDate(val)}
                        className="w-full p-2 border border-slate-200 rounded text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase font-bold ml-1">Valor Total</label>
                        <CurrencyInput value={editTotal} onChange={setEditTotal} className="w-full p-2 border border-slate-200 rounded text-xs font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-400 uppercase font-bold ml-1">Qtd. Parcelas</label>
                        <input type="number" value={editCount} onChange={e => setEditCount(Math.max(1, Number(e.target.value)))} className="w-full p-2 border border-slate-200 rounded text-xs font-bold" />
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={editIsReimbursable} onChange={e => setEditIsReimbursable(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        É reembolsável?
                      </label>
                      {editIsReimbursable && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
                          <User size={12} className="text-slate-400" />
                          <input type="text" placeholder="Quem deve pagar?" value={editDebtorName} onChange={e => setEditDebtorName(e.target.value)} className="flex-1 p-1 text-xs border-b border-indigo-200 outline-none focus:border-indigo-500 bg-transparent" />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setEditingGroupId(null)} className="flex-1 py-2 text-slate-500 text-xs font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                      <button
                        onClick={() => handleSaveEdit(group.groupId)}
                        className="flex-[2] flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-all"
                      >
                        <Save size={14} /> Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-800 text-lg truncate pr-2">{group.description}</h3>
                      <div className="flex items-center gap-1">
                        {!isFinished && futureCount > 0 && (
                          <button onClick={() => handleStartAnticipation(group)} className="p-1.5 text-slate-300 hover:text-emerald-500 transition-colors" title="Antecipar"><Zap size={16} /></button>
                        )}
                        <button onClick={() => handleStartEdit(group)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors" title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => onDeleteGroup(group.groupId)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-4">
                      <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><CreditCard size={12} /> {group.installments.length}x</span>
                      <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Calendar size={12} /> {formatDateBR(group.startDate)}</span>
                      <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{group.paymentMethod}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-indigo-500" style={{ width: `${group.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                      <span>Pago: {formatCurrency(group.paidAmount)}</span>
                      <span>Total: {formatCurrency(group.totalAmount)}</span>
                    </div>
                    {group.installments[0].isReimbursable && (
                      <div className="mt-2 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded flex items-center gap-1">
                        <User size={10} /> Reembolsável por: {group.installments[0].debtorName || 'N/A'}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InstallmentsTab;
