import { useState, useEffect } from 'react';
import { machineCostsAPI } from '../../services/api';
import { DollarSign, Plus, Trash2, RotateCcw, Edit2, Save, X, Calendar, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function MachineCostsModal({ machine, onClose }) {
    const { user } = useApp();
    const [costs, setCosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [formData, setFormData] = useState({
        cost_type: 'FIXED',
        category: '',
        amount: '',
        billing_month: new Date().toISOString().split('T')[0].substring(0, 7), // YYYY-MM
        notes: ''
    });

    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        loadCosts();
    }, [machine.id, showDeleted]);

    const loadCosts = async () => {
        setLoading(true);
        try {
            const data = await machineCostsAPI.getByMachine(machine.id, {
                showDeleted: isAdmin ? showDeleted : false
            });
            setCosts(data);
        } catch (error) {
            console.error('Failed to load costs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                machine_id: machine.id,
                billing_month: formData.cost_type === 'VARIABLE' ? `${formData.billing_month}-01` : null
            };

            if (editingId) {
                await machineCostsAPI.update(editingId, dataToSave);
            } else {
                await machineCostsAPI.create(dataToSave);
            }

            setEditingId(null);
            setFormData({
                cost_type: 'FIXED',
                category: '',
                amount: '',
                billing_month: new Date().toISOString().split('T')[0].substring(0, 7),
                notes: ''
            });
            loadCosts();
        } catch (error) {
            alert('فشل في حفظ التكلفة: ' + error.message);
        }
    };

    const handleEdit = (cost) => {
        if (cost.is_deleted) {
            alert('لا يمكن تعديل سجل محذوف. قم باستعادته أولاً.');
            return;
        }
        setEditingId(cost.id);
        setFormData({
            cost_type: cost.cost_type,
            category: cost.category,
            amount: cost.amount,
            billing_month: cost.billing_month ? cost.billing_month.substring(0, 7) : new Date().toISOString().split('T')[0].substring(0, 7),
            notes: cost.notes || ''
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
        try {
            await machineCostsAPI.delete(id);
            if (showDeleted) {
                loadCosts();
            } else {
                setCosts(costs.filter(c => c.id !== id));
            }
        } catch (error) {
            alert('فشل في الحذف: ' + error.message);
        }
    };

    const handleRestore = async (id) => {
        if (!window.confirm('هل أنت متأكد من استعادة هذا السجل؟')) return;
        try {
            await machineCostsAPI.restore(id);
            alert('تم استعادة السجل بنجاح');
            loadCosts();
        } catch (error) {
            alert('فشل في الاستعادة: ' + error.message);
        }
    };

    const fixedCosts = costs.filter(c => c.cost_type === 'FIXED');
    const variableCosts = costs.filter(c => c.cost_type === 'VARIABLE');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">إدارة تكاليف الآلة: {machine.machine_number}</h2>
                                <p className="text-gray-500">{machine.machine_type}</p>
                            </div>
                            {isAdmin && (
                                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                    <input
                                        type="checkbox"
                                        id="showDeletedCosts"
                                        checked={showDeleted}
                                        onChange={(e) => setShowDeleted(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="showDeletedCosts" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        عرض المحذوفة
                                    </label>
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Costs List */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Fixed Costs */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <AlertCircle className="text-blue-500" size={20} />
                                        التكاليف الثابتة (تتكرر شهرياً)
                                    </h3>
                                </div>
                                <div className="bg-white border rounded-lg overflow-hidden">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-3">الفئة</th>
                                                <th className="p-3">المبلغ</th>
                                                <th className="p-3">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {fixedCosts.length === 0 ? (
                                                <tr><td colSpan="3" className="p-4 text-center text-gray-400">لا توجد تكاليف ثابتة</td></tr>
                                            ) : (
                                                fixedCosts.map(cost => (
                                                    <tr key={cost.id} className={`hover:bg-gray-50 ${cost.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                                                        <td className="p-3 font-medium">
                                                            {cost.category}
                                                            {cost.is_deleted && (
                                                                <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">{parseFloat(cost.amount).toLocaleString('ar-EG')} ج.م</td>
                                                        <td className="p-3">
                                                            <div className="flex gap-2">
                                                                {!cost.is_deleted ? (
                                                                    <>
                                                                        <button onClick={() => handleEdit(cost)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                                                                        <button onClick={() => handleDelete(cost.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                                                    </>
                                                                ) : (
                                                                    <button onClick={() => handleRestore(cost.id)} className="text-green-600 hover:text-green-800" title="استعادة"><RotateCcw size={16} /></button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Variable Costs */}
                            <section>
                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                                    <Calendar className="text-orange-500" size={20} />
                                    التكاليف المتغيرة (حسب الشهر)
                                </h3>
                                <div className="bg-white border rounded-lg overflow-hidden">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-3">الشهر</th>
                                                <th className="p-3">الفئة</th>
                                                <th className="p-3">المبلغ</th>
                                                <th className="p-3">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {variableCosts.length === 0 ? (
                                                <tr><td colSpan="4" className="p-4 text-center text-gray-400">لا توجد تكاليف متغيرة</td></tr>
                                            ) : (
                                                variableCosts.map(cost => (
                                                    <tr key={cost.id} className={`hover:bg-gray-50 ${cost.is_deleted ? 'opacity-50 grayscale bg-gray-50' : ''}`}>
                                                        <td className="p-3">{new Date(cost.billing_month).toLocaleDateString('ar-EG', { month: '2-digit', year: 'numeric' })}</td>
                                                        <td className="p-3 font-medium">
                                                            {cost.category}
                                                            {cost.is_deleted && (
                                                                <span className="block text-[10px] text-red-600 font-bold uppercase mt-1">محذوف</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">{parseFloat(cost.amount).toLocaleString('ar-EG')} ج.م</td>
                                                        <td className="p-3">
                                                            <div className="flex gap-2">
                                                                {!cost.is_deleted ? (
                                                                    <>
                                                                        <button onClick={() => handleEdit(cost)} className="text-blue-600 hover:text-blue-800"><Edit2 size={16} /></button>
                                                                        <button onClick={() => handleDelete(cost.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                                                    </>
                                                                ) : (
                                                                    <button onClick={() => handleRestore(cost.id)} className="text-green-600 hover:text-green-800" title="استعادة"><RotateCcw size={16} /></button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>

                        {/* Add/Edit Form */}
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-fit sticky top-0">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
                                {editingId ? 'تعديل التكلفة' : 'إضافة تكلفة جديدة'}
                            </h3>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">نوع التكلفة</label>
                                    <select
                                        className="w-full p-2 border rounded-lg"
                                        value={formData.cost_type}
                                        onChange={e => setFormData({ ...formData, cost_type: e.target.value })}
                                        disabled={editingId}
                                    >
                                        <option value="FIXED">ثابتة (شهرياً)</option>
                                        <option value="VARIABLE">متغيرة (شهر محدد)</option>
                                    </select>
                                </div>

                                {formData.cost_type === 'VARIABLE' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">الشهر المستهدف</label>
                                        <input
                                            type="month"
                                            className="w-full p-2 border rounded-lg"
                                            value={formData.billing_month}
                                            onChange={e => setFormData({ ...formData, billing_month: e.target.value })}
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">الفئة (بند التكلفة)</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg"
                                        placeholder="مثلاً: إيجار، كهرباء، زيت..."
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">المبلغ (ج.م)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute right-2 top-2.5 text-gray-400" size={18} />
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full p-2 pr-10 border rounded-lg"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">ملاحظات (اختياري)</label>
                                    <textarea
                                        className="w-full p-2 border rounded-lg"
                                        rows="2"
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="flex gap-2">
                                    <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                                        <Save size={18} />
                                        {editingId ? 'تحديث' : 'حفظ'}
                                    </button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingId(null);
                                                setFormData({ cost_type: 'FIXED', category: '', amount: '', billing_month: new Date().toISOString().split('T')[0].substring(0, 7), notes: '' });
                                            }}
                                            className="btn-secondary"
                                        >
                                            إلغاء التعديل
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
