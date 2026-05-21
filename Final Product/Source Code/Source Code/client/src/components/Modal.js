import React from 'react';


const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-md bg-white border-4 border-black shadow-hard animate-fade-in-up">
                <div className="flex justify-between items-center p-6 border-b-4 border-black bg-cream-50">
                    <h3 className="font-serif font-bold text-2xl">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-black hover:text-white transition-colors font-bold"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>

                {footer && (
                    <div className="p-6 border-t-4 border-black bg-gray-50 flex justify-end gap-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
