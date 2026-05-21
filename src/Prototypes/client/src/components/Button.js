import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
    const baseStyles = "font-bold border-2 border-black px-6 py-3 transition-all shadow-hard hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]";

    const variants = {
        primary: "bg-soft-blue-400 hover:bg-soft-blue-500 text-black",
        secondary: "bg-white hover:bg-gray-100 text-black",
        outline: "bg-transparent hover:bg-black hover:text-white text-black"
    };

    return (
        <button
            onClick={onClick}
            type={type}
            disabled={disabled}
            className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;
