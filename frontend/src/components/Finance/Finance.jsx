import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { transactionsAPI } from '../../services/api';
import { Plus, Edit, Trash2, RotateCcw, ArrowUpRight, ArrowDownLeft, DollarSign, Calendar, Search, Filter, User, Settings } from 'lucide-react';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';

export default function Finance() {
    const { machines, customers, user } = useApp();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState(null);
    const [filters, setFilters] = useState({
        transaction_type: '',
        category: '',
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const isAdmin = user?.role === 'ADMIN';

    const [formData, setFormData] = useState({
        transaction_type: 'EXPENSE',
        category: 'Miscellaneous',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        customer_id: '',
        machine_id: '',
        description: '',
    });

    const categories = {
        INCOME: ['Sales', 'Bank Transfer', 'Other Income'],
        EXPENSE: ['Maintenance', 'Salary', 'Electricity', 'Rent', 'Materials', 'Miscellaneous']
    };

    useEffect(() => {
        loadTransactions();
    }, [filters, showDeleted]);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            const data = await transactionsAPI.getAll({
                ...filters,
                showDeleted: isAdmin ? showDeleted : false
            });
            setTransactions(data);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTransaction) {
                const updated = await transactionsAPI.update(editingTransaction.id, formData);
                setTransactions(transactions.map(t => t.id === editingTransaction.id ? {
                    ...updated,
                    customer_name: customers.find(c => c.id === formData.customer_id)?.name,
                    machine_number: machines.find(m => m.id === formData.machine_id)?.machine_number
                } : t));
            } else {
                const newTransaction = await transactionsAPI.create(formData);
                setTransactions([{
                    ...newTransaction,
                    customer_name: customers.find(c => c.id === formData.customer_id)?.name,
                    machine_number: machines.find(m => m.id === formData.machine_id)?.machine_number
                }, ...transactions]);
            }
            resetForm();
        } catch (error) {
            alert('فشل في حفظ المعاملة: ' + error.message);
        }
    };

    const handleDeleteClick = (id) => {
        setTransactionToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!transactionToDelete) return;
        try {
            await transactionsAPI.delete(transactionToDelete);
            if (showDeleted) {
                loadTransactions();
            } else {
                setTransactions(transactions.filter(t => t.id !== transactionToDelete));
            }
            setIsDeleteModalOpen(false);
            setTransactionToDelete(null);
        } catch (error) {
            alert('فشل في حذف المعاملة: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذه المعاملة؟')) return;
        try {
            await transactionsAPI.restore(id);
            alert('تم استعادة المعاملة بنجاح');
            loadTransactions();
        } catch (error) {
            alert('فشل في استعادة المعاملة: ' + error.message);
        }
    };

    const handleEdit = (t) => {
        if (t.is_deleted) {
            alert('لا يمكن تعديل معاملة محذوفة. قم باستعادته أولاً.');
            return;
        }
        if (t.source_id) {
            alert('هذه المعاملة مرتبطة بسجل إنتاج أو صيانة. قم بتعديلها من القسم المختص.');
            return;
        }
        setEditingTransaction(t);
        setFormData({
            transaction_type: t.transaction_type,
            category: t.category,
            amount: t.amount,
            transaction_date: new Date(t.transaction_date).toISOString().split('T')[0],
            customer_id: t.customer_id || '',
            machine_id: t.machine_id || '',
            description: t.description || '',
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            transaction_type: 'EXPENSE',
            category: 'Miscellaneous',
            amount: '',
            transaction_date: new Date().toISOString().split('T')[0],
            customer_id: '',
            machine_id: '',
            description: '',
        });
        setEditingTransaction(null);
        setShowForm(false);
    };

    const totalIncome = transactions
        .filter(t => t.transaction_type === 'INCOME' && !t.is_deleted)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = transactions
        .filter(t => t.transaction_type === 'EXPENSE' && !t.is_deleted)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netBalance = totalIncome - totalExpenses;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">الإدارة المالية (دفتر الأستاذ)</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeletedFin"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeletedFin" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفة
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    إضافة معاملة مالية
                </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-green-100 text-sm font-medium">إجمالي الإيرادات</p>
                            <h3 className="text-3xl font-bold mt-1">+{totalIncome.toLocaleString('ar-EG')} ج.م</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <ArrowUpRight size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-red-500 to-rose-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-red-100 text-sm font-medium">إجمالي المصروفات</p>
                            <h3 className="text-3xl font-bold mt-1">-{totalExpenses.toLocaleString('ar-EG')} ج.م</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <ArrowDownLeft size={32} />
                        </div>
                    </div>
                </div>
                <div className={`card bg-gradient-to-br ${netBalance >= 0 ? 'from-blue-500 to-indigo-600' : 'from-orange-500 to-amber-600'} text-white`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">صافي الرصيد</p>
                            <h3 className="text-3xl font-bold mt-1">{netBalance.toLocaleString('ar-EG')} ج.م</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <DollarSign size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card bg-gray-50 border-gray-200">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium mb-1 text-gray-600">النوع</label>
                        <select
                            value={filters.transaction_type}
                            onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
                            className="input-field"
                        >
                            <option value="">كل الأنواع</option>
                            <option value="INCOME">إيرادات</option>
                            <option value="EXPENSE">مصروفات</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-sm font-medium mb-1 text-gray-600">الفئة</label>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            className="input-field"
                        >
                            <option value="">كل الفئات</option>
                            {[...categories.INCOME, ...categories.EXPENSE].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600">من تاريخ</label>
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600">إلى تاريخ</label>
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                            className="input-field"
                        />
                    </div>
                    <button onClick={loadTransactions} className="btn-secondary flex items-center gap-2 h-[42px]">
                        <Search size={18} />
                        بحث
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>النوع</th>
                                    <th>الفئة</th>
                                    <th>المبلغ</th>
                                    <th>التفاصيل</th>
                                    <th>المرجع</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t) => (
                                    <tr key={t.id} className={t.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}>
                                        <td>
                                            {new Date(t.transaction_date).toLocaleDateString('ar-EG')}
                                            {t.is_deleted && (
                                                <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${t.transaction_type === 'INCOME'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {t.transaction_type === 'INCOME' ? 'إيراد' : 'مصروف'}
                                            </span>
                                        </td>
                                        <td>{t.category}</td>
                                        <td className={`font-bold ${t.transaction_type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.transaction_type === 'INCOME' ? '+' : '-'}{parseFloat(t.amount).toLocaleString('ar-EG')} ج.م
                                        </td>
                                        <td className="max-w-xs truncate text-sm text-gray-600" title={t.description}>
                                            {t.description || '-'}
                                        </td>
                                        <td>
                                            <div className="text-xs space-y-1">
                                                {t.customer_name && <div className="flex items-center gap-1"><User size={12} /> {t.customer_name}</div>}
                                                {t.machine_number && <div className="flex items-center gap-1"><Settings size={12} /> {t.machine_number}</div>}
                                                {!t.customer_name && !t.machine_number && <span className="text-gray-400">عام</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {!t.is_deleted ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(t)}
                                                            className={`text-blue-600 hover:text-blue-800 ${t.source_id ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                            title={t.source_id ? 'لا يمكن تعديل المعاملات التلقائية' : 'تعديل'}
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(t.id)} className="text-red-600 hover:text-red-800" title="حذف">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleRestore(t.id)} className="text-green-600 hover:text-green-800" title="استعادة">
                                                        <RotateCcw size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-gray-500">
                                            لا توجد معاملات مالية مسجلة لهذه الفترة.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                {editingTransaction ? 'تعديل معاملة مالية' : 'إضافة معاملة مالية جديدة'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">نوع المعاملة</label>
                                        <select
                                            value={formData.transaction_type}
                                            onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value, category: categories[e.target.value][0] })}
                                            className="input-field"
                                            required
                                        >
                                            <option value="INCOME">إيراد (+)</option>
                                            <option value="EXPENSE">مصروف (-)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">الفئة</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="input-field"
                                            required
                                        >
                                            {categories[formData.transaction_type].map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">المبلغ (ج.م)</label>
                                        <div className="relative">
                                            <DollarSign className="absolute right-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                className="input-field pr-10"
                                                required
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">التاريخ</label>
                                        <div className="relative">
                                            <Calendar className="absolute right-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="date"
                                                value={formData.transaction_date}
                                                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                                                className="input-field pr-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">العميل المرتبط (اختياري)</label>
                                        <select
                                            value={formData.customer_id}
                                            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="">بدون عميل</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">الآلة المرتبطة (اختياري)</label>
                                        <select
                                            value={formData.machine_id}
                                            onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="">بدون آلة</option>
                                            {machines.map(m => (
                                                <option key={m.id} value={m.id}>{m.machine_number} - {m.machine_type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">الوصف / التفاصيل</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="input-field h-24 pt-2"
                                        placeholder="سجل تفاصيل المعاملة المالية هنا"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end pt-6">
                                    <button type="button" onClick={resetForm} className="btn-secondary">
                                        إلغاء
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingTransaction ? 'حفظ التغييرات' : 'تأكيد وحفظ المعاملة'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="تأكيد حذف المعاملة المالية"
                message="هل أنت متأكد من رغبتك في حذف هذه المعاملة؟ سيتم إخفاؤها من القوائم النشطة، ويمكنك استعادتها لاحقاً من سجل المحذوفات."
            />
        </div>
    );
}
