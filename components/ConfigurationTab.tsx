import React from 'react';
import { UserPreferences } from '../types';
import { Settings2, CalendarClock, CalendarDays } from 'lucide-react';

interface Props {
    preferences: UserPreferences;
    onUpdatePreferences: (newPreferences: UserPreferences) => void;
}

const ConfigurationTab: React.FC<Props> = ({ preferences, onUpdatePreferences }) => {

    const handleLogicChange = (logic: 'transaction_date' | 'closing_day') => {
        onUpdatePreferences({
            ...preferences,
            creditCardLogic: logic
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                        <Settings2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Preferências do Sistema</h2>
                        <p className="text-sm text-slate-500">Configure como o sistema processa suas informações</p>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Credit Card Logic Section */}
                    <section>
                        <h3 className="text-sm font-extrabold uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-2">
                            <CalendarClock size={16} /> Contabilização de Cartão de Crédito
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleLogicChange('transaction_date')}
                                className={`flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all ${preferences.creditCardLogic === 'transaction_date'
                                        ? 'border-indigo-600 bg-indigo-50/50'
                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className={`font-bold ${preferences.creditCardLogic === 'transaction_date' ? 'text-indigo-700' : 'text-slate-700'}`}>
                                        Data da Compra
                                    </span>
                                    {preferences.creditCardLogic === 'transaction_date' && (
                                        <div className="w-4 h-4 rounded-full bg-indigo-600 border-4 border-indigo-100" />
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    As despesas entram no mês exato em que a compra foi realizada.
                                    <br />
                                    <span className="opacity-70 mt-1 block italic">Ex: Compra dia 28/jan entra em Janeiro.</span>
                                </p>
                            </button>

                            <button
                                onClick={() => handleLogicChange('closing_day')}
                                className={`flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all ${preferences.creditCardLogic === 'closing_day'
                                        ? 'border-indigo-600 bg-indigo-50/50'
                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className={`font-bold ${preferences.creditCardLogic === 'closing_day' ? 'text-indigo-700' : 'text-slate-700'}`}>
                                        Vencimento da Fatura
                                    </span>
                                    {preferences.creditCardLogic === 'closing_day' && (
                                        <div className="w-4 h-4 rounded-full bg-indigo-600 border-4 border-indigo-100" />
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    As despesas respeitam o fechamento da fatura e entram no mês do vencimento.
                                    <br />
                                    <span className="opacity-70 mt-1 block italic">Ex: Compra dia 28/jan (fatura fecha dia 25) entra em Fevereiro.</span>
                                </p>
                            </button>
                        </div>

                        <div className="mt-4 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-xl text-sm border border-amber-100">
                            <CalendarDays className="shrink-0 mt-0.5" size={18} />
                            <p>
                                Esta configuração altera como os gastos aparecem no Dashboard e nas Listas de Transações.
                                Certifique-se de configurar corretamente o <strong>Dia de Fechamento</strong> e o <strong>Dia de Vencimento</strong> dos seus cartões na aba "Meios de Pagamento".
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationTab;
