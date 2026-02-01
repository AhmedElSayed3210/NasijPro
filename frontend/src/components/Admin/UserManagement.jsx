import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { Users, UserCheck, UserX, Clock, Trash2, AlertCircle } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await usersAPI.getAll();
            setUsers(data);
        } catch (err) {
            setError('فشل في تحميل قائمة المستخدمين');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await usersAPI.updateStatus(id, newStatus);
            fetchUsers();
        } catch (err) {
            alert(err.message || 'فشل تحديث الحالة');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
        try {
            await usersAPI.delete(id);
            fetchUsers();
        } catch (err) {
            alert(err.message || 'فشل حذف المستخدم');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'INACTIVE': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'ACTIVE': return 'نشط';
            case 'PENDING': return 'بانتظار الموافقة';
            case 'INACTIVE': return 'موقف';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">إدارة المستخدمين</h1>
                    <p className="text-gray-500">التحكم في صلاحيات الوصول والموافقة على الطلبات الجديدة</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4">
                    <div className="bg-blue-500 p-2 rounded-lg">
                        <Users className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-sm text-blue-600 font-medium">إجمالي المستخدمين</div>
                        <div className="text-2xl font-black text-blue-900">{users.length}</div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 shadow-sm">
                    <AlertCircle className="w-5 h-5" />
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="p-4 text-gray-600 font-bold">الموظف</th>
                                    <th className="p-4 text-gray-600 font-bold">اسم المستخدم</th>
                                    <th className="p-4 text-gray-600 font-bold">الدور</th>
                                    <th className="p-4 text-gray-600 font-bold">الحالة</th>
                                    <th className="p-4 text-gray-600 font-bold">تاريخ الانضمام</th>
                                    <th className="p-4 text-gray-600 font-bold text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">{u.name}</div>
                                        </td>
                                        <td className="p-4 font-mono text-sm text-gray-600">{u.username}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {u.role === 'ADMIN' ? 'مدير' : 'موظف'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black border ${getStatusColor(u.status)}`}>
                                                {getStatusLabel(u.status)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 text-sm">
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-EG') : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-2">
                                                {u.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(u.id, 'ACTIVE')}
                                                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md shadow-green-500/20 flex items-center gap-1 text-xs font-bold"
                                                        title="موافقة"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                        موافقة
                                                    </button>
                                                )}
                                                {u.status === 'ACTIVE' && u.role !== 'ADMIN' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(u.id, 'INACTIVE')}
                                                        className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1 text-xs font-bold"
                                                        title="إيقاف"
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                        إيقاف
                                                    </button>
                                                )}
                                                {u.status === 'INACTIVE' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(u.id, 'ACTIVE')}
                                                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md shadow-green-500/20 flex items-center gap-1 text-xs font-bold"
                                                        title="تفعيل"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                        تفعيل
                                                    </button>
                                                )}
                                                {u.role !== 'ADMIN' && (
                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="p-2 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
            </div>
        </div>
    );
};

export default UserManagement;
