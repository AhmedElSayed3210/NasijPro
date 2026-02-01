import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { operationsAPI } from '../../services/api';
import { Plus, Edit, Trash2, RotateCcw, Calendar, Clock, Activity, FileText, Search, Filter } from 'lucide-react';

export default function Operations() {
    const { machines, user } = useApp();
    const [operations, setOperations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingOperation, setEditingOperation] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [filters, setFilters] = useState({
        machine_id: '',
        start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
    });

    const isAdmin = user?.role === 'ADMIN';

    const [formData, setFormData] = useState({
        machine_id: '',
        operation_date: new Date().toISOString().split('T')[0],
        hours_worked: '',
        notes: '',
    });

    useEffect(() => {
        loadOperations();
    }, [filters, showDeleted]);

    const loadOperations = async () => {
        setLoading(true);
        try {
            const data = await operationsAPI.getAll({
                ...filters,
                showDeleted: isAdmin ? showDeleted : false
            });
            setOperations(data);
        } catch (error) {
            console.error('Failed to load operations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingOperation) {
                const updated = await operationsAPI.update(editingOperation.id, formData);
                setOperations(operations.map(op => op.id === editingOperation.id ? { ...updated, machine_number: machines.find(m => m.id === formData.machine_id)?.machine_number } : op));
            } else {
                const newOp = await operationsAPI.create(formData);
                const machine = machines.find(m => m.id === formData.machine_id);
                setOperations([{ ...newOp, machine_number: machine?.machine_number, machine_type: machine?.machine_type }, ...operations]);
            }
            resetForm();
        } catch (error) {
            alert('فشل في حفظ العملية: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
        try {
            await operationsAPI.delete(id);
            if (showDeleted) {
                loadOperations();
            } else {
                setOperations(operations.filter(op => op.id !== id));
            }
        } catch (error) {
            alert('فشل في حذف السجل: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذا السجل؟')) return;
        try {
            await operationsAPI.restore(id);
            alert('تم استعادة السجل بنجاح');
            loadOperations();
        } catch (error) {
            alert('فشل في استعادة السجل: ' + error.message);
        }
    };

    const handleEdit = (op) => {
        if (op.is_deleted) {
            alert('لا يمكن تعديل سجل محذوف. قم باستعادته أولاً.');
            return;
        }
        setEditingOperation(op);
        setFormData({
            machine_id: op.machine_id,
            operation_date: new Date(op.operation_date).toISOString().split('T')[0],
            hours_worked: op.hours_worked,
            notes: op.notes || '',
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            machine_id: '',
            operation_date: new Date().toISOString().split('T')[0],
            hours_worked: '',
            notes: '',
        });
        setEditingOperation(null);
        setShowForm(false);
    };

    const totalHours = operations
        .filter(op => !op.is_deleted)
        .reduce((sum, op) => sum + parseFloat(op.hours_worked), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">سجل العمليات</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeletedOps"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeletedOps" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفة
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    تسجيل ساعات عمل
                </button>
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
                    <button onClick={loadOperations} className="btn-secondary flex items-center gap-2 h-[42px]">
                        <Search size={18} />
                        بحث
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">إجمالي ساعات العمل (للفترة)</p>
                            <h3 className="text-3xl font-bold mt-1">{totalHours.toLocaleString('ar-EG')} ساعة</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Clock size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">عدد السجلات</p>
                            <h3 className="text-3xl font-bold mt-1">{operations.filter(op => !op.is_deleted).length} سجل</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Activity size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-orange-500 to-amber-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-orange-100 text-sm font-medium">متوسط الساعات يومياً</p>
                            <h3 className="text-3xl font-bold mt-1">
                                {operations.filter(op => !op.is_deleted).length > 0 ? (totalHours / operations.filter(op => !op.is_deleted).length).toFixed(1) : 0} ساعة
                            </h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Filter size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Operations Table */}
            <div className="card">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>رقم الآلة</th>
                                    <th>النوع</th>
                                    <th>ساعات العمل</th>
                                    <th>ملاحظات / الإنتاج</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operations.map((op) => (
                                    <tr key={op.id} className={op.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}>
                                        <td>
                                            {new Date(op.operation_date).toLocaleDateString('ar-EG')}
                                            {op.is_deleted && (
                                                <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                            )}
                                        </td>
                                        <td className="font-semibold">{op.machine_number}</td>
                                        <td className="text-xs text-gray-600">{op.machine_type}</td>
                                        <td className="font-bold text-blue-600">{op.hours_worked} ساعة</td>
                                        <td className="max-w-xs truncate text-sm" title={op.notes}>{op.notes || '-'}</td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {!op.is_deleted ? (
                                                    <>
                                                        <button onClick={() => handleEdit(op)} className="text-blue-600 hover:text-blue-800">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button onClick={() => handleDelete(op.id)} className="text-red-600 hover:text-red-800">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleRestore(op.id)} className="text-green-600 hover:text-green-800" title="استعادة">
                                                        <RotateCcw size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {operations.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-gray-500">
                                            لا توجد سجلات عمليات لهذه الفترة.
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
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                {editingOperation ? 'تعديل سجل العمل' : 'تسجيل ساعات عمل يومية'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">التاريخ</label>
                                        <div className="relative">
                                            <Calendar className="absolute right-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="date"
                                                value={formData.operation_date}
                                                onChange={(e) => setFormData({ ...formData, operation_date: e.target.value })}
                                                className="input-field pr-10"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">ساعات العمل (1-24)</label>
                                    <div className="relative">
                                        <Clock className="absolute right-3 top-3 text-gray-400" size={18} />
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="24"
                                            value={formData.hours_worked}
                                            onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                                            className="input-field pr-10"
                                            required
                                            placeholder="مثال: 8"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">الإنتاج / ملاحظات</label>
                                    <div className="relative">
                                        <FileText className="absolute right-3 top-3 text-gray-400" size={18} />
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="input-field pr-10 h-24 pt-2"
                                            placeholder="سجل كمية الإنتاج أو أي ملاحظات أخرى هنا"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-6">
                                    <button type="button" onClick={resetForm} className="btn-secondary">
                                        إلغاء
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingOperation ? 'حفظ التغييرات' : 'تسجيل العمل'}
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
