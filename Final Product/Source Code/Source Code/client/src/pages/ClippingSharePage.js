import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArticleCard from '../components/ArticleCard';
import Button from '../components/Button';
import config from '../config/config';
import { request } from '../utils/httpClient';

const ClippingSharePage = () => {
    const { publicId } = useParams();
    const [clipping, setClipping] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadClipping() {
            try {
                setLoading(true);
                const data = await request(`${config.api.endpoints.clippings}/share/${publicId}`);
                if (!cancelled) {
                    setClipping(data.clipping || null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Failed to load shared clipping.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadClipping();

        return () => {
            cancelled = true;
        };
    }, [publicId]);

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row items-end justify-between mb-10 border-b-4 border-black pb-6">
                    <div>
                        <h1 className="font-serif text-4xl md:text-6xl font-black">
                            {clipping?.title || 'Shared Clipping'}
                        </h1>
                        <p className="text-lg font-bold text-gray-500">
                            {clipping?.articles?.length || 0} Articles
                        </p>
                    </div>
                    <Link to="/headlines" className="mt-6 md:mt-0">
                        <Button variant="secondary" className="text-sm">Browse Headlines</Button>
                    </Link>
                </div>

                {loading && (
                    <div className="text-center font-bold text-gray-500">Loading clipping...</div>
                )}

                {!loading && error && (
                    <div className="text-center font-bold text-red-500">{error}</div>
                )}

                {!loading && !error && clipping?.articles?.length === 0 && (
                    <div className="text-center font-bold text-gray-400">No articles saved in this clipping yet.</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {(clipping?.articles || []).map((article) => (
                        <ArticleCard
                            key={article.id}
                            id={article.id}
                            title={article.title}
                            category={article.topic || 'General'}
                            imageUrl={article.image}
                            article={article}
                            size="small"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ClippingSharePage;
