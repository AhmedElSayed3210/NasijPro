import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
            // Disable scroll on body
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all animate-in fade-in zoom-in duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute left-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                        <AlertTriangle size={32} />
                    </div>

                    {/* Content */}
                    <h3 className="mb-2 text-2xl font-black text-slate-900">
                        {title || 'تأكيد الحذف'}
                    </h3>
                    <p className="mb-8 text-slate-500 leading-relaxed">
                        {message || 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟ سيتم نقله إلى السجلات المؤرشفة ويمكنك استعادته لاحقاً.'}
                    </p>

                    {/* Actions */}
                    <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
                        <button
                            onClick={onConfirm}
                            className="flex-1 rounded-2xl bg-red-600 py-4 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 active:scale-[0.98] transition-all"
                        >
                            تأكيد الحذف
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 rounded-2xl bg-slate-100 py-4 text-sm font-bold text-slate-600 hover:bg-slate-200 active:scale-[0.98] transition-all"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
