import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import ArticleCard from '../components/ArticleCard';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/httpClient';
import config from '../config/config';

const HomePage = () => {
    const { isAuthenticated, user, profile, fetchWithAuth } = useAuth();
    const [featuredArticles, setFeaturedArticles] = useState([]);
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [featuredError, setFeaturedError] = useState(null);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [topTopics, setTopTopics] = useState([]);

    const fullName = useMemo(() => {
        if (profile?.profile?.fullName) {
            return profile.profile.fullName;
        }
        if (profile?.user?.fullName) {
            return profile.user.fullName;
        }
        return user?.fullName;
    }, [profile, user]);

    useEffect(() => {
        let cancelled = false;

        async function loadFeatured() {
            try {
                setLoadingFeatured(true);
                const path = `${config.api.endpoints.news}/headlines?page=1`;
                const topicsPath = `${config.api.endpoints.news}/top-topics`;

                const [data, topicsData] = await Promise.all([
                    (async () => {
                        if (isAuthenticated) {
                            try {
                                return await fetchWithAuth(path);
                            } catch (err) {
                                if (err.status === 401 || err.message === 'Authentication required') {
                                    return await request(path);
                                }
                                throw err;
                            }
                        }
                        return await request(path);
                    })(),
                    request(topicsPath).catch(() => ({ topics: [] }))
                ]);

                const mapped = (data.articles || []).slice(0, 12).map((article) => ({
                    ...article,
                    category: article.topic || 'General',
                }));

                if (!cancelled) {
                    setFeaturedArticles(mapped);
                    setTopTopics(topicsData.topics || []);
                    setFeaturedError(null);
                    setCarouselIndex(0);
                }
            } catch (err) {
                if (!cancelled) {
                    setFeaturedError('Failed to load featured articles.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingFeatured(false);
                }
            }
        }

        loadFeatured();

        return () => {
            cancelled = true;
        };
    }, [fetchWithAuth, isAuthenticated]);

    const totalFeaturedPages = Math.max(1, Math.ceil(featuredArticles.length / 3));
    const featuredPages = Array.from({ length: totalFeaturedPages }, (_, index) =>
        featuredArticles.slice(index * 3, index * 3 + 3)
    );

    return (
        <div className="min-h-screen bg-cream-50">
            {/* Hero Section */}
            <section className="relative px-6 py-20 md:py-32 border-b-4 border-black overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-black leading-none mb-8">
                        {isAuthenticated && fullName ? (
                            <>
                                Welcome<br />
                                Back,<br />
                                <span className="text-soft-blue-500">{fullName}.</span>
                            </>
                        ) : (
                            <>
                                NEWS<br />
                                TAILORED<br />
                                <span className="text-soft-blue-500">4 U.</span>
                            </>
                        )}
                    </h1>
                    <p className="text-xl md:text-2xl font-bold max-w-2xl mb-10 leading-relaxed">
                        {isAuthenticated && fullName
                            ? 'Stay in the loop with stories curated to your interests and knowledge level.'
                            : 'Stop doomscrolling. Start understanding. We curate news based on your knowledge level, so you can actually learn what\'s going on.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link to="/headlines">
                            <Button variant="primary">READ HEADLINES</Button>
                        </Link>
                        {isAuthenticated ? (
                            <Link to="/settings">
                                <Button variant="secondary">UPDATE PREFERENCES</Button>
                            </Link>
                        ) : (
                            <Link to="/register">
                                <Button variant="secondary">CREATE ACCOUNT</Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-20 right-[-10%] w-[600px] h-[600px] bg-soft-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] bg-cream-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
            </section>

            {/* Featured Section */}
            <section className="px-6 py-20 max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <h2 className="font-serif text-5xl font-bold">Trending Now</h2>
                    <Link to="/headlines" className="hidden md:block font-bold text-lg hover:underline decoration-4 underline-offset-4 decoration-soft-blue-400">
                        VIEW ALL STORIES →
                    </Link>
                </div>

                {topTopics.length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-10 items-center">
                        <span className="font-bold text-xl text-gray-500">Top Topics:</span>
                        {topTopics.map((topic, index) => (
                            <Link
                                key={index}
                                to={`/headlines?category=${topic}`}
                                state={{ category: topic }}
                                className="px-5 py-2 border-2 border-black font-bold uppercase bg-white hover:bg-soft-blue-200 hover:-translate-y-1 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                            >
                                {topic}
                            </Link>
                        ))}
                    </div>
                )}

                {totalFeaturedPages > 1 && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setCarouselIndex((current) =>
                                        (current - 1 + totalFeaturedPages) % totalFeaturedPages
                                    )
                                }
                            >
                                ← Prev
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setCarouselIndex((current) => (current + 1) % totalFeaturedPages)
                                }
                            >
                                Next →
                            </Button>
                        </div>
                    </div>
                )}

                {loadingFeatured && (
                    <div className="text-center font-bold text-gray-500">Loading stories...</div>
                )}

                {!loadingFeatured && featuredError && (
                    <div className="text-center font-bold text-red-500">{featuredError}</div>
                )}

                {!loadingFeatured && !featuredError && featuredArticles.length === 0 && (
                    <div className="text-center font-bold text-gray-400">No stories available.</div>
                )}

                {!loadingFeatured && !featuredError && featuredArticles.length > 0 && (
                    <div className="relative overflow-hidden min-h-[640px] pt-4">
                        <div
                            className="flex transition-transform duration-500 ease-out"
                            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                        >
                            {featuredPages.map((page, pageIndex) => (
                                <div key={pageIndex} className="min-w-full">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {page.map((article) => (
                                            <ArticleCard
                                                key={article.id}
                                                id={article.id}
                                                title={article.title}
                                                category={article.category}
                                                imageUrl={article.image}
                                                article={article}
                                                size="medium"
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-12 md:hidden text-center">
                    <Link to="/headlines">
                        <Button variant="outline" className="w-full">VIEW ALL STORIES</Button>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
