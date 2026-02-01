import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './components/Dashboard/Dashboard';
import Machines from './components/Machines/Machines';
import Shareholders from './components/Shareholders/Shareholders';
import Clients from './components/Clients/Clients';
import Employees from './components/Employees/Employees';
import Operations from './components/Operations/Operations';
import Maintenance from './components/Maintenance/Maintenance';
import Production from './components/Production/Production';
import Finance from './components/Finance/Finance';
import MachineStatus from './components/Machines/MachineStatus';
import Reports from './components/Reports/Reports';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import UserManagement from './components/Admin/UserManagement';
import UserPermissions from './components/Admin/UserPermissions';

import {
    LayoutDashboard,
    Settings,
    Users,
    Briefcase,
    UserCircle,
    Activity,
    Wrench,
    Package,
    DollarSign,
    FileText,
    ShieldCheck,
    ShieldAlert,
    LogOut,
    User,
    Shield
} from 'lucide-react';
import './index.css';

const MainApp = () => {
    const { user, handleLogout, loading } = useApp();
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (hash === 'register') setAuthMode('register');
            else if (hash === 'login') setAuthMode('login');
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-blue-900 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-400 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return authMode === 'register' ? <Register /> : <Login />;
    }

    const allPages = [
        { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
        { id: 'machines', label: 'الآلات', icon: Settings },
        { id: 'machine-status', label: 'الإدارة التشغيلية', icon: Activity },
        { id: 'shareholders', label: 'المساهمون', icon: Users },
        { id: 'clients', label: 'عملاء التصنيع', icon: Briefcase },
        { id: 'employees', label: 'الموظفون', icon: UserCircle },
        { id: 'operations', label: 'العمليات', icon: Activity },
        { id: 'maintenance', label: 'الصيانة', icon: Wrench },
        { id: 'production', label: 'سجلات الإنتاج', icon: Package },
        { id: 'finance', label: 'المالية', icon: DollarSign },
        { id: 'reports', label: 'التقارير', icon: FileText },
    ];

    // Filter menu items based on permissions
    const menuItems = allPages.filter(item => {
        if (user.role === 'ADMIN') return true;
        return user.permissions?.[item.id] === true;
    });

    // Admin only pages
    if (user.role === 'ADMIN') {
        menuItems.push({ id: 'user-management', label: 'إدارة المستخدمين', icon: ShieldCheck });
        menuItems.push({ id: 'user-permissions', label: 'صلاحيات المستخدمين', icon: ShieldCheck });
    }

    const renderPage = () => {
        // Permission check for the current page
        const hasPermission = user.role === 'ADMIN' ||
            user.permissions?.[currentPage] === true;

        if (!hasPermission && !['user-management', 'user-permissions'].includes(currentPage)) {
            return (
                <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
                    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <ShieldAlert size={48} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">عذراً، لا تمتلك الصلاحية</h2>
                    <p className="text-gray-500 max-w-md">ليس لديك إذن للوصول إلى هذه الصفحة. يرجى التواصل مع مسؤول النظام لطلب الصلاحية.</p>
                </div>
            );
        }

        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'machines': return <Machines />;
            case 'machine-status': return <MachineStatus />;
            case 'shareholders': return <Shareholders />;
            case 'clients': return <Clients />;
            case 'employees': return <Employees />;
            case 'operations': return <Operations />;
            case 'maintenance': return <Maintenance />;
            case 'production': return <Production />;
            case 'finance': return <Finance />;
            case 'reports': return <Reports />;
            case 'user-management': return <UserManagement />;
            case 'user-permissions': return <UserPermissions />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-72 bg-gradient-to-b from-blue-900 to-indigo-900 text-white shadow-2xl z-20 sticky top-0 h-screen overflow-y-auto">
                <div className="p-8">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-20 h-20 bg-blue-500 rounded-2xl mb-4 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Activity size={40} />
                        </div>
                        <h1 className="text-xl font-black text-center">نظام إدارة المصنع</h1>
                        <div className="mt-4 px-3 py-1 bg-white/10 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            {user.name} ({user.role === 'ADMIN' ? 'مدير' : 'موظف'})
                        </div>
                    </div>

                    <nav className="space-y-1.5">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentPage(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${currentPage === item.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                        : 'text-blue-100 hover:bg-white/5 hover:translate-x-[-4px]'
                                        }`}
                                >
                                    <Icon size={20} className={currentPage === item.id ? 'text-white' : 'text-blue-300'} />
                                    <span className="font-bold text-sm">{item.label}</span>
                                </button>
                            );
                        })}

                        <div className="pt-8 mt-8 border-t border-white/10">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-200 hover:bg-red-500/10 hover:text-red-100 transition-all font-bold text-sm"
                            >
                                <LogOut size={20} />
                                <span>تسجيل الخروج</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-[#F8FAFC]">
                <div className="p-10 max-w-[1600px] mx-auto">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
};

function App() {
    return (
        <AppProvider>
            <MainApp />
        </AppProvider>
    );
}

export default App;
