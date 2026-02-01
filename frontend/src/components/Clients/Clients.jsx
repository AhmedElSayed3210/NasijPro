import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { clientsAPI } from '../../services/api';
import { Plus, Edit, Trash2, RotateCcw, Eye, User, Phone, Wallet, Briefcase } from 'lucide-react';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';

export default function Clients() {
    const { clients, setClients, user } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientBalance, setClientBalance] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
    });

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (isAdmin) {
            fetchClients();
        }
    }, [showDeleted]);

    const fetchClients = async () => {
        try {
            const data = await clientsAPI.getAll({ showDeleted });
            setClients(data);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingClient) {
                const updated = await clientsAPI.update(editingClient.id, formData);
                setClients(clients.map(c => c.id === editingClient.id ? updated : c));
            } else {
                const newClient = await clientsAPI.create(formData);
                setClients([...clients, newClient]);
            }
            resetForm();
        } catch (error) {
            alert('فشل في حفظ العميل: ' + error.message);
        }
    };

    const handleDeleteClick = (id) => {
        setClientToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!clientToDelete) return;
        try {
            await clientsAPI.delete(clientToDelete);
            if (showDeleted) {
                fetchClients();
            } else {
                setClients(clients.filter(c => c.id !== clientToDelete));
            }
            setIsDeleteModalOpen(false);
            setClientToDelete(null);
        } catch (error) {
            alert('فشل في حذف العميل: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذا العميل؟')) return;
        try {
            await clientsAPI.restore(id);
            alert('تم استعادة العميل بنجاح');
            fetchClients();
        } catch (error) {
            alert('فشل في استعادة العميل: ' + error.message);
        }
    };

    const handleEdit = (client) => {
        if (client.is_deleted) {
            alert('لا يمكن تعديل عميل محذوف. قم باستعادته أولاً.');
            return;
        }
        setEditingClient(client);
        setFormData({
            name: client.name,
            phone: client.phone || '',
        });
        setShowForm(true);
    };

    const handleViewDetails = async (client) => {
        setSelectedClient(client);
        try {
            const balance = await clientsAPI.getBalance(client.id);
            setClientBalance(balance);
            setShowDetails(true);
        } catch (error) {
            alert('فشل في تحميل بيانات العميل: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
        });
        setEditingClient(null);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">عملاء التصنيع</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeletedCl"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeletedCl" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفين
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    إضافة عميل جديد
                </button>
            </div>

            {/* Clients Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>اسم العميل</th>
                                <th>رقم الهاتف</th>
                                <th>تاريخ التسجيل</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(clients || []).map((client) => (
                                <tr key={client.id} className={client.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}>
                                    <td className="font-semibold">
                                        {client.name}
                                        {client.is_deleted && (
                                            <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                        )}
                                    </td>
                                    <td>{client.phone || '-'}</td>
                                    <td>{new Date(client.created_at).toLocaleDateString('ar-EG')}</td>
                                    <td>
                                        <div className="flex gap-2 justify-end">
                                            {!client.is_deleted ? (
                                                <>
                                                    <button onClick={() => handleViewDetails(client)} className="text-green-600 hover:text-green-800" title="عرض التفاصيل">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => handleEdit(client)} className="text-blue-600 hover:text-blue-800" title="تعديل">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(client.id)} className="text-red-600 hover:text-red-800" title="حذف">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleRestore(client.id)} className="text-green-600 hover:text-green-800" title="استعادة">
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
                            <h2 className="text-2xl font-bold mb-6">{editingClient ? 'تعديل بيانات العميل' : 'إضافة عميل تصنيع جديد'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">اسم العميل</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-field"
                                        required
                                        placeholder="أدخل اسم العميل"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input-field"
                                        placeholder="05xxxxxxxx"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end pt-4">
                                    <button type="button" onClick={resetForm} className="btn-secondary">
                                        إلغاء
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        {editingClient ? 'تحديث' : 'إضافة'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Details/Balance Modal */}
            {showDetails && selectedClient && clientBalance && (
                <div className="modal-overlay" onClick={() => setShowDetails(false)}>
                    <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">تفاصيل حساب العميل</h2>
                                <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700">×</button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                                    <div className="bg-purple-600 p-2 rounded-full text-white">
                                        <Briefcase size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{selectedClient.name}</h3>
                                        <p className="text-gray-600 text-sm flex items-center gap-1">
                                            <Phone size={14} /> {selectedClient.phone || 'بدون هاتف'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 col-span-2">
                                        <p className="text-gray-500 text-sm mb-1">إجمالي إيرادات الإنتاج</p>
                                        <p className="font-bold text-2xl text-blue-600">{clientBalance.total_production.toLocaleString('ar-EG')} ج.م</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-500 text-sm mb-1">إجمالي المدفوعات المستلمة</p>
                                        <p className="font-bold text-green-600">{clientBalance.total_payments.toLocaleString('ar-EG')} ج.م</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-500 text-sm mb-1">الرصيد المتبقي</p>
                                        <p className="font-bold text-red-600">{clientBalance.current_balance.toLocaleString('ar-EG')} ج.م</p>
                                    </div>
                                </div>

                                <div className={`p-6 rounded-lg text-center ${clientBalance.current_balance >= 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                                    <p className="text-gray-700 font-medium mb-1">صافي الرصيد المستحق</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <Wallet size={24} className={clientBalance.current_balance >= 0 ? 'text-red-600' : 'text-green-600'} />
                                        <p className={`text-3xl font-bold ${clientBalance.current_balance >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                                            {Math.abs(clientBalance.current_balance).toLocaleString('ar-EG')} ج.م
                                        </p>
                                    </div>
                                    <p className="text-sm mt-2 font-medium">
                                        {clientBalance.current_balance >= 0 ? 'مبلغ مطلوب من العميل' : 'مبلغ دائن للعميل'}
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <button onClick={() => setShowDetails(false)} className="btn-secondary w-full">
                                        إإغلاق
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="تأكيد حذف العميل"
                message="هل أنت متأكد من رغبتك في حذف هذا العميل؟ سيتم إخفاؤه من قائمة العملاء النشطين، ويمكنك استعادته لاحقاً من قسم المحذوفات."
            />
        </div>
    );
}
