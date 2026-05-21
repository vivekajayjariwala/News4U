import React from 'react';

const Input = ({ label, type = "text", placeholder, value, onChange, name, required = false }) => {
    return (
        <div className="flex flex-col space-y-2">
            {label && (
                <label className="font-bold text-lg uppercase tracking-wide">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="border-4 border-black p-4 font-bold text-lg bg-white focus:outline-none focus:ring-4 focus:ring-soft-blue-300 transition-all placeholder-gray-400 shadow-hard-sm focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px]"
            />
        </div>
    );
};

export default Input;
