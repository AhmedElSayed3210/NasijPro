import { useState } from 'react';
import { authAPI } from '../../services/api';
import { UserPlus, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await authAPI.register(formData);
            setSuccess(true);
        } catch (err) {
            setError(err.message || 'فشل طلب التسجيل');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 p-4">
                <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl text-center">
                    <div className="w-20 h-20 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-green-500/50">
                        <CheckCircle2 className="text-white w-12 h-12" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-4">تم إرسال الطلب بنجاح!</h1>
                    <p className="text-blue-200 mb-8 leading-relaxed">
                        شكراً لتسجيلك. طلبك الآن قيد المراجعة من قبل مدير المصنع. ستتمكن من تسجيل الدخول فور تفعيل حسابك.
                    </p>
                    <button
                        onClick={() => window.location.hash = '#login'}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl border border-white/20 transition-all"
                    >
                        العودة لصفحة الدخول
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 p-4">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <UserPlus className="text-white w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2">طلب حساب جديد</h1>
                    <p className="text-blue-200">املأ البيانات لطلب الوصول للنظام</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-100 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-blue-200 text-sm font-medium mb-2 mr-1">الاسم الكامل</label>
                        <div className="relative group">
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="أدخل اسمك الكامل"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-blue-200 text-sm font-medium mb-2 mr-1">اسم المستخدم</label>
                        <div className="relative group">
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="اختر اسم مستخدم فريد"
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
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                placeholder="أدخل كلمة مرور قوية"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'إرسال طلب التسجيل'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-blue-300 text-sm">
                    <p>
                        لديك حساب بالفعل؟{' '}
                        <button
                            onClick={() => window.location.hash = '#login'}
                            className="text-white font-bold hover:underline"
                        >
                            تسجيل الدخول
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
