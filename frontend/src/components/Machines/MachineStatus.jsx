import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { machinesAPI } from '../../services/api';
import { Play, Square, Wrench, Clock, History, DollarSign, Info, CheckCircle, AlertCircle } from 'lucide-react';
import MachineCostsModal from './MachineCostsModal';

export default function MachineStatus() {
    const { machines, setMachines, loading: appLoading } = useApp();
    const [loading, setLoading] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState(null);
    const [statusLogs, setStatusLogs] = useState([]);
    const [showLogs, setShowLogs] = useState(false);
    const [costModalMachine, setCostModalMachine] = useState(null);

    const handleStatusChange = async (machineId, newStatus) => {
        setLoading(true);
        try {
            const updatedMachine = await machinesAPI.changeStatus(machineId, newStatus);
            setMachines(prev => prev.map(m => m.id === machineId ? { ...m, status: newStatus } : m));
            if (selectedMachine && selectedMachine.id === machineId) {
                loadStatusLogs(machineId);
            }
        } catch (error) {
            alert('فشل في تغيير الحالة: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const loadStatusLogs = async (machineId) => {
        try {
            const logs = await machinesAPI.getStatusLogs(machineId);
            setStatusLogs(logs);
        } catch (error) {
            console.error('Failed to load logs:', error);
        }
    };

    const viewHistory = (machine) => {
        setSelectedMachine(machine);
        loadStatusLogs(machine.id);
        setShowLogs(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700 border-green-200';
            case 'STOPPED': return 'bg-red-100 text-red-700 border-red-200';
            case 'MAINTENANCE': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'ACTIVE': return 'نشط (يعمل)';
            case 'STOPPED': return 'متوقف';
            case 'MAINTENANCE': return 'تحت الصيانة';
            default: return status;
        }
    };

    if (appLoading) return <div className="text-center py-10">جاري التحميل...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">إدارة حالات الآلات</h1>
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> نشط</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> متوقف</div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span> صيانة</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {machines.map((machine) => (
                    <div key={machine.id} className={`card border-t-4 transition-all ${machine.status === 'ACTIVE' ? 'border-green-500 shadow-green-50' :
                        machine.status === 'STOPPED' ? 'border-red-500 shadow-red-50' :
                            'border-orange-500 shadow-orange-50'
                        }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{machine.machine_number}</h3>
                                <p className="text-gray-500 text-sm">{machine.machine_type}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(machine.status)}`}>
                                {getStatusText(machine.status)}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => handleStatusChange(machine.id, 'ACTIVE')}
                                    disabled={loading || machine.status === 'ACTIVE'}
                                    className={`btn flex items-center justify-center gap-2 py-3 ${machine.status === 'ACTIVE'
                                        ? 'bg-green-500 text-white cursor-default'
                                        : 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50'
                                        }`}
                                >
                                    <Play size={18} fill={machine.status === 'ACTIVE' ? 'currentColor' : 'none'} />
                                    تشغيل الآلة
                                </button>
                                <button
                                    onClick={() => handleStatusChange(machine.id, 'STOPPED')}
                                    disabled={loading || machine.status === 'STOPPED'}
                                    className={`btn flex items-center justify-center gap-2 py-3 ${machine.status === 'STOPPED'
                                        ? 'bg-red-500 text-white cursor-default'
                                        : 'bg-white border-2 border-red-500 text-red-600 hover:bg-red-50'
                                        }`}
                                >
                                    <Square size={18} fill={machine.status === 'STOPPED' ? 'currentColor' : 'none'} />
                                    إيقاف مؤقت
                                </button>
                                <button
                                    onClick={() => handleStatusChange(machine.id, 'MAINTENANCE')}
                                    disabled={loading || machine.status === 'MAINTENANCE'}
                                    className={`btn flex items-center justify-center gap-2 py-3 ${machine.status === 'MAINTENANCE'
                                        ? 'bg-orange-500 text-white cursor-default'
                                        : 'bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50'
                                        }`}
                                >
                                    <Wrench size={18} />
                                    إرسال للصيانة
                                </button>
                                <button
                                    onClick={() => setCostModalMachine(machine)}
                                    className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 mt-2 flex items-center justify-center gap-2 py-3"
                                >
                                    <DollarSign size={18} />
                                    إدارة التكاليف (ثابتة/متغيرة)
                                </button>
                            </div>

                            <button
                                onClick={() => viewHistory(machine)}
                                className="w-full text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center gap-1 pt-2 border-t border-gray-100"
                            >
                                <History size={14} />
                                عرض سجل الحالات
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* History Modal */}
            {showLogs && selectedMachine && (
                <div className="modal-overlay" onClick={() => setShowLogs(false)}>
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800">سجل حالات الآلة: {selectedMachine.machine_number}</h2>
                                <button onClick={() => setShowLogs(false)} className="text-gray-500 hover:text-gray-700">×</button>
                            </div>

                            <div className="space-y-8">
                                {statusLogs.length === 0 ? (
                                    <p className="text-center py-10 text-gray-500">لا يوجد سجل حالات مسجل لهذه الآلة بعد.</p>
                                ) : (
                                    (() => {
                                        const grouped = statusLogs.reduce((acc, log) => {
                                            const monthKey = new Date(log.start_date).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
                                            if (!acc[monthKey]) acc[monthKey] = [];
                                            acc[monthKey].push(log);
                                            return acc;
                                        }, {});

                                        return Object.entries(grouped).map(([month, logs]) => (
                                            <div key={month} className="space-y-4">
                                                <h3 className="text-lg font-bold text-blue-600 bg-blue-50 p-2 rounded-lg border-r-4 border-blue-500">
                                                    {month}
                                                </h3>
                                                <div className="relative border-r-2 border-gray-200 pr-6 mr-3 space-y-6">
                                                    {logs.map((log) => (
                                                        <div key={log.id} className="relative">
                                                            <div className={`absolute -right-8 top-1 w-4 h-4 rounded-full border-2 border-white ${log.status === 'ACTIVE' ? 'bg-green-500' :
                                                                log.status === 'STOPPED' ? 'bg-red-500' :
                                                                    'bg-orange-500'
                                                                }`}></div>
                                                            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="flex justify-between items-start">
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(log.status)}`}>
                                                                        {getStatusText(log.status)}
                                                                    </span>
                                                                    <div className="text-xs text-gray-500 flex flex-col items-end">
                                                                        <div className="flex items-center gap-1">
                                                                            <Clock size={12} />
                                                                            من: {new Date(log.start_date).toLocaleString('ar-EG', { day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                        {log.end_date && (
                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                <CheckCircle size={12} className="text-green-500" />
                                                                                إلى: {new Date(log.end_date).toLocaleString('ar-EG', { day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()
                                )}
                            </div>

                            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                                <button onClick={() => setShowLogs(false)} className="btn-secondary">إغلاق</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Costs Management Modal */}
            {costModalMachine && (
                <MachineCostsModal
                    machine={costModalMachine}
                    onClose={() => setCostModalMachine(null)}
                />
            )}

            <div className="card bg-blue-50 border-blue-200">
                <div className="flex gap-4 items-start">
                    <Info className="text-blue-500 mt-1" size={24} />
                    <div>
                        <h4 className="font-bold text-blue-800 mb-1">لماذا نهتم بحالة الآلة؟</h4>
                        <p className="text-blue-700 text-sm leading-relaxed">
                            توقيت تشغيل وإيقاف الآلات يؤثر بشكل مباشر على:
                            <br />
                            1. **حساب التكاليف:** يتم توزيع الكهرباء والرواتب بناءً على أيام العمل الفعلية.
                            <br />
                            2. **تقارير الأرباح:** تظهر الأرباح بدقة أكبر عندما نعرف الأيام التي كانت فيها الآلة تنتج فعلياً.
                            <br />
                            3. **جدولة الصيانة:** يساعد تتبع حالة "تحت الصيانة" في معرفة مدى تكرار أعطال الآلة.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
