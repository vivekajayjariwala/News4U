import React from 'react';

const SelectionCard = ({ title, description, icon, selected, onClick, size = 'medium', disabled = false }) => {
    const baseStyles = "border-4 border-black transition-all duration-200 flex flex-col justify-center items-center text-center p-6 relative overflow-hidden";

    const selectedStyles = selected
        ? "bg-soft-blue-400 shadow-none translate-x-[4px] translate-y-[4px]"
        : "bg-white hover:bg-gray-50 shadow-hard hover:shadow-hard-sm hover:translate-x-[2px] hover:translate-y-[2px]";

    const disabledStyles = disabled
        ? "opacity-50 cursor-not-allowed"
        : "cursor-pointer";

    const sizeStyles = size === 'large' ? 'h-64' : 'h-40';

    return (
        <div
            onClick={disabled ? undefined : onClick}
            className={`${baseStyles} ${selectedStyles} ${sizeStyles} ${disabledStyles}`}
        >
            {selected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            {icon && <div className="text-4xl mb-3">{icon}</div>}
            <h3 className="font-black text-xl uppercase tracking-tight">{title}</h3>
            {description && <p className="mt-2 font-medium text-sm leading-tight opacity-80">{description}</p>}
        </div>
    );
};

export default SelectionCard;
