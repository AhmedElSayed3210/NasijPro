import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { machinesAPI } from '../../services/api';
import { Plus, Edit, Trash2, RotateCcw, Eye } from 'lucide-react';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';

export default function Machines() {
    const { machines, setMachines, shareholders, user } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [editingMachine, setEditingMachine] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [machineToDelete, setMachineToDelete] = useState(null);
    const [formData, setFormData] = useState({
        machine_number: '',
        machine_type: '',
        owner_type: 'FACTORY',
        shareholder_id: '',
        start_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        factory_profit_percentage: 100,
    });

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (isAdmin) {
            fetchMachines();
        }
    }, [showDeleted]);

    const fetchMachines = async () => {
        try {
            const data = await machinesAPI.getAll({ showDeleted });
            setMachines(data);
        } catch (error) {
            console.error('Failed to fetch machines:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        const percentage = parseFloat(formData.factory_profit_percentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
            alert('نسبة ربح المصنع يجب أن تكون بين 0 و 100');
            return;
        }

        try {
            if (editingMachine) {
                const updated = await machinesAPI.update(editingMachine.id, formData);
                setMachines(machines.map(m => m.id === editingMachine.id ? updated : m));
            } else {
                const newMachine = await machinesAPI.create(formData);
                setMachines([...machines, newMachine]);
            }
            resetForm();
        } catch (error) {
            alert('فشل في حفظ الآلة: ' + error.message);
        }
    };

    const handleDeleteClick = (id) => {
        setMachineToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!machineToDelete) return;
        try {
            await machinesAPI.delete(machineToDelete);
            if (showDeleted) {
                fetchMachines();
            } else {
                setMachines(machines.filter(m => m.id !== machineToDelete));
            }
            setIsDeleteModalOpen(false);
            setMachineToDelete(null);
        } catch (error) {
            alert('فشل في حذف الآلة: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذه الآلة؟')) return;
        try {
            await machinesAPI.restore(id);
            alert('تم استعادة الآلة بنجاح');
            fetchMachines();
        } catch (error) {
            alert('فشل في استعادة الآلة: ' + error.message);
        }
    };

    const handleEdit = (machine) => {
        if (machine.is_deleted) {
            alert('لا يمكن تعديل آلة محذوفة. قم باستعادتها أولاً.');
            return;
        }
        setEditingMachine(machine);
        setFormData({
            machine_number: machine.machine_number,
            machine_type: machine.machine_type,
            owner_type: machine.owner_type,
            shareholder_id: machine.shareholder_id || '',
            start_date: machine.start_date ? new Date(machine.start_date).toISOString().split('T')[0] : '',
            status: machine.status,
            factory_profit_percentage: machine.factory_profit_percentage || (machine.owner_type === 'FACTORY' ? 100 : 50),
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            machine_number: '',
            machine_type: '',
            owner_type: 'FACTORY',
            shareholder_id: '',
            start_date: new Date().toISOString().split('T')[0],
            status: 'ACTIVE',
            factory_profit_percentage: 100,
        });
        setEditingMachine(null);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">إدارة الآلات</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeleted"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeleted" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفة
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    إضافة آلة جديدة
                </button>
            </div>

            {/* Machines Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>رقم الآلة</th>
                                <th>النوع</th>
                                <th>المالك</th>
                                <th>المساهم الشريك</th>
                                <th>نسبة ربح المصنع</th>
                                <th>الحالة</th>
                                <th>تاريخ البدء</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {machines.map((machine) => (
                                <tr key={machine.id} className={machine.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}>
                                    <td className="font-semibold">
                                        {machine.machine_number}
                                        {machine.is_deleted && (
                                            <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                        )}
                                    </td>
                                    <td>{machine.machine_type}</td>
                                    <td>
                                        <span className={`px-3 py-1 rounded-full text-sm ${machine.owner_type === 'FACTORY'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {machine.owner_type === 'FACTORY' ? 'المصنع' : 'مساهم'}
                                        </span>
                                    </td>
                                    <td>{machine.shareholder_name || '-'}</td>
                                    <td className="font-bold text-blue-600">
                                        {parseFloat(machine.factory_profit_percentage).toFixed(0)}%
                                    </td>
                                    <td>
                                        <span className={`px-3 py-1 rounded-full text-sm ${machine.status === 'ACTIVE'
                                            ? 'bg-green-100 text-green-800'
                                            : machine.status === 'STOPPED'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {machine.status === 'ACTIVE' ? 'نشط' : machine.status === 'STOPPED' ? 'متوقف' : 'صيانة'}
                                        </span>
                                    </td>
                                    <td>{new Date(machine.start_date).toLocaleDateString('ar-EG')}</td>
                                    <td>
                                        <div className="flex gap-2 justify-end">
                                            {!machine.is_deleted ? (
                                                <>
                                                    <button onClick={() => handleEdit(machine)} className="text-blue-600 hover:text-blue-800" title="تعديل">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(machine.id)} className="text-red-600 hover:text-red-800" title="حذف">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleRestore(machine.id)} className="text-green-600 hover:text-green-800" title="استعادة">
                                                    <RotateCcw size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6">{editingMachine ? 'تعديل الآلة' : 'إضافة آلة جديدة'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">رقم الآلة</label>
                                        <input
                                            type="text"
                                            value={formData.machine_number}
                                            onChange={(e) => setFormData({ ...formData, machine_number: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">نوع الآلة</label>
                                        <input
                                            type="text"
                                            value={formData.machine_type}
                                            onChange={(e) => setFormData({ ...formData, machine_type: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">جهة الملكية</label>
                                        <select
                                            value={formData.owner_type}
                                            onChange={(e) => {
                                                const newOwnerType = e.target.value;
                                                setFormData({
                                                    ...formData,
                                                    owner_type: newOwnerType,
                                                    factory_profit_percentage: newOwnerType === 'FACTORY' ? 100 : 50
                                                });
                                            }}
                                            className="input-field"
                                        >
                                            <option value="FACTORY">المصنع</option>
                                            <option value="SHAREHOLDER">مساهم خارجي</option>
                                        </select>
                                    </div>

                                    {formData.owner_type === 'SHAREHOLDER' && (
                                        <div>
                                            <label className="block text-sm font-medium mb-2">المساهم المالك</label>
                                            <select
                                                value={formData.shareholder_id}
                                                onChange={(e) => setFormData({ ...formData, shareholder_id: e.target.value })}
                                                className="input-field"
                                                required
                                            >
                                                <option value="">اختر المساهم</option>
                                                {shareholders.map((sh) => (
                                                    <option key={sh.id} value={sh.id}>{sh.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {formData.owner_type === 'SHAREHOLDER' && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <label className="block text-sm font-bold text-blue-800 mb-2">نسبة ربح المصنع (%)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={formData.factory_profit_percentage}
                                                onChange={(e) => setFormData({ ...formData, factory_profit_percentage: parseInt(e.target.value) })}
                                                className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={formData.factory_profit_percentage}
                                                    onChange={(e) => setFormData({ ...formData, factory_profit_percentage: parseInt(e.target.value) })}
                                                    className="w-20 px-2 py-1 border border-blue-300 rounded text-center font-bold text-blue-700"
                                                />
                                                <span className="font-bold text-blue-700">%</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-2">
                                            * سيحصل المصنع على {formData.factory_profit_percentage}% من صافي ربح الآلة، وسيحصل المساهم على {100 - formData.factory_profit_percentage}%.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">الحالة التشغيلية</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="ACTIVE">نشط</option>
                                            <option value="STOPPED">متوقف</option>
                                            <option value="MAINTENANCE">صيانة</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">تاريخ البدء بالمصنع</label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4">
                                    <button type="button" onClick={resetForm} className="btn-secondary">
                                        إلغاء
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingMachine ? 'حفظ التعديلات' : 'إضافة الآلة'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="تأكيد حذف الآلة"
                message="هل أنت متأكد من رغبتك في حذف هذه الآلة؟ سيتم نقلها إلى السجلات المؤرشفة ويمكنك استعادتها في أي وقت من خلال عرض المحذوفات."
            />
        </div>
    );
}
