import React, { useState } from 'react';
import { loginUser, registerUser, resetPassword, isFirebaseReady } from '../services/firebase';
import { Lock, Mail, LogIn, UserPlus, AlertCircle, X, CloudOff, CheckCircle2, ChevronLeft } from 'lucide-react';

interface Props {
    onClose: () => void;
    onLoginSuccess: (user: any) => void;
}

const AuthModal: React.FC<Props> = ({ onClose, onLoginSuccess }) => {
    const [step, setStep] = useState<'login' | 'register' | 'forgot'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFirebaseReady()) {
            setError("O servidor não está conectado. Contate o administrador do sistema (Configure o firebase.ts).");
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            if (step === 'forgot') {
                await resetPassword(email);
                setMessage("Email de recuperação enviado! Verifique sua caixa de entrada.");
            } else {
                let userCred;
                if (step === 'login') {
                    userCred = await loginUser(email, password);
                } else {
                    userCred = await registerUser(email, password);
                }
                onLoginSuccess(userCred.user);
                onClose();
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') setError("Email ou senha incorretos.");
            else if (err.code === 'auth/email-already-in-use') setError("Este email já está cadastrado.");
            else if (err.code === 'auth/weak-password') setError("A senha deve ter pelo menos 6 caracteres.");
            else if (err.code === 'auth/user-not-found') setError("Usuário não encontrado.");
            else setError("Erro: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {step === 'forgot' && <button onClick={() => setStep('login')} className="p-1 hover:bg-white/20 rounded-full transition-colors mr-1"><ChevronLeft size={20} /></button>}
                            <Lock className="text-indigo-200" />
                            {step === 'login' ? 'Acessar Conta' : step === 'register' ? 'Criar Nova Conta' : 'Recuperar Senha'}
                        </h2>
                        <p className="text-indigo-200 text-sm mt-1">
                            {step === 'forgot' ? 'Enviaremos um link de recuperação para o seu email.' : 'Sincronize seus dados em todos os dispositivos.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-indigo-200 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6">
                    {!isFirebaseReady() && (
                        <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 border border-orange-200">
                            <CloudOff size={16} />
                            <span>Sistema offline. Configure as chaves no código fonte.</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 border border-red-200">
                            <AlertCircle size={16} className="flex-shrink-0" /> <span>{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 border border-emerald-200">
                            <CheckCircle2 size={16} className="flex-shrink-0" /> <span>{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {step !== 'forgot' && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Senha</label>
                                    {step === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => setStep('forgot')}
                                            className="text-[10px] text-indigo-600 font-bold hover:underline"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="password"
                                        required
                                        className="w-full pl-9 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="******"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 shadow-sm transition-all disabled:opacity-70">
                            {loading ? 'Processando...' : (step === 'login' ? <><LogIn size={18} /> Entrar</> : step === 'register' ? <><UserPlus size={18} /> Cadastrar</> : <><Mail size={18} /> Enviar Email de Recuperação</>)}
                        </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center gap-4 text-xs">
                        {step === 'login' && (
                            <p className="text-slate-500">
                                Não tem uma conta? <button onClick={() => setStep('register')} className="text-indigo-600 font-bold hover:underline">Cadastre-se</button>
                            </p>
                        )}
                        {(step === 'register' || step === 'forgot') && (
                            <p className="text-slate-500">
                                Já tem conta? <button onClick={() => setStep('login')} className="text-indigo-600 font-bold hover:underline">Faça Login</button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;