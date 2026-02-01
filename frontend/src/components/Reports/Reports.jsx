import html2pdf from 'html2pdf.js';
import { useState, useRef } from 'react';
import { reportsAPI } from '../../services/api';
import { FileText, Download, ChevronDown, ChevronUp, PieChart, Activity, DollarSign, Users } from 'lucide-react';

export default function Reports() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedMachineId, setSelectedMachineId] = useState('all');
    const [expandedMachine, setExpandedMachine] = useState(null);
    const reportRef = useRef();

    const loadReport = async () => {
        setLoading(true);
        try {
            const data = await reportsAPI.getMonthly(year, month);
            setReport(data);
        } catch (error) {
            alert('فشل في تحميل التقرير: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        const element = reportRef.current;
        const opt = {
            margin: 10,
            filename: `تقرير_شهر_${month}_${year}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        // Standard html2pdf download
        html2pdf().set(opt).from(element).save();
    };

    const selectedMachine = report && selectedMachineId !== 'all'
        ? report.report.find(m => String(m.machine_id) === String(selectedMachineId))
        : null;

    const filteredMachines = report
        ? (selectedMachineId === 'all' ? report.report : [selectedMachine].filter(Boolean))
        : [];

    if (loading && !report) return <div className="text-center py-20">جاري إنشاء التقارير...</div>;

    return (
        <div className="space-y-6 pb-20 printable-area">
            <div className="flex justify-between items-center no-print">
                <h1 className="text-3xl font-bold text-gray-800">مركز التقارير التحليلية</h1>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        className="group relative flex items-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-emerald-200 active:scale-95 whitespace-nowrap"
                    >
                        <Download size={20} className="transition-transform group-hover:animate-bounce" />
                        <span>تحميل التقرير كـ PDF</span>
                    </button>
                    <button onClick={loadReport} className="btn-primary flex items-center gap-2 group" disabled={loading}>
                        <FileText size={18} className="group-hover:rotate-12 transition-transform" />
                        {loading ? 'جاري التحديث...' : 'تحديث البيانات'}
                    </button>
                </div>
            </div>

            {/* Controls Area (No Print) */}
            <div className="card no-print">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600">السنة</label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="input-field"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600">الشهر</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="input-field"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <option key={m} value={m}>
                                    {new Date(2024, m - 1).toLocaleDateString('ar-EG', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-600">الآلة</label>
                        <select
                            value={selectedMachineId}
                            onChange={(e) => setSelectedMachineId(e.target.value)}
                            className="input-field"
                        >
                            <option value="all">كافة الآلات (تقرير مجمع)</option>
                            {report?.report.map(m => (
                                <option key={m.machine_id} value={m.machine_id}>{m.machine_number} - {m.machine_type}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {report && (
                <div ref={reportRef} className="space-y-8">
                    {/* Header for Print */}
                    <div className="hidden print:block text-center mb-8 border-b pb-6">
                        <h1 className="text-3xl font-bold mb-2">تقرير الأداء المالي والتشغيلي</h1>
                        <p className="text-gray-600">
                            لشهر: {new Date(year, month - 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                        </p>
                        {selectedMachine && (
                            <p className="font-bold text-blue-600 mt-2">
                                الآلة: {selectedMachine.machine_number}
                            </p>
                        )}
                    </div>

                    {/* summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card border-r-4 border-green-500 bg-green-50/30">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
                                    <h3 className="text-2xl font-bold text-green-700 mt-1">
                                        {(selectedMachineId === 'all'
                                            ? report.summary.total_revenue
                                            : selectedMachine?.financials?.revenue || 0
                                        ).toLocaleString('ar-EG')} ج.م
                                    </h3>
                                </div>
                                <Activity className="text-green-500" size={24} />
                            </div>
                        </div>
                        <div className="card border-r-4 border-red-500 bg-red-50/30">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-600">إجمالي المصروفات</p>
                                    <h3 className="text-2xl font-bold text-red-700 mt-1">
                                        {(selectedMachineId === 'all'
                                            ? report.summary.total_expenses
                                            : selectedMachine?.financials?.total_expenses || 0
                                        ).toLocaleString('ar-EG')} ج.م
                                    </h3>
                                </div>
                                <PieChart className="text-red-500" size={24} />
                            </div>
                        </div>
                        <div className="card border-r-4 border-blue-500 bg-blue-50/30">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-600">صافي الربح</p>
                                    <h3 className="text-2xl font-bold text-blue-700 mt-1">
                                        {(selectedMachineId === 'all'
                                            ? report.summary.total_net_profit
                                            : selectedMachine?.financials?.net_profit || 0
                                        ).toLocaleString('ar-EG')} ج.م
                                    </h3>
                                </div>
                                <DollarSign className="text-blue-500" size={24} />
                            </div>
                        </div>
                        <div className="card border-r-4 border-indigo-500 bg-indigo-50/30">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-600">أيام العمل الإجمالية</p>
                                    <h3 className="text-2xl font-bold text-indigo-700 mt-1">
                                        {(selectedMachineId === 'all'
                                            ? report.summary.total_working_days.toFixed(1)
                                            : selectedMachine?.metrics?.working_days?.toFixed(1) || '0.0'
                                        )} يوم
                                    </h3>
                                </div>
                                <Users className="text-indigo-500" size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Operational Table */}
                    <div className="card">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            التحليل التشغيلي والأداء
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right divide-y">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-4 text-sm font-bold text-gray-600">الآلة</th>
                                        <th className="p-4 text-sm font-bold text-gray-600">أيام التشغيل</th>
                                        <th className="p-4 text-sm font-bold text-gray-600">أيام التوقف</th>
                                        <th className="p-4 text-sm font-bold text-gray-600">أيام الصيانة</th>
                                        <th className="p-4 text-sm font-bold text-gray-600">نسبة الاستغلال</th>
                                        <th className="p-4 text-sm font-bold text-gray-600">الملكية</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredMachines.map(machine => (
                                        <tr key={machine.machine_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800">{machine.machine_number}</div>
                                                <div className="text-xs text-gray-500">{machine.machine_type}</div>
                                            </td>
                                            <td className="p-4 text-green-600 font-medium">{machine.metrics?.working_days?.toFixed(1) || '0.0'} يوم</td>
                                            <td className="p-4 text-red-600">{machine.metrics?.stopped_days?.toFixed(1) || '0.0'} يوم</td>
                                            <td className="p-4 text-orange-600">{machine.metrics?.maintenance_days?.toFixed(1) || '0.0'} يوم</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${machine.metrics?.utilization > 70 ? 'bg-green-500' : machine.metrics?.utilization > 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                                                            style={{ width: `${Math.min(100, machine.metrics?.utilization || 0)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs font-bold w-10">{(machine.metrics?.utilization || 0).toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${machine.owner_type === 'FACTORY' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {machine.owner_type === 'FACTORY' ? 'المصنع' : machine.shareholder_name}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Detailed Table */}
                    <div className="card overflow-hidden">
                        <h2 className="text-xl font-bold mb-6">التحليل المالي وتوزيع الأرباح</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right divide-y">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-4">الآلة</th>
                                        <th className="p-4">إيرادات التشغيل</th>
                                        <th className="p-4">مصاريف مخصصة</th>
                                        <th className="p-4">مصاريف مباشرة</th>
                                        <th className="p-4">صافي الربح</th>
                                        <th className="p-4">حصة المصنع</th>
                                        <th className="p-4">حصة المساهم</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredMachines.map(machine => (
                                        <tr key={machine.machine_id} className="hover:bg-gray-50 group">
                                            <td className="p-4 font-bold">{machine.machine_number}</td>
                                            <td className="p-4 text-green-600 font-bold">
                                                {(machine.financials?.revenue || 0).toLocaleString('ar-EG')}
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => setExpandedMachine(expandedMachine === machine.machine_id ? null : machine.machine_id)}
                                                    className="flex items-center gap-1 text-gray-600 hover:text-blue-600 no-print"
                                                >
                                                    {(machine.financials?.allocated_expenses || 0).toLocaleString('ar-EG')}
                                                    {expandedMachine === machine.machine_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                                <span className="hidden print:inline">{(machine.financials?.allocated_expenses || 0).toLocaleString('ar-EG')}</span>
                                            </td>
                                            <td className="p-4 text-red-500">{(machine.financials?.direct_expenses || 0).toLocaleString('ar-EG')}</td>
                                            <td className="p-4 font-black">
                                                {(machine.financials?.net_profit || 0).toLocaleString('ar-EG')}
                                            </td>
                                            <td className="p-4 text-blue-700 font-bold">{(machine.financials?.factory_share || 0).toLocaleString('ar-EG')}</td>
                                            <td className="p-4 text-purple-700 font-bold">
                                                {machine.financials?.shareholder_share > 0 ? machine.financials.shareholder_share.toLocaleString('ar-EG') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-100 font-black">
                                    <tr>
                                        <td className="p-4">الإجمالي الكلي</td>
                                        <td className="p-4 text-green-700">{report.summary.total_revenue.toLocaleString('ar-EG')}</td>
                                        <td colSpan="2" className="p-4 text-red-700 text-center">
                                            إجمالي المصاريف: {report.summary.total_expenses.toLocaleString('ar-EG')} ج.م
                                        </td>
                                        <td className="p-4 text-blue-700">{report.summary.total_net_profit.toLocaleString('ar-EG')}</td>
                                        <td className="p-4 text-blue-800">{report.summary.total_factory_share.toLocaleString('ar-EG')}</td>
                                        <td className="p-4 text-purple-800">{report.summary.total_shareholder_share.toLocaleString('ar-EG')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Breakdown of Allocated Expenses for the summary if consolidated */}
                    {selectedMachineId === 'all' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="card bg-gray-50 border-gray-200">
                                <h3 className="font-bold mb-4 text-gray-800">تفاصيل المصروفات المشتركة (المخصصة)</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <span className="text-gray-600">إجمالي الرواتب الشهرية</span>
                                        <span className="font-bold">{report.summary.total_salaries.toLocaleString('ar-EG')} ج.م</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <span className="text-gray-600">المصروفات العامة (إيجار، كهرباء...)</span>
                                        <span className="font-bold">{report.summary.shared_expenses.toLocaleString('ar-EG')} ج.م</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-lg pt-2">
                                        <span>الإجمالي المطلوب توزيعه</span>
                                        <span className="text-red-600">{(report.summary.total_salaries + report.summary.shared_expenses).toLocaleString('ar-EG')} ج.م</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                                        * يتم توزيع هذا المبلغ على الآلات بناءً على نسبة أيام العمل الفعلية بدلاً من التوزيع المتساوي.
                                    </p>
                                </div>
                            </div>

                            <div className="card bg-purple-50 border-purple-200">
                                <h3 className="font-bold mb-4 text-purple-800 italic">مبالغ التسوية المستحقة للمساهمين</h3>
                                <div className="space-y-3">
                                    {report.report.filter(m => m.owner_type === 'SHAREHOLDER' && m.financials?.shareholder_share > 0).map(m => (
                                        <div key={m.machine_id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                                            <div>
                                                <div className="font-bold">{m.shareholder_name}</div>
                                                <div className="text-xs text-gray-500">آلة رقم: {m.machine_number}</div>
                                            </div>
                                            <div className="text-xl font-black text-purple-700">
                                                {m.financials.shareholder_share.toLocaleString('ar-EG')}
                                            </div>
                                        </div>
                                    ))}
                                    {report.report.filter(m => m.owner_type === 'SHAREHOLDER' && m.financials?.shareholder_share > 0).length === 0 && (
                                        <p className="text-center text-gray-400 py-8">لا يوجد مستحقات لمساهمين هذا الشهر</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Machine Specific Detail Section */}
                    {selectedMachine && (
                        <div className="card bg-blue-50 border-blue-200">
                            <h3 className="font-bold mb-4 text-blue-800">تفاصيل مصاريف الآلة {selectedMachine.machine_number}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">مصاريف التشغيل والمباشرة</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">أعمال الصيانة</span>
                                            <span className="font-medium text-red-600">{(selectedMachine.financials?.maintenance_cost || 0).toLocaleString('ar-EG')} ج.م</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">مصروفات تشغيل مباشرة</span>
                                            <span className="font-medium text-red-600">{(selectedMachine.financials?.direct_expenses || 0).toLocaleString('ar-EG')} ج.م</span>
                                        </div>
                                        {(selectedMachine.financials?.cost_breakdown || []).map((c, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span className="text-gray-600">{c.category} ({c.type === 'FIXED' ? 'ثابت' : 'متغير'})</span>
                                                <span className="font-medium text-red-600">{(c.amount || 0).toLocaleString('ar-EG')} ج.م</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">توزيع الحصة</h4>
                                    <div className="p-4 bg-white rounded-lg border border-blue-100">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-600">حصة المصنع</span>
                                            <span className="font-bold text-blue-700">{(selectedMachine.financials?.factory_share || 0).toLocaleString('ar-EG')} ج.م</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                حصة العميل ({selectedMachine.owner_type === 'FACTORY'
                                                    ? '0'
                                                    : (100 - (parseFloat(selectedMachine.factory_profit_percentage) || 50))
                                                }%)
                                            </span>
                                            <span className="font-bold text-purple-700">{(selectedMachine.financials?.client_share || 0).toLocaleString('ar-EG')} ج.م</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Legend / Info */}
            <div className="card border-0 bg-info-50 flex gap-4 no-print mt-8">
                <div className="bg-blue-500 text-white p-3 rounded-lg self-start">
                    <DollarSign size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-800">كيف يتم احتساب المصروفات؟</h4>
                    <p className="text-sm text-blue-700 leading-relaxed mt-1">
                        يعتمد النظام على **التوزيع العادل للمصاريف** المشتركة. بدلاً من تقسيم الرواتب والكهرباء بالتساوي، يتم حساب "يومية التشغيل" الكلية وتوزيع التكاليف بناءً على الأيام التي كانت فيها كل آلة في حالة **نشطة (Active)** فعلياً.
                    </p>
                </div>
            </div>
        </div>
    );
}
