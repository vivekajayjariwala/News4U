import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BoardCard from '../components/BoardCard';
import ArticleCard from '../components/ArticleCard';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';

const ClippingsPage = () => {
    const { fetchWithAuth } = useAuth();
    const [activeBoard, setActiveBoard] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [boards, setBoards] = useState([]);
    const [loadingBoards, setLoadingBoards] = useState(true);
    const [loadingBoard, setLoadingBoard] = useState(false);
    const [creatingBoard, setCreatingBoard] = useState(false);
    const [error, setError] = useState(null);
    const [recommendedArticles, setRecommendedArticles] = useState([]);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const [recommendationsError, setRecommendationsError] = useState(null);
    const [addingRecommendationId, setAddingRecommendationId] = useState(null);
    const [carouselIndex, setCarouselIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadBoards() {
            try {
                setLoadingBoards(true);
                const data = await fetchWithAuth(config.api.endpoints.clippings);
                if (!cancelled) {
                    setBoards(data.clippings || []);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Failed to load clippings.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingBoards(false);
                }
            }
        }

        loadBoards();

        return () => {
            cancelled = true;
        };
    }, [fetchWithAuth]);

    const handleOpenBoard = async (board) => {
        setActiveBoard({
            clipping_id: board.clipping_id,
            title: board.title,
            public_id: board.public_id,
            articles: [],
        });

        setRecommendedArticles([]);
        setRecommendationsError(null);

        try {
            setLoadingBoard(true);
            const data = await fetchWithAuth(`${config.api.endpoints.clippings}/${board.clipping_id}`);
            setActiveBoard(data.clipping);
        } catch (err) {
            setError('Failed to load clipping.');
        } finally {
            setLoadingBoard(false);
        }
    };

    const loadRecommendations = async (clippingId) => {
        if (!clippingId) return;
        try {
            setLoadingRecommendations(true);
            const data = await fetchWithAuth(`${config.api.endpoints.clippings}/${clippingId}/recommendations?limit=9`);
            setRecommendedArticles(data.articles || []);
            setRecommendationsError(null);
            setCarouselIndex(0);
        } catch (err) {
            setRecommendationsError('Failed to load recommendations.');
        } finally {
            setLoadingRecommendations(false);
        }
    };

    useEffect(() => {
        if (!activeBoard?.clipping_id) return;
        loadRecommendations(activeBoard.clipping_id);
    }, [activeBoard?.clipping_id, fetchWithAuth]);

    const handleAddRecommendation = async (article) => {
        if (!activeBoard?.clipping_id || !article?.id) return;

        try {
            setAddingRecommendationId(article.id);
            await fetchWithAuth(`${config.api.endpoints.clippings}/${activeBoard.clipping_id}/articles`, {
                method: 'POST',
                body: { articleId: article.id },
            });

            setActiveBoard((current) => {
                if (!current) return current;
                const alreadyExists = current.articles.some((item) => item.id === article.id);
                if (alreadyExists) return current;
                return {
                    ...current,
                    articles: [article, ...current.articles],
                };
            });

            setRecommendedArticles((current) => current.filter((item) => item.id !== article.id));
        } catch (err) {
            setRecommendationsError('Failed to add article to clipping.');
        } finally {
            setAddingRecommendationId(null);
        }
    };

    const totalRecommendationPages = Math.max(1, Math.ceil(recommendedArticles.length / 3));
    const recommendationPages = Array.from({ length: totalRecommendationPages }, (_, index) =>
        recommendedArticles.slice(index * 3, index * 3 + 3)
    );

    const handleCreateBoard = async () => {
        if (!newBoardTitle.trim()) return;

        try {
            setCreatingBoard(true);
            const data = await fetchWithAuth(config.api.endpoints.clippings, {
                method: 'POST',
                body: { title: newBoardTitle.trim() },
            });
            if (data?.clipping) {
                setBoards((current) => [data.clipping, ...current]);
            }
            setNewBoardTitle('');
            setIsModalOpen(false);
        } catch (err) {
            setError('Failed to create clipping.');
        } finally {
            setCreatingBoard(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b-4 border-black pb-8">
                    <div>
                        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-black mb-2">
                            {activeBoard ? activeBoard.title : 'CLIPPINGS'}
                        </h1>
                        <p className="text-xl font-bold text-gray-500">
                            {activeBoard ? `${activeBoard.articles.length} Articles Saved` : 'Your personal collection of stories.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6 md:mt-0">
                        {activeBoard ? (
                            <>
                                <Button onClick={() => setActiveBoard(null)} variant="outline">
                                    ← BACK TO BOARDS
                                </Button>
                                {activeBoard.public_id && (
                                    <Link to={`/clippings/share/${activeBoard.public_id}`}>
                                        <Button variant="primary">Share</Button>
                                    </Link>
                                )}
                            </>
                        ) : (
                            <Button onClick={() => setIsModalOpen(true)} variant="primary">
                                + NEW BOARD
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                {activeBoard ? (
                    // Board View (Articles)
                    <>
                        {loadingBoard ? (
                            <div className="text-center font-bold text-gray-500">Loading clipping...</div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                                    {activeBoard.articles.length > 0 ? (
                                        activeBoard.articles.map((article) => (
                                            <ArticleCard
                                                key={article.id}
                                                id={article.id}
                                                title={article.title}
                                                category={article.topic || 'General'}
                                                imageUrl={article.image}
                                                article={article}
                                                size="small"
                                            />
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center py-20">
                                            <p className="text-2xl font-bold text-gray-400">No articles in this board yet.</p>
                                            <Button variant="outline" className="mt-4">BROWSE HEADLINES</Button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-16 border-t-4 border-black pt-10 pb-12">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                        <h2 className="font-serif text-3xl md:text-4xl font-black">Recommended for this clipping</h2>
                                        {totalRecommendationPages > 1 && (
                                            <div className="flex items-center gap-3">
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setCarouselIndex((current) =>
                                                            (current - 1 + totalRecommendationPages) % totalRecommendationPages
                                                        )
                                                    }
                                                >
                                                    ← Prev
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setCarouselIndex((current) =>
                                                            (current + 1) % totalRecommendationPages
                                                        )
                                                    }
                                                >
                                                    Next →
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {loadingRecommendations && (
                                        <div className="text-center font-bold text-gray-500">Loading recommendations...</div>
                                    )}

                                    {!loadingRecommendations && recommendationsError && (
                                        <div className="text-center font-bold text-red-500 mb-6">{recommendationsError}</div>
                                    )}

                                    {!loadingRecommendations && !recommendationsError && recommendedArticles.length === 0 && (
                                        <div className="text-center font-bold text-gray-400">No recommendations available yet.</div>
                                    )}

                                    <div className="relative overflow-hidden min-h-[640px] pt-4">
                                        <div
                                            className="flex transition-transform duration-500 ease-out"
                                            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                                        >
                                            {recommendationPages.map((page, pageIndex) => (
                                                <div key={pageIndex} className="min-w-full">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                        {page.map((article) => (
                                                            <ArticleCard
                                                                key={article.id}
                                                                id={article.id}
                                                                title={article.title}
                                                                category={article.topic || 'General'}
                                                                imageUrl={article.image}
                                                                article={article}
                                                                size="small"
                                                                showQuickAdd
                                                                onQuickAdd={handleAddRecommendation}
                                                                quickAddDisabled={addingRecommendationId === article.id}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    // Overview (Boards Grid)
                    <>
                        {loadingBoards && (
                            <div className="text-center font-bold text-gray-500">Loading clippings...</div>
                        )}

                        {!loadingBoards && error && (
                            <div className="text-center font-bold text-red-500 mb-6">{error}</div>
                        )}

                        {!loadingBoards && boards.length === 0 && !error && (
                            <div className="text-center font-bold text-gray-400">No clippings saved yet.</div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 animate-fade-in">
                            {boards.map((board) => (
                                <BoardCard
                                    key={board.clipping_id}
                                    title={board.title}
                                    articleCount={Number(board.article_count) || 0}
                                    previewImages={board.preview_images || []}
                                    onClick={() => handleOpenBoard(board)}
                                />
                            ))}

                            {/* Create New Board Card (Visual Shortcut) */}
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="group border-4 border-dashed border-gray-300 hover:border-soft-blue-400 bg-transparent h-full min-h-[300px] flex flex-col items-center justify-center transition-colors"
                            >
                                <span className="text-6xl text-gray-300 group-hover:text-soft-blue-400 mb-4">+</span>
                                <span className="font-bold text-xl text-gray-400 group-hover:text-soft-blue-500">CREATE NEW BOARD</span>
                            </button>
                        </div>
                    </>
                )}

            </div>

            {/* Create Board Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Board"
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>CANCEL</Button>
                        <Button variant="primary" onClick={handleCreateBoard} disabled={creatingBoard}>
                            {creatingBoard ? 'CREATING...' : 'CREATE BOARD'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="font-bold text-gray-600">Give your collection a name.</p>
                    <Input
                        placeholder="e.g., Tech Trends, Weekend Reads..."
                        value={newBoardTitle}
                        onChange={(e) => setNewBoardTitle(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>

        </div>
    );
};

export default ClippingsPage;
