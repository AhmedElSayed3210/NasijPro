import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { productionAPI } from '../../services/api';
import { Plus, Trash2, RotateCcw, Calendar, Search, DollarSign, Package, User, Briefcase, Scale } from 'lucide-react';

export default function Production() {
    const { machines, clients, user } = useApp();
    const [productionLogs, setProductionLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [filters, setFilters] = useState({
        machine_id: '',
        client_id: '',
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const isAdmin = user?.role === 'ADMIN';

    const [formData, setFormData] = useState({
        machine_id: '',
        client_id: '',
        product_name: '',
        weight: '',
        unit: 'kg',
        unit_price: '',
        log_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    useEffect(() => {
        loadLogs();
    }, [filters, showDeleted]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await productionAPI.getAll({
                ...filters,
                showDeleted: isAdmin ? showDeleted : false
            });
            setProductionLogs(data);
        } catch (error) {
            console.error('Failed to load logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const newLog = await productionAPI.create(formData);
            const machine = machines.find(m => m.id === formData.machine_id);
            const client = clients.find(c => c.id === formData.client_id);
            setProductionLogs([{
                ...newLog,
                machine_number: machine?.machine_number,
                client_name: client?.name
            }, ...productionLogs]);
            resetForm();
        } catch (error) {
            alert('فشل في حفظ سجل الإنتاج: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا السجل؟ سيتم حذف العملية المالية المرتبطة به أيضاً.')) return;
        try {
            await productionAPI.delete(id);
            if (showDeleted) {
                loadLogs();
            } else {
                setProductionLogs(productionLogs.filter(s => s.id !== id));
            }
        } catch (error) {
            alert('فشل في حذف السجل: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذا السجل؟ سيتم استعادة العملية المالية المرتبطة به أيضاً.')) return;
        try {
            await productionAPI.restore(id);
            alert('تم استعادة السجل بنجاح');
            loadLogs();
        } catch (error) {
            alert('فشل في استعادة السجل: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            machine_id: '',
            client_id: '',
            product_name: '',
            weight: '',
            unit: 'kg',
            unit_price: '',
            log_date: new Date().toISOString().split('T')[0],
            notes: '',
        });
        setShowForm(false);
    };

    const totalWeightKg = productionLogs
        .filter(s => !s.is_deleted)
        .reduce((sum, s) => {
            const w = parseFloat(s.weight) || 0;
            return sum + (s.unit === 'ton' ? w * 1000 : w);
        }, 0);

    const totalRevenue = productionLogs
        .filter(s => !s.is_deleted)
        .reduce((sum, s) => sum + parseFloat(s.total_amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">سجلات الإنتاج والتصنيع</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeletedProd"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeletedProd" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفة
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    إضافة سجل إنتاج جديد
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-green-100 text-sm font-medium">إجمالي إيرادات الإنتاج</p>
                            <h3 className="text-3xl font-bold mt-1">{totalRevenue.toLocaleString('ar-EG')} ج.م</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <DollarSign size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">إجمالي الوزن المنتج (كجم)</p>
                            <h3 className="text-3xl font-bold mt-1">{totalWeightKg.toLocaleString('ar-EG')} كجم</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Scale size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">عدد السجلات</p>
                            <h3 className="text-3xl font-bold mt-1">{productionLogs.length} سجل</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Package size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card bg-gray-50 border-gray-200">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-1 text-gray-600">الآلة</label>
                        <select
                            value={filters.machine_id}
                            onChange={(e) => setFilters({ ...filters, machine_id: e.target.value })}
                            className="input-field"
                        >
                            <option value="">كل الآلات</option>
                            {machines.map(m => (
                                <option key={m.id} value={m.id}>{m.machine_number} - {m.machine_type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium mb-1 text-gray-600">العميل</label>
                        <select
                            value={filters.client_id}
                            onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
                            className="input-field"
                        >
                            <option value="">كل العملاء</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
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
                    <button onClick={loadLogs} className="btn-secondary flex items-center gap-2 h-[42px]">
                        <Search size={18} />
                        بحث
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="card">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>العميل</th>
                                    <th>نوع القماش</th>
                                    <th>رقم الآلة</th>
                                    <th>الوزن</th>
                                    <th>وحدة القياس</th>
                                    <th>سعر الوحدة</th>
                                    <th>الإجمالي</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productionLogs.map((log) => (
                                    <tr key={log.id} className={log.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}>
                                        <td>
                                            {new Date(log.log_date).toLocaleDateString('ar-EG')}
                                            {log.is_deleted && (
                                                <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                            )}
                                        </td>
                                        <td className="font-semibold">{log.client_name || '-'}</td>
                                        <td>{log.product_name}</td>
                                        <td className="font-mono text-sm">{log.machine_number}</td>
                                        <td>{parseFloat(log.weight).toLocaleString('ar-EG')}</td>
                                        <td>{log.unit === 'kg' ? 'كجم' : 'طن'}</td>
                                        <td>{parseFloat(log.unit_price).toLocaleString('ar-EG')}</td>
                                        <td className="font-bold text-green-600">{parseFloat(log.total_amount).toLocaleString('ar-EG')} ج.م</td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {!log.is_deleted ? (
                                                    <button onClick={() => handleDelete(log.id)} className="text-red-600 hover:text-red-800" title="حذف">
                                                        <Trash2 size={18} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleRestore(log.id)} className="text-green-600 hover:text-green-800" title="استعادة">
                                                        <RotateCcw size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {productionLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="9" className="text-center py-8 text-gray-500">
                                            لا توجد سجلات إنتاج لهذه الفترة.
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
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">إضافة سجل إنتاج جديد</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">العميل</label>
                                        <div className="relative">
                                            <Briefcase className="absolute right-3 top-3 text-gray-400" size={18} />
                                            <select
                                                value={formData.client_id}
                                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                                className="input-field pr-10"
                                                required
                                            >
                                                <option value="">اختر العميل</option>
                                                {clients.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">الآلة</label>
                                        <select
                                            value={formData.machine_id}
                                            onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                                            className="input-field"
                                            required
                                        >
                                            <option value="">اختر الآلة</option>
                                            {machines.map(m => (
                                                <option key={m.id} value={m.id}>{m.machine_number} - {m.machine_type}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">نوع القماش / المنتج</label>
                                    <div className="relative">
                                        <Package className="absolute right-3 top-3 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={formData.product_name}
                                            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                                            className="input-field pr-10"
                                            required
                                            placeholder="مثال: جيرسيه قطن 100%"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">الوزن</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.weight}
                                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                            className="input-field"
                                            required
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">الوحدة</label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="kg">كيلوجرام (كجم)</option>
                                            <option value="ton">طن</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">سعر الوحدة (ج.م)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.unit_price}
                                            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                            className="input-field"
                                            required
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">تاريخ الإنتاج</label>
                                        <div className="relative">
                                            <Calendar className="absolute right-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="date"
                                                value={formData.log_date}
                                                onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
                                                className="input-field pr-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 w-full text-center">
                                            <span className="text-sm text-indigo-700 block">إيراد التشغيل المتوقع</span>
                                            <span className="text-xl font-bold text-indigo-800">
                                                {(parseFloat(formData.weight || 0) * parseFloat(formData.unit_price || 0)).toLocaleString('ar-EG')} ج.م
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">ملاحظات التشغيل</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="input-field h-24 pt-2"
                                        placeholder="أي ملاحظات إضافية حول عملية التشغيل أو العيوب..."
                                    />
                                </div>

                                <div className="flex gap-3 justify-end pt-6">
                                    <button type="button" onClick={resetForm} className="btn-secondary">
                                        إلغاء
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        تأكيد وحفظ السجل
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
