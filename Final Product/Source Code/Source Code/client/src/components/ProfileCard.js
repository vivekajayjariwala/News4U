import React from 'react';
import Button from '../components/Button';

// Pass handleAdminChange down as a prop
const ProfileCard = ({ profile, onDelete, onAdminChange }) => {
    
    const handleChange = (e) => {
        const isAdmin = e.target.value === 'admin';
        // Pass the email and the boolean to your parent function
        onAdminChange(profile.email, isAdmin);
    };

    return (
        <div className="group relative border-4 border-black bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-hard overflow-hidden flex flex-col">

            {/* Main Content */}
            <div className="p-4 bg-white flex flex-col flex-grow border-b-4 border-black">
                <h3 className="font-serif font-bold text-xl leading-tight mb-2">
                    {profile?.email}
                </h3>

                <div className="text-sm font-semibold text-gray-700 mb-2 break-words">
                    {profile?.id}
                </div>

                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-auto border-t border-gray-100 pt-3 flex justify-between items-center">
                    <span>Status</span>
                    
                    {/* Subtle Dropdown */}
                    <select 
                        value={profile?.isAdmin ? 'admin' : 'user'}
                        onChange={handleChange}
                        className="bg-transparent font-bold text-black cursor-pointer focus:outline-none hover:text-blue-600 transition-colors"
                    >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            {/* Action Section */}
            <div className="p-4 bg-white">
                <Button
                    variant="primary"
                    onClick={() => onDelete(profile.email)}
                    className="w-full"
                >
                    Delete
                </Button>
            </div>
        </div>
    );
};

export default ProfileCard;