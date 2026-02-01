import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authAPI } from '../../services/api';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
    const { handleLogin } = useApp();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await authAPI.login(formData);
            handleLogin(data.user, data.token);
        } catch (err) {
            setError(err.message || 'فشل تسجيل الدخول');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <LogIn className="text-white w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2">نظام إدارة مصنع النسيج</h1>
                    <p className="text-blue-200">الرجاء تسجيل الدخول للمتابعة</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-100 text-sm animate-shake">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-blue-200 text-sm font-medium mb-2 mr-1">اسم المستخدم</label>
                        <div className="relative group">
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-blue-300/30"
                                placeholder="أدخل اسم المستخدم"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-blue-200 text-sm font-medium mb-2 mr-1">كلمة المرور</label>
                        <div className="relative group">
                            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-blue-300/30"
                                placeholder="أدخل كلمة المرور"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'دخول للنظام'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-blue-300 text-sm">
                        ليس لديك حساب؟{' '}
                        <button
                            onClick={() => window.location.hash = '#register'}
                            className="text-white font-bold hover:underline"
                        >
                            سجل الآن لطلب الوصول
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
