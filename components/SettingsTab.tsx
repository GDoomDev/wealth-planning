
import React, { useState, useMemo } from 'react';
import { Budget } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Settings, Plus, Trash2, Edit2, Save, X, Banknote, PieChart, Coins } from 'lucide-react';
import CurrencyInput from './CurrencyInput';

interface Props {
    budget: Budget;
    totalSalary: number;
    onUpdateBudget: (newBudget: Budget | ((prev: Budget) => Budget)) => void;
    onUpdateSalary: (newSalary: number) => void;
    onRenameCategory: (oldName: string, newName: string, newValue: number) => void;
}

const SettingsTab: React.FC<Props> = ({ budget, totalSalary, onUpdateBudget, onUpdateSalary, onRenameCategory }) => {
    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<number>(0);
    const [editName, setEditName] = useState<string>('');

    const totalBudgeted = useMemo(() => {
        // Fixed: Explicitly typed acc to avoid 'unknown' operator error in some TypeScript environments
        return Object.values(budget).reduce((acc: number, val) => acc + (val as number), 0);
    }, [budget]);

    const remainingBalance = totalSalary - totalBudgeted;

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCategory.trim();
        if (!trimmed || budget[trimmed] !== undefined) return;

        // Use functional update to ensure we are working with latest state and not stale props
        onUpdateBudget(prev => {
            if (prev[trimmed] !== undefined) return prev;
            return { ...prev, [trimmed]: 0 };
        });
        setNewCategory('');
    };

    const handleDeleteCategory = (cat: string) => {
        if (window.confirm(`Excluir a categoria "${cat}" do orçamento? Todas as transações nesta categoria permanecerão, mas sem valor orçado.`)) {
            onUpdateBudget(prev => {
                const next = { ...prev };
                delete next[cat];
                return next;
            });
        }
    };

    const startEdit = (cat: string, val: number) => {
        setEditingCategory(cat);
        setEditName(cat);
        setEditValue(val);
    };

    const saveEdit = () => {
        if (!editingCategory) return;

        if (editName !== editingCategory) {
            if (budget[editName] !== undefined) {
                alert('Já existe uma categoria com este nome.');
                return;
            }
            onRenameCategory(editingCategory, editName, editValue);
        } else {
            onUpdateBudget(prev => ({ ...prev, [editingCategory]: editValue }));
        }

        setEditingCategory(null);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <Banknote size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Salário Mensal</span>
                    </div>
                    <CurrencyInput
                        value={totalSalary}
                        onChange={onUpdateSalary}
                        className="w-full text-2xl font-bold text-slate-800 bg-transparent outline-none focus:ring-0 placeholder:text-slate-300"
                        placeholder="R$ 0,00"
                    />
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-2 text-indigo-600">
                        <PieChart size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Total Orçado</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        {formatCurrency(totalBudgeted)}
                    </p>
                </div>
                <div className={`p-5 rounded-2xl shadow-sm border ${remainingBalance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className={`flex items-center gap-2 mb-2 ${remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        <Coins size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Saldo Livre</span>
                    </div>
                    <p className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(remainingBalance)}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Settings className="text-slate-400" /> <span>Definição de Metas por Categoria</span>
                </h2>

                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <input
                        type="text"
                        placeholder="Nova Categoria"
                        className="flex-1 p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto">
                        Adicionar
                    </button>
                </form>

                <div className="space-y-3">
                    {Object.entries(budget).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, val]) => (
                        <div key={cat} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-shadow gap-3">
                            {editingCategory === cat ? (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full animate-in fade-in">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 p-2 border border-indigo-300 rounded-lg text-sm"
                                    />
                                    <CurrencyInput
                                        value={editValue}
                                        onChange={setEditValue}
                                        className="w-full sm:w-40 p-2 border border-indigo-300 rounded-lg text-sm text-right font-bold text-indigo-600"
                                    />
                                    <div className="flex gap-1 justify-end">
                                        <button onClick={saveEdit} className="bg-emerald-100 text-emerald-700 p-2.5 rounded-lg hover:bg-emerald-200"><Save size={18} /></button>
                                        <button onClick={() => setEditingCategory(null)} className="bg-slate-100 text-slate-500 p-2.5 rounded-lg hover:bg-slate-200"><X size={18} /></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="bg-indigo-50 p-2 rounded-lg">
                                            <PieChart size={20} className="text-indigo-500" />
                                        </div>
                                        <span className="font-bold text-slate-700">{cat}</span>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-4 justify-between sm:justify-end w-full sm:w-auto">
                                        <span className="text-lg font-bold text-slate-800">{formatCurrency(val as number)}</span>
                                        <div className="flex items-center gap-1 sm:border-l sm:pl-4 border-slate-100">
                                            <button onClick={() => startEdit(cat, val as number)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDeleteCategory(cat)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SettingsTab;
