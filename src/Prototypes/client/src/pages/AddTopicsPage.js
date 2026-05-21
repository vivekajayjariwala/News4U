import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SelectionCard from '../components/SelectionCard';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import config from '../config/config';
import { interestsOptions } from '../constants/topics';

const AddTopicsPage = () => {
    const navigate = useNavigate();
    const { profile, fetchWithAuth, loadProfile } = useAuth();
    // initialize with whatever the user already has selected
    const initial = profile?.profile?.preferredTopics || [];
    const [selected, setSelected] = useState(initial);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const toggle = (id) => {
        setSelected((current) =>
            current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
        );
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);
        try {
            await fetchWithAuth(config.api.endpoints.profile, {
                method: 'PATCH',
                body: { preferredTopics: selected },
            });
            await loadProfile(true);
            navigate('/settings');
        } catch (err) {
            console.error('Failed to update topics', err);
            setError('Unable to save topics. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12 flex flex-col items-center">
            <div className="max-w-4xl w-full bg-white border-4 border-black shadow-hard p-10">
                <h1 className="font-serif text-4xl font-black mb-6">Add Topics</h1>
                <p className="mb-4 text-gray-600">
                    Choose the topics you want to follow. Click a card to toggle selection.
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
                        Save Topics
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddTopicsPage;
