import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMethod, Subscription } from '../types';
import { formatCurrency, formatDateBR } from '../utils/formatters';
import { getInvoiceForCard } from '../utils/financeUtils';
import { Receipt, ChevronLeft, ChevronRight, CreditCard, Calendar, DollarSign, FileText } from 'lucide-react';

interface Props {
    transactions: Transaction[];
    paymentMethods: PaymentMethod[];
    subscriptions: Subscription[];
}

const InvoicesTab: React.FC<Props> = ({ transactions, paymentMethods, subscriptions }) => {
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
    const [selectedCardId, setSelectedCardId] = useState<string>('');

    // Filter only credit cards
    const creditCards = useMemo(() =>
        paymentMethods.filter(pm => pm.type === 'credit_card' && pm.closingDay && pm.dueDay),
        [paymentMethods]
    );

    // Auto-select first card if none selected
    React.useEffect(() => {
        if (!selectedCardId && creditCards.length > 0) {
            setSelectedCardId(creditCards[0].id);
        }
    }, [creditCards, selectedCardId]);

    const selectedCard = useMemo(() =>
        creditCards.find(c => c.id === selectedCardId),
        [creditCards, selectedCardId]
    );

    const invoiceData = useMemo(() => {
        if (!selectedCard) return null;
        return getInvoiceForCard(transactions, selectedCard, selectedYear, selectedMonth, subscriptions);
    }, [transactions, selectedCard, selectedYear, selectedMonth]);

    const handlePreviousMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(selectedYear - 1);
        } else {
            setSelectedMonth(selectedMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(selectedYear + 1);
        } else {
            setSelectedMonth(selectedMonth + 1);
        }
    };

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthNamesLong = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    if (creditCards.length === 0) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
                    <CreditCard className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum Cartão Cadastrado</h3>
                    <p className="text-slate-500">Cadastre um cartão de crédito na aba "Meios de Pagamento" para visualizar suas faturas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <Receipt className="text-indigo-600" size={28} />
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Faturas de Cartão</h2>
                        <p className="text-sm text-slate-500">Visualize o detalhamento das suas faturas por período de fechamento</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Cartão</label>
                        <select
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white"
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                        >
                            {creditCards.map(card => (
                                <option key={card.id} value={card.id}>{card.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Navigator */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Mês da Fatura</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousMonth}
                                className="p-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="flex-1 text-center font-bold text-slate-700 p-3 border border-slate-300 rounded-lg bg-slate-50">
                                {monthNamesLong[selectedMonth - 1]} {selectedYear}
                            </div>
                            <button
                                onClick={handleNextMonth}
                                className="p-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Summary */}
            {invoiceData && selectedCard && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <DollarSign size={18} />
                                <span className="text-sm font-medium">Valor Total</span>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(invoiceData.total)}</p>
                            <p className="text-xs mt-1 opacity-75">{invoiceData.transactions.length} transações</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                <Calendar size={18} />
                                <span className="text-sm font-medium">Data de Fechamento</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">{formatDateBR(invoiceData.closingDate)}</p>
                            <p className="text-xs mt-1 text-slate-400">Dia {selectedCard.closingDay} de cada mês</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                <FileText size={18} />
                                <span className="text-sm font-medium">Vencimento</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">{formatDateBR(invoiceData.dueDate)}</p>
                            <p className="text-xs mt-1 text-slate-400">Dia {selectedCard.dueDay} de cada mês</p>
                        </div>
                    </div>

                    {/* Period Info */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Período da fatura:</strong> {formatDateBR(invoiceData.period.startDate)} até {formatDateBR(invoiceData.period.endDate)}
                        </p>
                    </div>

                    {/* Transactions List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Transações da Fatura</h3>
                            <p className="text-xs text-slate-400 mt-1">Compras realizadas no período de fechamento</p>
                        </div>

                        {invoiceData.transactions.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Receipt className="mx-auto mb-3 opacity-30" size={48} />
                                <p>Nenhuma transação encontrada nesta fatura</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {invoiceData.transactions.map(tx => (
                                    <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{tx.description}</p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded">{tx.category}</span>
                                                    <span>{formatDateBR(tx.date)}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-800">{formatCurrency(tx.amount)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Footer Total */}
                        {invoiceData.transactions.length > 0 && (
                            <div className="bg-slate-50 p-6 border-t-2 border-indigo-200">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-700">TOTAL DA FATURA</span>
                                    <span className="text-2xl font-bold text-indigo-600">{formatCurrency(invoiceData.total)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default InvoicesTab;
