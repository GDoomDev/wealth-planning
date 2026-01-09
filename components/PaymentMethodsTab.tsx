
import React, { useState } from 'react';
import { PaymentMethod, PaymentMethodType } from '../types';
import { CreditCard, Plus, Trash2, X, Wallet, Save, Info, Settings2, Calendar, Edit2 } from 'lucide-react';


interface Props {
  paymentMethods: PaymentMethod[];
  onAdd: (pm: PaymentMethod) => void;
  onUpdate: (pm: PaymentMethod) => void;
  onDelete: (id: string) => void;
}

const PaymentMethodsTab: React.FC<Props> = ({ paymentMethods, onAdd, onUpdate, onDelete }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PaymentMethod>>({
    name: '',
    type: 'credit_card',
    closingDay: 1,
    dueDay: 10,
    color: '#6366f1'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editingId) {
      onUpdate({
        ...form as PaymentMethod,
        id: editingId,
      });
    } else {
      onAdd({
        ...form as PaymentMethod,
        id: crypto.randomUUID(),
      });
    }

    setForm({ name: '', type: 'credit_card', closingDay: 1, dueDay: 10, color: '#6366f1' });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleEdit = (pm: PaymentMethod) => {
    setForm(pm);
    setEditingId(pm.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setForm({ name: '', type: 'credit_card', closingDay: 1, dueDay: 10, color: '#6366f1' });
    setEditingId(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CreditCard className="text-indigo-600" /> Meios de Pagamento</h2>
          <p className="text-sm text-slate-500">Cadastre ou edite seus cartões para uma gestão inteligente de faturas.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"><Plus size={18} /> Novo Cartão/Método</button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-700">{editingId ? 'Editar Meio de Pagamento' : 'Configurar Novo Meio'}</h3>
            <button onClick={handleCancel} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome (Ex: Nubank, Itaú...)</label>
                <input required type="text" className="w-full p-2 border border-slate-300 rounded-lg" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                <select className="w-full p-2 border border-slate-300 rounded-lg" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as PaymentMethodType })}>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="other">Outro (Débito, Pix, Dinheiro...)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cor de Destaque</label>
                <input type="color" className="w-full h-10 p-1 border border-slate-300 rounded-lg cursor-pointer" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
            </div>

            {form.type === 'credit_card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Dia de Fechamento</label>
                  <input type="number" min="1" max="31" className="w-full p-2 border border-slate-300 rounded-lg" value={form.closingDay} onChange={e => setForm({ ...form, closingDay: Number(e.target.value) })} />
                  <p className="text-[10px] text-slate-400 mt-1">Compras após este dia caem no mês seguinte.</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Dia de Vencimento</label>
                  <input type="number" min="1" max="31" className="w-full p-2 border border-slate-300 rounded-lg" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: Number(e.target.value) })} />
                </div>
              </div>
            )}

            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md">
              <Save size={18} /> {editingId ? 'Salvar Alterações' : 'Salvar Meio de Pagamento'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paymentMethods.map(pm => (
          <div key={pm.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: `${pm.color}15`, color: pm.color }}>
                  {pm.type === 'credit_card' ? <CreditCard size={24} /> : <Wallet size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{pm.name}</h3>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {pm.type === 'credit_card' ? 'Cartão de Crédito' : 'Outro'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(pm)} className="text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={18} /></button>
                <button onClick={() => onDelete(pm.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>

            {pm.type === 'credit_card' && (
              <div className="bg-slate-50 px-6 py-4 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-slate-500"><Settings2 size={12} /> Fecha dia: <strong className="text-slate-700">{pm.closingDay}</strong></div>
                <div className="flex items-center gap-1.5 text-slate-500"><Calendar size={12} /> Vence dia: <strong className="text-slate-700">{pm.dueDay}</strong></div>
              </div>
            )}

            <div className="p-3 bg-white text-[10px] text-slate-400 flex items-center gap-1.5 italic px-6">
              <Info size={12} /> Usado para classificar o mês financeiro das despesas.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default PaymentMethodsTab;
