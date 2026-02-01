import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { shareholdersAPI } from '../../services/api';
import { Plus, Edit, Trash2, RotateCcw, Eye, User, Phone, Wallet } from 'lucide-react';
import DeleteConfirmationModal from '../Common/DeleteConfirmationModal';

export default function Shareholders() {
    const { shareholders, setShareholders, user } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedShareholder, setSelectedShareholder] = useState(null);
    const [shareholderPayouts, setShareholderPayouts] = useState([]);
    const [editingShareholder, setEditingShareholder] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [shareholderToDelete, setShareholderToDelete] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        opening_balance: 0,
    });

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (isAdmin) {
            fetchShareholders();
        }
    }, [showDeleted]);

    const fetchShareholders = async () => {
        try {
            const data = await shareholdersAPI.getAll({ showDeleted });
            setShareholders(data);
        } catch (error) {
            console.error('Failed to fetch shareholders:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingShareholder) {
                const updated = await shareholdersAPI.update(editingShareholder.id, formData);
                setShareholders(shareholders.map(s => s.id === editingShareholder.id ? updated : s));
            } else {
                const newShareholder = await shareholdersAPI.create(formData);
                setShareholders([...shareholders, newShareholder]);
            }
            resetForm();
        } catch (error) {
            alert('فشل في حفظ المساهم: ' + error.message);
        }
    };

    const handleDeleteClick = (id) => {
        setShareholderToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!shareholderToDelete) return;
        try {
            await shareholdersAPI.delete(shareholderToDelete);
            if (showDeleted) {
                fetchShareholders();
            } else {
                setShareholders(shareholders.filter(s => s.id !== shareholderToDelete));
            }
            setIsDeleteModalOpen(false);
            setShareholderToDelete(null);
        } catch (error) {
            alert('فشل في حذف المساهم: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!confirm('هل أنت متأكد من استعادة هذا المساهم؟')) return;
        try {
            await shareholdersAPI.restore(id);
            alert('تم استعادة المساهم بنجاح');
            fetchShareholders();
        } catch (error) {
            alert('فشل في استعادة المساهم: ' + error.message);
        }
    };

    const handleEdit = (shareholder) => {
        if (shareholder.is_deleted) {
            alert('لا يمكن تعديل مساهم محذوف. قم باستعادته أولاً.');
            return;
        }
        setEditingShareholder(shareholder);
        setFormData({
            name: shareholder.name,
            phone: shareholder.phone || '',
            opening_balance: shareholder.opening_balance,
        });
        setShowForm(true);
    };

    const handleViewDetails = async (shareholder) => {
        setSelectedShareholder(shareholder);
        try {
            const payouts = await shareholdersAPI.getPayouts(shareholder.id);
            setShareholderPayouts(payouts);
            setShowDetails(true);
        } catch (error) {
            alert('فشل في تحميل بيانات المساهم: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            phone: '',
            opening_balance: 0,
        });
        setEditingShareholder(null);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">المساهمون (أصحاب الماكينات)</h1>
                    {isAdmin && (
                        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                            <input
                                type="checkbox"
                                id="showDeletedSh"
                                checked={showDeleted}
                                onChange={(e) => setShowDeleted(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showDeletedSh" className="text-sm font-medium text-gray-700 cursor-pointer">
                                عرض المحذوفين
                            </label>
                        </div>
                    )}
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={20} />
                    إضافة مساهم جديد
                </button>
            </div>

            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>اسم المساهم</th>
                                <th>رقم الهاتف</th>
                                <th>الرصيد الافتتاحي</th>
                                <th>تاريخ الانضمام</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(shareholders || []).map((shareholder) => (
                                <tr key={shareholder.id} className={shareholder.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}>
                                    <td className="font-semibold">
                                        {shareholder.name}
                                        {shareholder.is_deleted && (
                                            <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                        )}
                                    </td>
                                    <td>{shareholder.phone || '-'}</td>
                                    <td>{parseFloat(shareholder.opening_balance).toLocaleString('ar-EG')} ج.م</td>
                                    <td>{new Date(shareholder.created_at).toLocaleDateString('ar-EG')}</td>
                                    <td>
                                        <div className="flex gap-2 justify-end">
                                            {!shareholder.is_deleted ? (
                                                <>
                                                    <button onClick={() => handleViewDetails(shareholder)} className="text-green-600 hover:text-green-800" title="عرض المدفوعات">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => handleEdit(shareholder)} className="text-blue-600 hover:text-blue-800" title="تعديل">
                                                        <Edit size={18} />
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(shareholder.id)} className="text-red-600 hover:text-red-800" title="حذف">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleRestore(shareholder.id)} className="text-green-600 hover:text-green-800" title="استعادة">
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

            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6">{editingShareholder ? 'تعديل بيانات المساهم' : 'إضافة مساهم جديد'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">اسم المساهم</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-field"
                                        required
                                        placeholder="أدخل اسم المساهم"
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
                                <div>
                                    <label className="block text-sm font-medium mb-2">الرصيد الافتتاحي (ج.م)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.opening_balance}
                                        onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 justify-end pt-4">
                                    <button type="button" onClick={resetForm} className="btn-secondary">إلغاء</button>
                                    <button type="submit" className="btn-primary">{editingShareholder ? 'تحديث' : 'إضافة'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showDetails && selectedShareholder && (
                <div className="modal-overlay" onClick={() => setShowDetails(false)}>
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">سجل المدفوعات - {selectedShareholder.name}</h2>
                                <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700">×</button>
                            </div>
                            <div className="space-y-4">
                                <div className="overflow-y-auto max-h-96">
                                    <table className="table mini">
                                        <thead>
                                            <tr>
                                                <th>التاريخ</th>
                                                <th>المبلغ</th>
                                                <th>الوصف</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shareholderPayouts.length > 0 ? shareholderPayouts.map(p => (
                                                <tr key={p.id}>
                                                    <td>{new Date(p.transaction_date).toLocaleDateString('ar-EG')}</td>
                                                    <td className="font-bold text-red-600">{p.amount.toLocaleString('ar-EG')} ج.م</td>
                                                    <td>{p.description}</td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="3" className="text-center text-gray-500 py-4">لا توجد مدفوعات مسجلة</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <button onClick={() => setShowDetails(false)} className="btn-secondary w-full">إغلاق</button>
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
                title="تأكيد حذف المساهم"
                message="هل أنت متأكد من رغبتك في حذف هذا المساهم؟ سيتم إخفاؤه من القائمة النشطة، ويمكنك استعادته لاحقاً من قسم المحذوفات."
            />
        </div>
    );
}
