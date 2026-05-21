import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import ProfileCard from '../components/ProfileCard';
import { request } from '../utils/httpClient';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';

const AdminProfilesPage = () => {
    const { user, fetchWithAuth } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user?.isAdmin) return;

        let cancelled = false;

        const fetchAllUsers = async () => {
            setError('');
            setLoadingProfiles(true); 
            console.log("fetching")  

            try {

                const response = await fetchWithAuth(
                `${config.api.endpoints.admin}/users/all`
                );


                setProfiles(response.users);

            } catch (err) {
                console.error('Failed to fetch users', err);
                setError(err.message || 'Unable to load users.');
            } finally {
                setLoadingProfiles(false);  
            }
        };

        fetchAllUsers();

        return () => {
            cancelled = true;
        };
    }, [user]);



    const handleDeleteUser = async (email) => {
        setError('');

        try {
            await fetchWithAuth(
                `${config.api.endpoints.admin}/users/${encodeURIComponent(email)}`,
                { method: 'DELETE' }
            );


            // Remove deleted user from UI immediately
            setProfiles((prev) =>
                prev.filter((profile) => profile.email !== email)
            );

        } catch (err) {
            console.error('Delete failed:', err);
            setError(err.message || 'Unable to delete user.');
        }
    };

    const handleAdminChange = async (targetEmail, newIsAdminStatus) => {
        // Safety check: Prevents the logged-in admin from demoting themselves
        if (targetEmail === user.email && !newIsAdminStatus) {
            setError("You cannot demote yourself. Another admin must do this.");
            throw new Error("Self-demotion prevented.");
        }

        setError('');
        try {
            const endpoint = newIsAdminStatus ? 'promote' : 'demote';

            await fetchWithAuth(
                `${config.api.endpoints.admin}/users/${endpoint}`,
                {
                    method: 'POST',
                    body: { email: targetEmail },
                }
            );

            // Update local state for that specific email
            setProfiles((prev) =>
                prev.map((p) => (p.email === targetEmail ? { ...p, isAdmin: newIsAdminStatus } : p))
            );
        } catch (err) {
            setError(err.message || 'Update failed');
            throw err;
        }
    };

    // Block non-admins entirely
    if (!user?.isAdmin) {
        return (
            <div className="min-h-screen bg-cream-50 flex items-center justify-center">
                <div className="bg-white border-4 border-black p-10 shadow-hard text-center">
                    <h1 className="font-serif text-3xl font-black mb-4">
                        Access Denied
                    </h1>
                    <p className="font-semibold text-gray-600 mb-6">
                        You do not have permission to view this page.
                    </p>
                    <Link to="/">
                        <Button variant="secondary">Go Home</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
                    <div>
                        <h1 className="font-serif text-4xl font-black">
                            All User Profiles
                        </h1>
                        <p className="font-semibold text-gray-600">
                            Manage platform users.
                        </p>
                    </div>

                    <Link to="/settings">
                        <Button variant="secondary">
                            ← Back to Settings
                        </Button>
                    </Link>
                </header>

                {error && (
                    <p className="text-red-500 font-bold text-sm bg-red-50 p-3 border-l-4 border-red-500 mb-6">
                        {error}
                    </p>
                )}

                {loadingProfiles ? (
                    <p className="font-semibold text-gray-600">
                        Loading profiles...
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {profiles.length > 0 ? (
                            profiles.map((profile) => (
                                <ProfileCard
                                    key={profile.id}
                                    profile={profile}
                                    onDelete={handleDeleteUser}
                                    onAdminChange={handleAdminChange}
                                />
                            ))
                        ) : (
                            <p className="font-semibold text-gray-600">
                                No users found.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProfilesPage;
