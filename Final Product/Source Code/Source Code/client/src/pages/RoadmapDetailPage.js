import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { request } from '../utils/httpClient';
import { useAuth } from '../context/AuthContext';
import config from '../config/config';

const RoadmapDetailPage = ({ isPublic = false }) => {
    const { id, publicId } = useParams();
    const navigate = useNavigate();
    const { fetchWithAuth } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [roadmap, setRoadmap] = useState(null);
    const [items, setItems] = useState([]);
    const [progress, setProgress] = useState(null);
    const [progressLoading, setProgressLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadRoadmap() {
            try {
                setLoading(true);
                const endpoint = isPublic
                    ? `${config.api.endpoints.roadmaps}/share/${publicId}`
                    : `${config.api.endpoints.roadmaps}/${id}`;

                const data = isPublic
                    ? await request(endpoint)
                    : await fetchWithAuth(endpoint);

                if (!cancelled) {
                    setRoadmap(data.roadmap);
                    setItems(data.items || []);
                    if (!isPublic && data.roadmap?.status && data.roadmap.status !== 'ready') {
                        setProgress({
                            total_items: data.roadmap.total_items,
                            completed_items: data.roadmap.completed_items,
                            status: data.roadmap.status
                        });
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Failed to load roadmap.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadRoadmap();

        return () => {
            cancelled = true;
        };
    }, [fetchWithAuth, id, isPublic, publicId]);

    useEffect(() => {
        if (isPublic || !id) return;
        if (!progress || progress.status === 'ready' || progress.status === 'error') return;

        let cancelled = false;
        const interval = setInterval(async () => {
            try {
                setProgressLoading(true);
                const data = await fetchWithAuth(`${config.api.endpoints.roadmaps}/progress/${id}`);
                if (!cancelled) {
                    setProgress(data);
                    if (data.status === 'ready') {
                        const detail = await fetchWithAuth(`${config.api.endpoints.roadmaps}/${id}`);
                        setRoadmap(detail.roadmap);
                        setItems(detail.items || []);
                    }
                    if (data.status === 'error') {
                        setError('Roadmap creation failed.');
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setProgress((prev) => prev || { status: 'error' });
                    setError('Roadmap creation failed.');
                }
            } finally {
                if (!cancelled) {
                    setProgressLoading(false);
                }
            }
        }, 3000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [fetchWithAuth, id, isPublic, progress]);

    const handleDelete = async () => {
        try {
            await fetchWithAuth(`${config.api.endpoints.roadmaps}/${id}`, { method: 'DELETE' });
            navigate('/roadmaps');
        } catch (err) {
            setError('Failed to delete roadmap.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cream-50 px-6 py-12">
                <div className="max-w-3xl mx-auto text-center font-bold text-gray-500">Loading roadmap...</div>
            </div>
        );
    }

    if (error || !roadmap) {
        return (
            <div className="min-h-screen bg-cream-50 px-6 py-12">
                <div className="max-w-3xl mx-auto text-center font-bold text-red-500">{error || 'Roadmap not found.'}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col gap-4 mb-10">
                    <div className="flex items-center justify-between">
                        <Link to={isPublic ? '/headlines' : '/roadmaps'} className="self-start">
                            <Button variant="secondary" className="text-sm">← Back</Button>
                        </Link>
                        {!isPublic ? (
                            <Button variant="secondary" className="text-sm" onClick={handleDelete}>
                                Delete
                            </Button>
                        ) : (
                            <div></div>
                        )}
                    </div>
                    <h1 className="font-serif text-4xl md:text-5xl font-black">{roadmap.name}</h1>
                </div>

                <div className="bg-soft-blue-50 border-4 border-black p-8 shadow-hard mb-10 relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute -top-8 -right-8 w-24 h-24 bg-soft-blue-200 border-4 border-black rotate-12"></div>
                    </div>
                    <p className="text-xs uppercase font-bold text-gray-500 mb-2 tracking-widest">Roadmap Overview</p>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="bg-white border-2 border-black px-3 py-1 text-xs font-bold uppercase tracking-wider">Summary</span>
                        <span className="text-sm text-gray-600 font-bold">Created {new Date(roadmap.created_at).toLocaleDateString()}</span>
                    </div>
                    {roadmap.description && (
                        <p className="text-gray-800 font-serif text-lg leading-relaxed bg-white border-2 border-black p-4 shadow-hard-sm">
                            {roadmap.description}
                        </p>
                    )}
                    {(roadmap.query_terms || roadmap.fetch_status) && (
                        <div className="mt-4 text-sm font-bold text-gray-600 space-y-1">
                            {roadmap.query_terms && (
                                <p>Query terms: {roadmap.query_terms}</p>
                            )}
                            {roadmap.fetch_status && (
                                <p>Guardian fetch: {roadmap.fetch_status}</p>
                            )}
                        </div>
                    )}
                    {progress && progress.status !== 'ready' && (
                        <div className="mt-4 text-sm font-bold text-gray-600">
                            Classification progress: {progress.completed_items || 0} / {progress.total_items || 0}
                            {progressLoading ? ' (updating...)' : ''}
                        </div>
                    )}
                    {!isPublic && (
                        <div className="mt-4 text-sm font-bold text-gray-600">
                            Share link: {`${window.location.origin}/roadmaps/share/${roadmap.public_id}`}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white border-4 border-black p-6 shadow-hard flex flex-col md:flex-row gap-4">
                            <div className="w-full md:w-40 h-32 border-2 border-black overflow-hidden bg-gray-100">
                                <img
                                    src={item.image || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800'}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onError = null;
                                        e.target.src = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800';
                                    }}
                                />
                            </div>
                            <div className="flex items-start gap-4 flex-1">
                                <div className="w-10 h-10 bg-soft-blue-500 text-white font-black flex items-center justify-center border-2 border-black">
                                    {item.step_order}
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <Link to={`/article/${item.id}`} state={{ article: item }}>
                                            <h3 className="font-serif text-2xl font-black hover:text-soft-blue-700 transition-colors">
                                                {item.title}
                                            </h3>
                                        </Link>
                                        {roadmap.source_article_id === item.id && (
                                            <span className="bg-soft-blue-100 border-2 border-black px-2 py-1 text-xs font-bold uppercase tracking-wider">
                                                Source Article
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-bold text-sm text-gray-600 mb-2">
                                        Complexity: {item.complexity_label || 'unknown'}
                                        {typeof item.complexity_score === 'number'
                                            ? ` (${Math.round(item.complexity_score * 100)}%)`
                                            : ''}
                                    </p>
                                    <p className="text-sm text-gray-500">{item.topic || 'General'}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="text-center font-bold text-gray-400">No items found for this roadmap.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoadmapDetailPage;
