import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import config from '../config/config';

const RoadmapsPage = () => {
    const { fetchWithAuth } = useAuth();
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadRoadmaps() {
            try {
                const data = await fetchWithAuth(config.api.endpoints.roadmaps);
                if (!cancelled) {
                    setRoadmaps(data.roadmaps || []);
                }
            } catch (err) {
                if (!cancelled) {
                    setRoadmaps([]);
                    setError('Failed to load roadmaps.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadRoadmaps();

        return () => {
            cancelled = true;
        };
    }, [fetchWithAuth]);

    const handleDelete = async (roadmapId) => {
        try {
            await fetchWithAuth(`${config.api.endpoints.roadmaps}/${roadmapId}`, { method: 'DELETE' });
            setRoadmaps((current) => current.filter((item) => item.roadmap_id !== roadmapId));
        } catch (err) {
            setError('Failed to delete roadmap.');
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <h1 className="font-serif text-4xl md:text-5xl font-black">Your Roadmaps</h1>
                    <Link to="/headlines">
                        <Button variant="secondary" className="text-sm">Browse Headlines</Button>
                    </Link>
                </div>

                {loading && (
                    <div className="text-center font-bold text-gray-500">Loading roadmaps...</div>
                )}

                {!loading && error && (
                    <div className="text-center font-bold text-red-500 mb-6">{error}</div>
                )}

                {!loading && roadmaps.length === 0 && (
                    <div className="text-center font-bold text-gray-400">No roadmaps saved yet.</div>
                )}

                <div className="space-y-6">
                    {roadmaps.map((roadmap) => (
                        <div key={roadmap.roadmap_id} className="bg-white border-4 border-black p-6 shadow-hard flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-40 h-28 border-2 border-black overflow-hidden bg-gray-100">
                                <img
                                    src={roadmap.source_image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800'}
                                    alt={roadmap.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onError = null;
                                        e.target.src = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800';
                                    }}
                                />
                            </div>
                            <div className="flex-1 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="font-serif text-2xl font-black mb-2">{roadmap.name}</h2>
                                    <p className="text-sm text-gray-500 font-bold">
                                        {roadmap.item_count} steps • {new Date(roadmap.created_at).toLocaleDateString()}
                                        {roadmap.status && roadmap.status !== 'ready'
                                            ? ` • ${roadmap.completed_items || 0}/${roadmap.total_items || 0} classified`
                                            : ''}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link to={`/roadmaps/${roadmap.roadmap_id}`}>
                                        <Button variant="primary" className="text-sm">Open</Button>
                                    </Link>
                                    <Link to={`/roadmaps/share/${roadmap.public_id}`}>
                                        <Button variant="secondary" className="text-sm">Share</Button>
                                    </Link>
                                    <Button
                                        variant="secondary"
                                        className="text-sm"
                                        onClick={() => handleDelete(roadmap.roadmap_id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RoadmapsPage;
