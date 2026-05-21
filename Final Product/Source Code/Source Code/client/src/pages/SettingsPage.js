import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/httpClient';
import config from '../config/config';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, profile, loadProfile, logout, fetchWithAuth } = useAuth();
    const [loadingProfile, setLoadingProfile] = useState(!profile);
    const [error, setError] = useState('');
    const [alerts, setAlerts] = useState([]);

    const fetchAlerts = async () => {
        try {
            const data = await fetchWithAuth(config.api.endpoints.alerts);
            setAlerts(data);
            // If no alerts, create one with empty topics
            if (data.length === 0) {
                await fetchWithAuth(config.api.endpoints.alerts, {
                    method: 'POST',
                    body: { topics: [] },
                });
                const newData = await fetchWithAuth(config.api.endpoints.alerts);
                setAlerts(newData);
            }
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        }
    };

    useEffect(() => {
        let isMounted = true;

        setLoadingProfile(true);
        loadProfile(true)
            .catch((err) => {
                if (isMounted) {
                    console.error('Profile fetch failed', err);
                    setError('We could not load your profile right now.');
                }
            })
            .finally(() => {
                if (isMounted) {
                    setLoadingProfile(false);
                }
            });

        fetchAlerts();

        return () => {
            isMounted = false;
        };
    }, [loadProfile]);

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    const handleAdminChange = async (email, isAdmin) => {
        setError('');

        try {
            if (!email) {
                throw new Error('User email is required.');
            }

            const endpoint = isAdmin ? 'promote' : 'demote';

            const response = await request(
                `${config.api.endpoints.admin}/users/${endpoint}`,
                {
                    method: 'POST',
                    body: { email },
                }
            );

            await loadProfile(true);

        } catch (err) {
            console.error('Admin update failed', err);
            setError(err.message || 'Unable to update admin status.');
        }
    };

    // local copy of the user's preferences so we can make optimistic UI updates
    // and later send changes to the server.  `profile?.profile` comes from context
    // but it isn't a state setter, so we mirror it here and keep it in state.
    const [prefs, setPrefs] = useState(profile?.profile || {});

    // whenever the profile object changes (e.g. after a reload) keep our local
    // state in sync
    useEffect(() => {
        setPrefs(profile?.profile || {});
    }, [profile]);

    const removeTopic = async (topicToRemove) => {
        setError('');

        // compute new list and update UI immediately
        const newTopics = (prefs.preferredTopics || []).filter(
            (topic) => topic !== topicToRemove
        );
        setPrefs((prev) => ({
            ...prev,
            preferredTopics: newTopics,
        }));

        // call backend; if it fails, revert state and show error
        try {
            // authenticated request; will automatically handle token refresh
            await fetchWithAuth(`${config.api.endpoints.profile}`, {
                method: 'PATCH',
                body: { preferredTopics: newTopics },
            });

            // refresh the global profile so other pages stay in sync
            await loadProfile(true);
        } catch (err) {
            console.error('Failed to remove topic', err);
            setError('Unable to update topics. Please try again.');
            // rollback optimistic update
            setPrefs((prev) => ({
                ...prev,
                preferredTopics: [...(prev.preferredTopics || []), topicToRemove],
            }));
        }
    };

    const addAlert = async () => {
        // Navigate to add topics for alerts
        navigate('/settings/alerts/topics');
    };

    const removeAlertTopic = async (topicToRemove) => {
        if (!alerts[0]) return;
        setError('');
        const alertId = alerts[0].id;
        const newTopics = (alerts[0].topics || []).filter(
            (topic) => topic !== topicToRemove
        );
        setAlerts((prev) => [{ ...prev[0], topics: newTopics }]);

        try {
            await fetchWithAuth(`${config.api.endpoints.alerts}/${alertId}`, {
                method: 'PATCH',
                body: { topics: newTopics },
            });
        } catch (err) {
            console.error('Failed to remove alert topic', err);
            setError('Unable to update alert topics. Please try again.');
            // Rollback
            setAlerts((prev) => [{ ...prev[0], topics: [...(prev[0].topics || []), topicToRemove] }]);
        }
    };

    // use the local state for rendering instead of `preferences`
    const preferences = prefs;

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-4xl mx-auto bg-white border-4 border-black shadow-hard p-10">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-serif text-4xl font-black">Account Settings</h1>
                        <p className="font-semibold text-gray-600">Manage your News 4 U profile and preferences.</p>
                    </div>
                    <Button variant="secondary" onClick={handleLogout}>
                        Log Out
                    </Button>
                </header>

                {error && (
                    <p className="text-red-500 font-bold text-sm bg-red-50 p-3 border-l-4 border-red-500 mb-6">
                        {error}
                    </p>
                )}

                {loadingProfile ? (
                    <p className="font-semibold text-gray-600">Loading your settings...</p>
                ) : (
                    <div className="space-y-10">
                        <section>
                            <h2 className="font-serif text-2xl font-bold mb-4">Account</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Full Name</p>
                                    <p className="font-semibold text-lg">{preferences.fullName || user?.fullName || '—'}</p>
                                </div>
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Email</p>
                                    <p className="font-semibold text-lg break-words">{user?.email}</p>
                                </div>
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Verified</p>
                                    <p className="font-semibold text-lg">{user?.isVerified ? 'Yes' : 'No'}</p>
                                </div>
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Admin</p>
                                    <p className="font-semibold text-lg"> {user?.isAdmin ? "Yes" : "No"} </p>
                                    
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="font-serif text-2xl font-bold mb-4">Reading Preferences</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Complexity</p>
                                    <p className="font-semibold text-lg">{preferences.complexityPreference || 'intermediate'}</p>
                                </div>
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Font Size</p>
                                    <p className="font-semibold text-lg">{preferences.fontSize || 16}px</p>
                                </div>
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">High Contrast</p>
                                    <p className="font-semibold text-lg">{preferences.highContrastMode ? 'Enabled' : 'Disabled'}</p>
                                </div>
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">Screen Reader</p>
                                    <p className="font-semibold text-lg">{preferences.screenReaderEnabled ? 'Enabled' : 'Disabled'}</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-serif text-2xl font-bold">Topics</h2>
                                <button
                                    onClick={() => navigate('/settings/topics')}
                                    className="text-2xl font-bold leading-none hover:text-blue-600"
                                    title="Add topic"
                                >
                                    +
                                </button>
                            </div>

                            <div className="border-2 border-black bg-cream-100 p-4">
                                <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-2">
                                Preferred Topics
                                </p>

                                <div className="flex flex-wrap gap-2">
                                {(preferences.preferredTopics || []).length > 0 ? (
                                    preferences.preferredTopics.map((topic) => (
                                    <span
                                        key={topic}
                                        className="flex items-center gap-2 px-3 py-1 border-2 border-black bg-white font-semibold text-sm"
                                    >
                                        {topic}

                                        <button
                                        onClick={() => removeTopic(topic)}
                                        className="ml-1 text-black hover:text-red-600 font-bold"
                                        >
                                        ×
                                        </button>
                                    </span>
                                    ))
                                ) : (
                                    <span className="font-semibold text-gray-600">
                                    No topics selected yet.
                                    </span>
                                )}
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-serif text-2xl font-bold">Alert Topics</h2>
                                <button
                                    onClick={addAlert}
                                    className="text-2xl font-bold leading-none hover:text-blue-600"
                                    title="Add alert topic"
                                >
                                    +
                                </button>
                            </div>

                            <div className="border-2 border-black bg-cream-100 p-4">
                                <p className="font-bold text-gray-500 uppercase text-xs tracking-widest mb-2">
                                Topics that trigger alerts
                                </p>

                                <div className="flex flex-wrap gap-2">
                                {(alerts[0]?.topics || []).length > 0 ? (
                                    alerts[0].topics.map((topic) => (
                                    <span
                                        key={topic}
                                        className="flex items-center gap-2 px-3 py-1 border-2 border-black bg-white font-semibold text-sm"
                                    >
                                        {topic}

                                        <button
                                        onClick={() => removeAlertTopic(topic)}
                                        className="ml-1 text-black hover:text-red-600 font-bold"
                                        >
                                        ×
                                        </button>
                                    </span>
                                    ))
                                ) : (
                                    <span className="font-semibold text-gray-600">
                                    No alert topics selected yet.
                                    </span>
                                )}
                                </div>
                            </div>
                        </section>

                        {user?.isAdmin && (
                            <section>
                                <h2 className="font-serif text-2xl font-bold mb-4">Admin Features</h2>
                                <div className="border-2 border-black bg-cream-100 p-4">
                                    <Button
                                        variant="primary"
                                        onClick={() => navigate('/admin/profiles')}
                                    >
                                        View All Profiles
                                    </Button>
                                </div>
                            </section>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
