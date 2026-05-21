import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ArticleCard from '../components/ArticleCard';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import { request } from '../utils/httpClient';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';

const HeadlinesPage = () => {
    const { isAuthenticated, fetchWithAuth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const initialCategory = location.state?.category || new URLSearchParams(location.search).get('category') || 'All';
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [articles, setArticles] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isClippingModalOpen, setIsClippingModalOpen] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [clippings, setClippings] = useState([]);
    const [loadingClippings, setLoadingClippings] = useState(false);
    const [clippingError, setClippingError] = useState(null);
    const [newClippingTitle, setNewClippingTitle] = useState('');
    const [creatingClipping, setCreatingClipping] = useState(false);
    const [addingToClippingId, setAddingToClippingId] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;

    // Updated categories to match Guardian sections backfilled
    const categories = ['All', 'World', 'Science', 'Technology', 'Sport', 'Business', 'Lifestyle', 'Culture', 'Environment'];

    // Debounced search effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setArticles([]);
            setPage(1);
            setHasMore(true);
            fetchHeadlines(1, activeCategory, true, searchQuery, startDate, endDate);
        }, 500);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, startDate, endDate]);
    useEffect(() => {
        // Reset state when category changes
        setArticles([]);
        setPage(1);
        setHasMore(true);
        fetchHeadlines(1, activeCategory, true, searchQuery, startDate, endDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory]);

    const fetchHeadlines = async (pageNum, category, isReset = false, query = searchQuery, startDate = startDate, endDate = endDate) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (category !== 'All') queryParams.append('category', category);
            if (query) queryParams.append('q', query);

            // Convert Date object to YYYY-MM-DD string for backend
            const formatDate = (date) => {
                if (date instanceof Date && !isNaN(date)) {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const dd = String(date.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                }
                return date;
            }

            if (startDate) queryParams.append('startDate', formatDate(startDate));
            if (endDate) queryParams.append('endDate', formatDate(endDate));
            queryParams.append('page', pageNum);

            const path = `${config.api.endpoints.news}/headlines?${queryParams.toString()}`;
            // Hint: if you ever want to force prefs off, add `?noPrefs=true` and handle server-side.
            const data = await (async () => {
                if (isAuthenticated) {
                    try {
                        return await fetchWithAuth(path);
                    } catch (err) {
                        // Fallback to unauthenticated fetch if token issues arise
                        if (err.status === 401 || err.message === 'Authentication required') {
                            return await request(path);
                        }
                        throw err;
                    }
                }
                return await request(path);
            })();
            const fetchedArticles = data.articles || [];


            if (fetchedArticles.length < 20) {
                setHasMore(false);
            }

            const mappedArticles = fetchedArticles.map(article => ({
                ...article,
                category: article.topic || 'General'
            }));

            if (isReset) {
                setArticles(mappedArticles);
            } else {
                setArticles(prev => [...prev, ...mappedArticles]);
            }
        } catch (err) {
            console.error("Failed to fetch headlines:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchHeadlines(nextPage, activeCategory, false, searchQuery, startDate, endDate);
    };

    const loadClippings = async (articleId) => {
        if (!isAuthenticated || !articleId) return;

        try {
            setLoadingClippings(true);
            const data = await fetchWithAuth(
                `${config.api.endpoints.clippings}?articleId=${articleId}`
            );
            setClippings(data.clippings || []);
            setClippingError(null);
        } catch (err) {
            setClippingError('Failed to load clippings.');
        } finally {
            setLoadingClippings(false);
        }
    };

    const handleQuickAdd = async (article) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (!article?.id) {
            return;
        }

        setSelectedArticle(article);
        setIsClippingModalOpen(true);
        await loadClippings(article.id);
    };

    const handleCreateClipping = async () => {
        if (!newClippingTitle.trim() || !selectedArticle?.id) return;

        try {
            setCreatingClipping(true);
            await fetchWithAuth(config.api.endpoints.clippings, {
                method: 'POST',
                body: { title: newClippingTitle.trim() },
            });
            setNewClippingTitle('');
            await loadClippings(selectedArticle.id);
        } catch (err) {
            setClippingError('Failed to create clipping.');
        } finally {
            setCreatingClipping(false);
        }
    };

    const handleAddToClipping = async (clippingId) => {
        if (!selectedArticle?.id) return;
        try {
            setAddingToClippingId(clippingId);
            await fetchWithAuth(`${config.api.endpoints.clippings}/${clippingId}/articles`, {
                method: 'POST',
                body: { articleId: selectedArticle.id },
            });
            setClippings((current) =>
                current.map((item) =>
                    item.clipping_id === clippingId
                        ? {
                            ...item,
                            contains_article: true,
                            article_count: Number(item.article_count || 0) + 1,
                        }
                        : item
                )
            );
        } catch (err) {
            setClippingError('Failed to add article to clipping.');
        } finally {
            setAddingToClippingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="font-serif text-6xl md:text-7xl font-black mb-4">HEADLINES</h1>
                    <p className="text-xl font-bold text-gray-500">Today's most important stories, curated for you.</p>
                </header>

                {/* Filter and Search Layout */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1">
                        <Input
                            placeholder="Search articles by title or author..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            }
                        />
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-col space-y-2 h-full justify-end">
                            <div className="relative w-full">
                                <DatePicker
                                    selectsRange={true}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={(update) => setDateRange(update)}
                                    dateFormat="MM-dd-yyyy"
                                    placeholderText="Filter by date range..."
                                    className={`w-full border-4 border-black p-4 font-bold text-lg bg-white focus:outline-none focus:ring-4 focus:ring-soft-blue-300 transition-all shadow-hard-sm focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] ${!startDate && !endDate ? 'text-gray-400' : 'text-black'}`}
                                    wrapperClassName="w-full"
                                />

                                {(startDate || endDate) && (
                                    <button
                                        onClick={() => setDateRange([null, null])}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black font-bold p-1 bg-white z-10"
                                        title="Clear date filter"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Category Tabs */}
                <div className="flex overflow-x-auto pb-4 mb-8 gap-4 justify-start md:justify-center scrollbar-hide">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`
                                whitespace-nowrap px-6 py-2 font-bold text-lg border-b-4 transition-all
                                ${activeCategory === category
                                    ? 'border-soft-blue-500 text-black'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'}
                            `}
                        >
                            {category.toUpperCase()}
                        </button>
                    ))}
                </div>

                {/* Masonry Layout using CSS Columns */}
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
                    {articles.map((article) => (
                        <div key={article.id} className="break-inside-avoid mb-8">
                            <ArticleCard
                                id={article.id}
                                title={article.title}
                                category={article.category}
                                imageUrl={article.image}
                                size="medium"
                                article={article}
                                showQuickAdd={isAuthenticated}
                                onQuickAdd={handleQuickAdd}
                            />
                        </div>
                    ))}
                </div>

                {loading && (
                    <div className="text-center mt-12">
                        <p className="font-bold text-gray-500">Loading...</p>
                    </div>
                )}

                {!loading && hasMore && (
                    <div className="mt-20 text-center">
                        <button
                            onClick={handleLoadMore}
                            className="font-bold text-xl border-b-4 border-black pb-1 hover:text-soft-blue-600 hover:border-soft-blue-600 transition-colors"
                        >
                            LOAD MORE STORIES
                        </button>
                    </div>
                )}

                {!loading && !hasMore && articles.length > 0 && (
                    <div className="mt-20 text-center text-gray-400 font-bold">
                        No more stories to load
                    </div>
                )}
            </div>

            <Modal
                isOpen={isClippingModalOpen}
                onClose={() => setIsClippingModalOpen(false)}
                title={selectedArticle ? `Add to Clipping` : 'Add to Clipping'}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsClippingModalOpen(false)}>
                            Close
                        </Button>
                    </>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-3">
                        <p className="font-bold text-gray-600">Create a new clipping.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Input
                                placeholder="e.g., Weekend Reads"
                                value={newClippingTitle}
                                onChange={(e) => setNewClippingTitle(e.target.value)}
                            />
                            <Button
                                variant="primary"
                                onClick={handleCreateClipping}
                                disabled={creatingClipping}
                            >
                                {creatingClipping ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>

                    {loadingClippings && (
                        <div className="text-center font-bold text-gray-500">Loading clippings...</div>
                    )}

                    {!loadingClippings && clippingError && (
                        <div className="text-center font-bold text-red-500">{clippingError}</div>
                    )}

                    {!loadingClippings && !clippingError && clippings.length === 0 && (
                        <div className="text-center font-bold text-gray-400">No clippings yet. Create one above.</div>
                    )}

                    <div className="space-y-3">
                        {clippings.map((clip) => (
                            <div
                                key={clip.clipping_id}
                                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-2 border-black p-4 bg-white"
                            >
                                <div>
                                    <p className="font-bold text-lg">{clip.title}</p>
                                    <p className="text-sm text-gray-500 font-bold">
                                        {Number(clip.article_count || 0)} articles
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    className="text-sm"
                                    disabled={clip.contains_article || addingToClippingId === clip.clipping_id}
                                    onClick={() => handleAddToClipping(clip.clipping_id)}
                                >
                                    {clip.contains_article
                                        ? 'Added'
                                        : addingToClippingId === clip.clipping_id
                                            ? 'Adding...'
                                            : 'Add'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default HeadlinesPage;
