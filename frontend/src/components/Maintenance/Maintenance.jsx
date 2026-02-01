import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { maintenanceAPI } from '../../services/api';
import { Plus, Edit, Trash2, RotateCcw, Calendar, Wrench, AlertCircle, CheckCircle, Search, DollarSign } from 'lucide-react';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';

export default function Maintenance() {
    const { machines, user } = useApp();
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [filterMachineId, setFilterMachineId] = useState('');
    const [showDeleted, setShowDeleted] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState(null);

    const isAdmin = user?.role === 'ADMIN';

    const [formData, setFormData] = useState({
        machine_id: '',
        maintenance_date: new Date().toISOString().split('T')[0],
        maintenance_type: 'ROUTINE',
        cost: '',
        notes: '',
    });

    useEffect(() => {
        loadMaintenanceRecords();
    }, [filterMachineId, showDeleted]);

    const loadMaintenanceRecords = async () => {
        setLoading(true);
        try {
            const data = await maintenanceAPI.getAll({
                machine_id: filterMachineId,
                showDeleted: isAdmin ? showDeleted : false
            });
            setMaintenanceRecords(data);
        } catch (error) {
            console.error('Failed to load maintenance records:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingRecord) {
                const updated = await maintenanceAPI.update(editingRecord.id, formData);
                setMaintenanceRecords(maintenanceRecords.map(r => r.id === editingRecord.id ? { ...updated, machine_number: machines.find(m => m.id === formData.machine_id)?.machine_number } : r));
            } else {
                const newRecord = await maintenanceAPI.create(formData);
                const machine = machines.find(m => m.id === formData.machine_id);
                setMaintenanceRecords([{ ...newRecord, machine_number: machine?.machine_number, machine_type: machine?.machine_type }, ...maintenanceRecords]);
            }
            resetForm();
        } catch (error) {
            alert('فشل في حفظ سجل الصيانة: ' + error.message);
        }
    };

    const handleDeleteClick = (id) => {
        setRecordToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        try {
            await maintenanceAPI.delete(recordToDelete);
            if (showDeleted) {
                loadMaintenanceRecords();
            } else {
                setMaintenanceRecords(maintenanceRecords.filter(r => r.id !== recordToDelete));
            }
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
        } catch (error) {
            alert('فشل في حذف السجل: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذا السجل؟')) return;
        try {
            await maintenanceAPI.restore(id);
            alert('تم استعادة السجل بنجاح');
            loadMaintenanceRecords();
        } catch (error) {
            alert('فشل في استعادة السجل: ' + error.message);
        }
    };

    const handleEdit = (record) => {
        if (record.is_deleted) {
            alert('لا يمكن تعديل سجل محذوف. قم باستعادته أولاً.');
            return;
        }
        setEditingRecord(record);
        setFormData({
            machine_id: record.machine_id,
            maintenance_date: new Date(record.maintenance_date).toISOString().split('T')[0],
            maintenance_type: record.maintenance_type,
            cost: record.cost,
            notes: record.notes || '',
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            machine_id: '',
            maintenance_date: new Date().toISOString().split('T')[0],
            maintenance_type: 'ROUTINE',
            cost: '',
            notes: '',
        });
        setEditingRecord(null);
        setShowForm(false);
    };

    const totalCost = maintenanceRecords
        .filter(r => !r.is_deleted)
        .reduce((sum, r) => sum + parseFloat(r.cost), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">إدارة الصيانة</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeletedMaint"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeletedMaint" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفة
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    تسجيل صيانة جديدة
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-gradient-to-br from-red-500 to-rose-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-red-100 text-sm font-medium">إجمالي تكاليف الصيانة</p>
                            <h3 className="text-3xl font-bold mt-1">{totalCost.toLocaleString('ar-EG')} ج.م</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <DollarSign size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-amber-100 text-sm font-medium">صيانة عاجلة</p>
                            <h3 className="text-3xl font-bold mt-1">{maintenanceRecords.filter(r => r.maintenance_type === 'URGENT' && !r.is_deleted).length} سجل</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <AlertCircle size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-green-100 text-sm font-medium">صيانة دورية</p>
                            <h3 className="text-3xl font-bold mt-1">{maintenanceRecords.filter(r => r.maintenance_type === 'ROUTINE' && !r.is_deleted).length} سجل</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <CheckCircle size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card bg-gray-50 border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-md">
                        <label className="block text-sm font-medium mb-1 text-gray-600">تصفية حسب الآلة</label>
                        <div className="flex gap-2">
                            <select
                                value={filterMachineId}
                                onChange={(e) => setFilterMachineId(e.target.value)}
                                className="input-field"
                            >
                                <option value="">كل الآلات</option>
                                {machines.map(m => (
                                    <option key={m.id} value={m.id}>{m.machine_number} - {m.machine_type}</option>
                                ))}
                            </select>
                            <button onClick={loadMaintenanceRecords} className="btn-secondary flex items-center gap-2">
                                <Search size={18} />
                                بحث
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Maintenance Table */}
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
                                    <th>التكلفة</th>
                                    <th>نوع الصيانة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {maintenanceRecords.map((record) => (
                                    <tr key={record.id} className={record.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}>
                                        <td>
                                            {new Date(record.maintenance_date).toLocaleDateString('ar-EG')}
                                            {record.is_deleted && (
                                                <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                            )}
                                        </td>
                                        <td className="font-semibold">{record.machine_number}</td>
                                        <td className="text-xs text-gray-600">{record.machine_type}</td>
                                        <td className="font-bold text-red-600">{parseFloat(record.cost).toLocaleString('ar-EG')} ج.م</td>
                                        <td>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.maintenance_type === 'URGENT'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {record.maintenance_type === 'URGENT' ? 'عاجلة' : 'دورية'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2 justify-end">
                                                {!record.is_deleted ? (
                                                    <>
                                                        <button onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-800" title="تعديل">
                                                            <Edit size={18} />
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(record.id)} className="text-red-600 hover:text-red-800" title="حذف">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleRestore(record.id)} className="text-green-600 hover:text-green-800" title="استعادة">
                                                        <RotateCcw size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {maintenanceRecords.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-gray-500">
                                            لا توجد سجلات صيانة حالياً.
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
                                {editingRecord ? 'تعديل سجل الصيانة' : 'تسجيل صيانة جديدة'}
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
                                        <label className="block text-sm font-medium mb-2 text-gray-700">تاريخ الصيانة</label>
                                        <input
                                            type="date"
                                            value={formData.maintenance_date}
                                            onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">نوع الصيانة</label>
                                        <select
                                            value={formData.maintenance_type}
                                            onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="ROUTINE">دورية</option>
                                            <option value="URGENT">عاجلة</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">التكلفة (ج.م)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.cost}
                                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                            className="input-field"
                                            required
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>



                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">ملاحظات الصيانة</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="input-field h-24 pt-2"
                                        placeholder="سجل تفاصيل العطل أو قطع الغيار المستبدلة"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end pt-6">
                                    <button type="button" onClick={resetForm} className="btn-secondary">
                                        إلغاء
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingRecord ? 'حفظ التغييرات' : 'تسجيل الصيانة'}
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
                title="تأكيد حذف سجل الصيانة"
                message="هل أنت متأكد من رغبتك في حذف هذا السجل؟ سيتم إخفاؤه من القوائم النشطة، ويمكنك استعادته لاحقاً من سجل المحذوفات."
            />
        </div>
    );
}
