import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { employeesAPI } from '../../services/api';
import { Plus, Edit, Trash2, RotateCcw, User, Calendar, CreditCard, Users } from 'lucide-react';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';

export default function Employees() {
    const { employees, setEmployees, user } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        monthly_salary: '',
        hire_date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE'
    });

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (isAdmin) {
            fetchEmployees();
        }
    }, [showDeleted]);

    const fetchEmployees = async () => {
        try {
            const data = await employeesAPI.getAll({ showDeleted });
            setEmployees(data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    };

    const totalActiveSalary = employees
        .filter(emp => emp.status === 'ACTIVE' && !emp.is_deleted)
        .reduce((sum, emp) => sum + parseFloat(emp.monthly_salary), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                const updated = await employeesAPI.update(editingEmployee.id, formData);
                setEmployees(employees.map(emp => emp.id === editingEmployee.id ? updated : emp));
            } else {
                const newEmployee = await employeesAPI.create(formData);
                setEmployees([...employees, newEmployee]);
            }
            resetForm();
        } catch (error) {
            alert('فشل في حفظ الموظف: ' + error.message);
        }
    };

    const handleDeleteClick = (id) => {
        setEmployeeToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;
        try {
            await employeesAPI.delete(employeeToDelete);
            if (showDeleted) {
                fetchEmployees();
            } else {
                setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
            }
            setIsDeleteModalOpen(false);
            setEmployeeToDelete(null);
        } catch (error) {
            alert('فشل في حذف الموظف: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذا الموظف؟')) return;
        try {
            await employeesAPI.restore(id);
            alert('تم استعادة الموظف بنجاح');
            fetchEmployees();
        } catch (error) {
            alert('فشل في استعادة الموظف: ' + error.message);
        }
    };

    const handleEdit = (employee) => {
        if (employee.is_deleted) {
            alert('لا يمكن تعديل موظف محذوف. قم باستعادته أولاً.');
            return;
        }
        setEditingEmployee(employee);
        setFormData({
            name: employee.name,
            monthly_salary: employee.monthly_salary,
            hire_date: employee.hire_date ? new Date(employee.hire_date).toISOString().split('T')[0] : '',
            status: employee.status
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            monthly_salary: '',
            hire_date: new Date().toISOString().split('T')[0],
            status: 'ACTIVE'
        });
        setEditingEmployee(null);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">إدارة الموظفين</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeletedEmp"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeletedEmp" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفين
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    إضافة موظف جديد
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">إجمالي الرواتب الشهرية</p>
                            <h3 className="text-3xl font-bold mt-1">{totalActiveSalary.toLocaleString('ar-EG')} ج.م</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <CreditCard size={32} />
                        </div>
                    </div>
                </div>
                <div className="card bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-emerald-100 text-sm font-medium">عدد الموظفين الحاليين</p>
                            <h3 className="text-3xl font-bold mt-1">{employees.filter(e => e.status === 'ACTIVE' && !e.is_deleted).length} موظف</h3>
                        </div>
                        <div className="bg-white/20 p-3 rounded-lg">
                            <Users size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Employees Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>اسم الموظف</th>
                                <th>الراتب الشهري</th>
                                <th>تاريخ التعيين</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((employee) => (
                                <tr key={employee.id} className={`${employee.status !== 'ACTIVE' ? 'opacity-60 grayscale-[0.5]' : ''} ${employee.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 p-2 rounded-full">
                                                <User size={18} className="text-gray-600" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{employee.name}</span>
                                                {employee.is_deleted && (
                                                    <span className="text-[10px] text-red-600 font-bold uppercase">محذوف</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="font-mono">{parseFloat(employee.monthly_salary).toLocaleString('ar-EG')} ج.م</td>
                                    <td>{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ar-EG') : '-'}</td>
                                    <td>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${employee.status === 'ACTIVE'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {employee.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2 justify-end">
                                            {!employee.is_deleted ? (
                                                <>
                                                    <button onClick={() => handleEdit(employee)} className="text-blue-600 hover:text-blue-800" title="تعديل">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(employee.id)} className="text-red-600 hover:text-red-800" title="حذف">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleRestore(employee.id)} className="text-green-600 hover:text-green-800" title="استعادة">
                                                    <RotateCcw size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-500">
                                        لا يوجد موظفين مسجلين حالياً. اضغط على إضافة موظف جديد للبدء.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6 text-gray-800">
                                {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">اسم الموظف</label>
                                    <div className="relative">
                                        <User className="absolute right-3 top-3 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="input-field pr-10"
                                            required
                                            placeholder="أدخل اسم الموظف الكامل"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">الراتب الشهري (ج.م)</label>
                                        <div className="relative">
                                            <CreditCard className="absolute right-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="number"
                                                value={formData.monthly_salary}
                                                onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                                                className="input-field pr-10"
                                                required
                                                placeholder="0.00"
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">تاريخ التعيين</label>
                                        <div className="relative">
                                            <Calendar className="absolute right-3 top-3 text-gray-400" size={18} />
                                            <input
                                                type="date"
                                                value={formData.hire_date}
                                                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                                                className="input-field pr-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {editingEmployee && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-gray-700">الحالة</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="ACTIVE">نشط</option>
                                            <option value="INACTIVE">غير نشط</option>
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-3 justify-end pt-6">
                                    <button type="button" onClick={resetForm} className="btn-secondary">
                                        إلغاء
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingEmployee ? 'حفظ التغييرات' : 'إضافة الموظف'}
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
                title="تأكيد حذف الموظف"
                message="هل أنت متأكد من رغبتك في حذف هذا الموظف؟ سيتم إخفاؤه من قوائم الموظفين النشطين، ويمكنك استعادته لاحقاً من قسم المحذوفات."
            />
        </div>
    );
}
