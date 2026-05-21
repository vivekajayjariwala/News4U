import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SelectionCard from '../components/SelectionCard';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import config from '../config/config';
import { interestsOptions } from '../constants/topics';

const AddAlertTopicsPage = () => {
    const navigate = useNavigate();
    const { fetchWithAuth } = useAuth();
    const [selected, setSelected] = useState([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadCurrent = async () => {
            try {
                const data = await fetchWithAuth(config.api.endpoints.alerts);
                if (data.length > 0) {
                    setSelected(data[0].topics || []);
                }
            } catch (err) {
                console.error('Failed to load alert topics', err);
            }
        };
        loadCurrent();
    }, [fetchWithAuth]);

    const toggle = (id) => {
        setSelected((current) =>
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
        );
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);
        try {
            const data = await fetchWithAuth(config.api.endpoints.alerts);
            if (data.length > 0) {
                const alertId = data[0].id;
                await fetchWithAuth(`${config.api.endpoints.alerts}/${alertId}`, {
                    method: 'PATCH',
                    body: { topics: selected },
                });
            }
            navigate('/settings');
        } catch (err) {
            console.error('Failed to update alert topics', err);
            setError('Unable to save alert topics. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12 flex flex-col items-center">
            <div className="max-w-4xl w-full bg-white border-4 border-black shadow-hard p-10">
                <h1 className="font-serif text-4xl font-black mb-6">Add Alert Topics</h1>
                <p className="mb-4 text-gray-600">
                    Choose the topics that will trigger alerts. Click a card to toggle selection.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                    {interestsOptions.map((option) => (
                        <SelectionCard
                            key={option.id}
                            title={option.label}
                            icon={option.icon}
                            selected={selected.includes(option.id)}
                            onClick={() => toggle(option.id)}
                            size="small"
                            disabled={saving}
                        />
                    ))}
                </div>
                {error && (
                    <p className="text-red-500 font-bold text-sm bg-red-50 p-3 border-l-4 border-red-500 mb-6">
                        {error}
                    </p>
                )}
                <div className="flex justify-between">
                    <Button variant="secondary" onClick={() => navigate('/settings')} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        Save Alert Topics
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddAlertTopicsPage;