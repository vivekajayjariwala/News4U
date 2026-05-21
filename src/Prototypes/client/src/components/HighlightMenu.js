import React, { useState } from 'react';
import Button from './Button';

const HighlightMenu = ({ position, onAction, onClose }) => {
    const [customQuery, setCustomQuery] = useState('');

    if (!position) return null;

    return (
        <div
            className="absolute z-50 bg-white border-4 border-black shadow-hard p-4 flex flex-col gap-3 animate-fade-in-up w-72"
            style={{
                top: position.top + window.scrollY - 180, // Position above selection
                left: position.left + (position.width / 2) - 144 // Center horizontally
            }}
        >
            <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2">
                <span className="font-bold text-sm uppercase tracking-wider text-gray-500">AI Assistant</span>
                <button onClick={onClose} className="text-gray-400 hover:text-black font-bold">✕</button>
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    className="flex-1 text-xs px-2 py-2"
                    onClick={() => onAction('simplify')}
                >
                    Simplify
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 text-xs px-2 py-2"
                    onClick={() => onAction('explain')}
                >
                    Explain
                </Button>
            </div>

            <div className="relative">
                <input
                    type="text"
                    placeholder="Ask a question..."
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    className="w-full border-2 border-black p-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-soft-blue-400"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onAction('custom', customQuery);
                    }}
                />
                <button
                    onClick={() => onAction('custom', customQuery)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-soft-blue-500 font-bold hover:text-black"
                >
                    →
                </button>
            </div>
        </div>
    );
};

export default HighlightMenu;
