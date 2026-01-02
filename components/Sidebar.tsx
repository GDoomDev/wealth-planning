import React, { useState } from 'react';
import {
    LayoutDashboard,
    Settings,
    Settings2,
    CreditCard,
    Repeat,
    Layers,
    Calculator,
    TrendingUp,
    Users,
    LogOut,
    LogIn,
    UserCircle,
    ChevronLeft,
    ChevronRight,
    Wallet
} from 'lucide-react';


interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    user?: any;
    onLogout?: () => void;
    onLogin?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, onLogout, onLogin }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'settings', label: 'Orçamento', icon: Settings },
        { id: 'configuration', label: 'Configurações', icon: Settings2 },
        { id: 'payment_methods', label: 'Meios de Pagamento', icon: CreditCard },
        { id: 'subscriptions', label: 'Assinaturas', icon: Repeat },
        { id: 'installments', label: 'Parcelas', icon: Layers },
        { id: 'planning', label: 'Planejamento', icon: Calculator },
        { id: 'investments', label: 'Investimentos', icon: TrendingUp },
        { id: 'reimbursements', label: 'Reembolsos', icon: Users },
    ];


    return (
        <div
            className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 h-screen flex flex-col shadow-sm hidden md:flex transition-all duration-300 ease-in-out relative`}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-9 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-indigo-600 shadow-sm z-50 hover:bg-slate-50 transition-colors"
                title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className="h-4"></div>

            <style>
                {`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}
            </style>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 no-scrollbar">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                                ${isActive
                                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }
                                ${isCollapsed ? 'justify-center' : ''}
                            `}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <item.icon
                                size={20}
                                className={`transition-colors shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                            />
                            {!isCollapsed && (
                                <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                                    {item.label}
                                </span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                    {item.label}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                {user && (
                    <div className="space-y-3">
                        {!isCollapsed && (
                            <div className="flex items-center gap-3 px-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <UserCircle className="text-indigo-600 w-10 h-10 shrink-0" />
                                <div className="overflow-hidden">
                                    <p className="text-xs font-bold text-slate-400 uppercase leading-none mb-1">Logado como</p>
                                    <p className="text-sm font-bold text-slate-700 truncate" title={user.email}>{user.email}</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={onLogout}
                            className={`w-full flex items-center gap-2 text-slate-500 hover:text-red-500 hover:bg-red-50 py-2.5 rounded-lg transition-all text-sm font-medium border border-slate-200 hover:border-red-100
                                ${isCollapsed ? 'justify-center' : 'justify-center'}
                            `}
                            title={isCollapsed ? "Sair da Conta" : undefined}
                        >
                            <LogOut size={18} />
                            {!isCollapsed && <span>Sair da Conta</span>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
