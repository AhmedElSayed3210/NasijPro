import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { dashboardAPI } from '../../services/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';

export default function Dashboard() {
    const { isOnline, loading } = useApp();
    const [summary, setSummary] = useState(null);
    const [efficiency, setEfficiency] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [summaryData, efficiencyData, transactionsData] = await Promise.all([
                dashboardAPI.getSummary(),
                dashboardAPI.getEfficiency(),
                dashboardAPI.getRecentTransactions(5),
            ]);
            setSummary(summaryData);
            setEfficiency(efficiencyData);
            setRecentTransactions(transactionsData);
            setError(null);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setError('فشل في تحميل بيانات لوحة التحكم. تأكد من تشغيل الخادم.');
        }
    };

    if (loading) {
        return <div className="text-center py-12">جاري التحميل...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="bg-red-100 text-red-800 p-6 rounded-lg inline-block">
                    <p className="font-bold mb-2">{error}</p>
                    <button onClick={loadDashboardData} className="btn-primary mt-4">إعادة المحاولة</button>
                </div>
            </div>
        );
    }

    if (!summary) {
        return <div className="text-center py-12">لا توجد بيانات لعرضها.</div>;
    }

    const financialData = [
        { name: 'الإيرادات', value: summary.finance.total_income },
        { name: 'المصروفات', value: summary.finance.total_expenses },
    ];

    const COLORS = ['#10b981', '#ef4444'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">لوحة التحكم</h1>
                {!isOnline && (
                    <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                        ⚠️ وضع عدم الاتصال
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">إجمالي الآلات</p>
                            <h3 className="text-3xl font-bold mt-2">{summary.machines.total}</h3>
                            <p className="text-blue-100 text-sm mt-1">نشطة: {summary.machines.active}</p>
                        </div>
                        <Activity size={48} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm">إجمالي الإيرادات</p>
                            <h3 className="text-3xl font-bold mt-2">{summary.finance.total_income.toLocaleString('ar-EG')} ج.م</h3>
                            <p className="text-green-100 text-sm mt-1">الشهر الحالي</p>
                        </div>
                        <TrendingUp size={48} className="opacity-80" />
                    </div>
                </div>

                <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm">إجمالي المصروفات</p>
                            <h3 className="text-3xl font-bold mt-2">{summary.finance.total_expenses.toLocaleString('ar-EG')} ج.م</h3>
                            <p className="text-red-100 text-sm mt-1">الشهر الحالي</p>
                        </div>
                        <TrendingDown size={48} className="opacity-80" />
                    </div>
                </div>

                <div className={`card bg-gradient-to-br ${summary.finance.net_profit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600'} text-white`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white text-sm opacity-90">صافي الربح</p>
                            <h3 className="text-3xl font-bold mt-2">{summary.finance.net_profit.toLocaleString('ar-EG')} ج.م</h3>
                            <p className="text-white text-sm mt-1 opacity-90">الشهر الحالي</p>
                        </div>
                        <DollarSign size={48} className="opacity-80" />
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Machine Efficiency Chart */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">كفاءة الآلات (ساعات العمل)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={efficiency}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="machine_number" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total_hours" fill="#3b82f6" name="ساعات العمل" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Financial Summary Chart */}
                <div className="card">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">الملخص المالي</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={financialData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value.toLocaleString('ar-EG')}`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {financialData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4 text-gray-800">آخر المعاملات</h2>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>النوع</th>
                                <th>الفئة</th>
                                <th>المبلغ</th>
                                <th>التاريخ</th>
                                <th>الوصف</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTransactions.map((transaction) => (
                                <tr key={transaction.id}>
                                    <td>
                                        <span className={`px-3 py-1 rounded-full text-sm ${transaction.transaction_type === 'INCOME'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {transaction.transaction_type === 'INCOME' ? 'إيراد' : 'مصروف'}
                                        </span>
                                    </td>
                                    <td>{transaction.category}</td>
                                    <td className="font-semibold">{parseFloat(transaction.amount).toLocaleString('ar-EG')} ج.م</td>
                                    <td>{new Date(transaction.transaction_date).toLocaleDateString('ar-EG')}</td>
                                    <td className="text-gray-600">{transaction.description || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
