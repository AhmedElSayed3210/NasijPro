import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { Shield, CheckCircle, XCircle, User, Users, Search, Save, Loader2, ChevronRight, Lock } from 'lucide-react';

export default function UserPermissions() {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const systemPages = [
        { id: 'dashboard', label: 'لوحة التحكم' },
        { id: 'machines', label: 'الآلات' },
        { id: 'machine-status', label: 'الإدارة التشغيلية' },
        { id: 'shareholders', label: 'المساهمون' },
        { id: 'clients', label: 'عملاء التصنيع' },
        { id: 'employees', label: 'الموظفون' },
        { id: 'operations', label: 'العمليات' },
        { id: 'maintenance', label: 'الصيانة' },
        { id: 'production', label: 'سجلات الإنتاج' },
        { id: 'finance', label: 'المالية' },
        { id: 'reports', label: 'التقارير' },
        { id: 'user-management', label: 'إدارة المستخدمين' }
    ];

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await usersAPI.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserPermissions = async (user) => {
        setSelectedUser(user);
        setLoading(true);
        try {
            const data = await usersAPI.getPermissions(user.id);
            // Map saved permissions or initialize with defaults
            const userPerms = systemPages.map(page => {
                const existing = data.find(p => p.page_name === page.id);
                return {
                    page_name: page.id,
                    label: page.label,
                    has_access: existing ? existing.has_access : false
                };
            });
            setPermissions(userPerms);
        } catch (error) {
            console.error('Failed to load permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePermission = (pageName) => {
        setPermissions(permissions.map(p =>
            p.page_name === pageName ? { ...p, has_access: !p.has_access } : p
        ));
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            await usersAPI.updatePermissions(selectedUser.id, permissions);
            setMessage({ type: 'success', text: 'تم حفظ الصلاحيات بنجاح' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'فشل في حفظ الصلاحيات: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                    <Shield size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">صلاحيات المستخدمين</h1>
                    <p className="text-gray-500">إدارة وصول الموظفين لصفحات النظام</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* User Selection List */}
                <div className="card h-[calc(100vh-250px)] flex flex-col p-4">
                    <div className="relative mb-4">
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="بحث عن مستخدم..."
                            className="input-field pr-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1">
                        {loading && users.length === 0 ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">لا يوجد مستخدمين</div>
                        ) : (
                            filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    onClick={() => loadUserPermissions(user)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedUser?.id === user.id
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 text-right">
                                        <div className={`p-2 rounded-lg ${selectedUser?.id === user.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{user.name}</p>
                                            <p className="text-xs opacity-70">{user.role === 'ADMIN' ? 'مدير' : 'موظف'}</p>
                                        </div>
                                    </div>
                                    {selectedUser?.id === user.id && <ChevronRight size={18} className="rotate-180" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Permissions Management */}
                <div className="lg:col-span-2 space-y-4">
                    {!selectedUser ? (
                        <div className="card h-full flex flex-col items-center justify-center text-gray-400 p-10 min-h-[400px]">
                            <Lock size={48} className="mb-4 opacity-20" />
                            <p>قم باختيار مستخدم لمشاهدة وتعديل صلاحياته</p>
                        </div>
                    ) : (
                        <div className="card p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-8 pb-4 border-b">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{selectedUser.name}</h3>
                                        <p className={`text-sm ${selectedUser.role === 'ADMIN' ? 'text-amber-600 font-bold' : 'text-gray-500'}`}>
                                            {selectedUser.role === 'ADMIN' ? 'المدير لديه كامل الصلاحيات تلقائياً' : 'تخصيص صلاحيات الموظف'}
                                        </p>
                                    </div>
                                </div>

                                {selectedUser.role !== 'ADMIN' && (
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                        حفظ التغييرات
                                    </button>
                                )}
                            </div>

                            {message && (
                                <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                                    }`}>
                                    {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                    <p className="font-medium">{message.text}</p>
                                </div>
                            )}

                            {selectedUser.role === 'ADMIN' ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <Shield size={40} className="text-amber-500 mb-4" />
                                    <p className="text-gray-500 font-medium">المدير يمتلك حق الوصول إلى جميع واجهات النظام</p>
                                </div>
                            ) : (
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2">
                                    {permissions.map((perm) => (
                                        <div
                                            key={perm.page_name}
                                            onClick={() => handleTogglePermission(perm.page_name)}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${perm.has_access
                                                    ? 'border-blue-500 bg-blue-50/50'
                                                    : 'border-gray-100 bg-white hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${perm.has_access ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                                                    }`}>
                                                    <Lock size={18} className={perm.has_access ? 'hidden' : 'block'} />
                                                    <CheckCircle size={18} className={perm.has_access ? 'block' : 'hidden'} />
                                                </div>
                                                <span className={`font-bold ${perm.has_access ? 'text-blue-700' : 'text-gray-600'}`}>
                                                    {perm.label}
                                                </span>
                                            </div>

                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${perm.has_access ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                                }`}>
                                                {perm.has_access && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
