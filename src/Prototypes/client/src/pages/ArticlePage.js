import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import HighlightMenu from '../components/HighlightMenu';
import FeedbackSection from '../components/FeedbackSection';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import { request } from '../utils/httpClient';
import config from '../config/config';
import { useAuth } from '../context/AuthContext';

const ArticlePage = () => {
    const [highlightPosition, setHighlightPosition] = useState(null);
    const [selectedText, setSelectedText] = useState('');
    const [showHighlightMenu, setShowHighlightMenu] = useState(false);
    const [aiResponse, setAiResponse] = useState(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const initialArticle = location.state?.article || null;
    const [article, setArticle] = useState(initialArticle);
    const [loadingArticle, setLoadingArticle] = useState(!initialArticle);
    const [isBuildingRoadmap, setIsBuildingRoadmap] = useState(false);
    const { isAuthenticated, fetchWithAuth } = useAuth();
    const [existingRoadmap, setExistingRoadmap] = useState(null);
    const [checkingRoadmap, setCheckingRoadmap] = useState(false);
    const [isClippingModalOpen, setIsClippingModalOpen] = useState(false);
    const [clippings, setClippings] = useState([]);
    const [loadingClippings, setLoadingClippings] = useState(false);
    const [clippingError, setClippingError] = useState(null);
    const [newClippingTitle, setNewClippingTitle] = useState('');
    const [creatingClipping, setCreatingClipping] = useState(false);
    const [addingToClippingId, setAddingToClippingId] = useState(null);
    const [termDefinitions, setTermDefinitions] = useState([]);
    const [loadingTerms, setLoadingTerms] = useState(false);
    const [termPopup, setTermPopup] = useState(null);
    const [simplifiedText, setSimplifiedText] = useState(null);
    const [showSimplified, setShowSimplified] = useState(false);
    const [loadingSimplified, setLoadingSimplified] = useState(false);
    const articleBodyRef = useRef(null);

    useEffect(() => {
        if (!id) {
            setLoadingArticle(false);
            return;
        }

        let cancelled = false;

        async function fetchArticle() {
            try {
                setLoadingArticle(true);
                const data = await request(`${config.api.endpoints.news}/current/${id}`); // We need to implement this in backend!
                if (!cancelled) {
                    setArticle(data);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Failed to fetch article:', err);
                }
            } finally {
                if (!cancelled) {
                    setLoadingArticle(false);
                }
            }
        }

        fetchArticle();

        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        if (!isAuthenticated || !article?.id) return;

        let cancelled = false;

        async function loadExistingRoadmap() {
            try {
                setCheckingRoadmap(true);
                const data = await fetchWithAuth(`${config.api.endpoints.roadmaps}/for-article/${article.id}`);
                if (!cancelled) {
                    setExistingRoadmap(data?.roadmapId || null);
                }
            } catch (err) {
                if (!cancelled) {
                    setExistingRoadmap(null);
                }
            } finally {
                if (!cancelled) {
                    setCheckingRoadmap(false);
                }
            }
        }

        loadExistingRoadmap();

        return () => {
            cancelled = true;
        };
    }, [article?.id, fetchWithAuth, isAuthenticated]);

    useEffect(() => {
        if (!article?.id) return;
        let cancelled = false;

        async function loadTerms() {
            try {
                setLoadingTerms(true);
                const data = await request(`${config.api.endpoints.news}/${article.id}/terms`);
                if (!cancelled) {
                    setTermDefinitions(data.terms || []);
                }
            } catch (error) {
                if (!cancelled) {
                    setTermDefinitions([]);
                }
            } finally {
                if (!cancelled) {
                    setLoadingTerms(false);
                }
            }
        }

        loadTerms();
        return () => {
            cancelled = true;
        };
    }, [article?.id]);

    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                setSelectedText(text);
                setHighlightPosition({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
                setShowHighlightMenu(true);
            } else {
                // Only hide if we aren't interacting with the menu
                // This is a simplified check; in production, use a ref to check click target
                // setShowHighlightMenu(false);
            }
        };

        document.addEventListener('mouseup', handleSelection);
        return () => document.removeEventListener('mouseup', handleSelection);
    }, []);

    const [isAiLoading, setIsAiLoading] = useState(false);
    const [lastAiAction, setLastAiAction] = useState(null);

    // ... existing ...

    const handleAiAction = async (action, query = null, options = {}) => {
        console.log(`AI Action: ${action}, Query: ${query}, Text: ${selectedText}`);
        setIsAiLoading(true);
        setAiResponse(null);
        setLastAiAction(action);

        let tone = 'neutral';
        let complexity = 'standard';
        let type = 'highlight';

        if (action === 'simplify') {
            complexity = 'simple';
        } else if (action === 'explain') {
            tone = 'informative';
            complexity = 'simple'; // Explain like I'm 5ish
        } else if (action === 'custom') {
            tone = 'friendly';
        }

        try {
            const data = await request(`${config.api.endpoints.news}/rewrite`, {
                method: 'POST',
                body: { // Removed JSON.stringify
                    text: selectedText,
                    tone,
                    complexity,
                    type,
                    regenerate: options?.regenerate || false
                }
            });
            setAiResponse(data.rewritten);
        } catch (err) {
            console.error("Rewrite failed:", err);
            setAiResponse("Sorry, I couldn't process that request.");
        } finally {
            setIsAiLoading(false);
        }

        setShowHighlightMenu(false);
        window.getSelection().removeAllRanges();
    };

    const handleBuildRoadmap = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        if (existingRoadmap) {
            navigate(`/roadmaps/${existingRoadmap}`);
            return;
        }

        setIsBuildingRoadmap(true);
        try {
            const data = await fetchWithAuth(config.api.endpoints.roadmaps, {
                method: 'POST',
                body: {
                    articleId: article?.id || id
                }
            });
            if (data?.roadmapId) {
                navigate(`/roadmaps/${data.roadmapId}`);
            }
        } catch (err) {
            console.error('Failed to build roadmap:', err);
        } finally {
            setIsBuildingRoadmap(false);
        }
    };

    const handleToggleSimplified = async () => {
        if (!article?.id) return;
        const nextState = !showSimplified;
        setShowSimplified(nextState);
        if (!nextState || simplifiedText) return;

        try {
            setLoadingSimplified(true);
            const data = await request(`${config.api.endpoints.news}/${article.id}/rewrite?target=beginner`);
            setSimplifiedText(data?.content || null);
        } catch (error) {
            console.error('Failed to load simplified version:', error);
        } finally {
            setLoadingSimplified(false);
        }
    };

    const loadClippings = async () => {
        if (!isAuthenticated || !article?.id) return;

        try {
            setLoadingClippings(true);
            const data = await fetchWithAuth(
                `${config.api.endpoints.clippings}?articleId=${article.id}`
            );
            setClippings(data.clippings || []);
            setClippingError(null);
        } catch (err) {
            setClippingError('Failed to load clippings.');
        } finally {
            setLoadingClippings(false);
        }
    };

    useEffect(() => {
        if (!isClippingModalOpen) return;
        loadClippings();
    }, [isClippingModalOpen, article?.id, fetchWithAuth, isAuthenticated]);

    const handleCreateClipping = async () => {
        if (!newClippingTitle.trim()) return;

        try {
            setCreatingClipping(true);
            await fetchWithAuth(config.api.endpoints.clippings, {
                method: 'POST',
                body: { title: newClippingTitle.trim() },
            });
            setNewClippingTitle('');
            await loadClippings();
        } catch (err) {
            setClippingError('Failed to create clipping.');
        } finally {
            setCreatingClipping(false);
        }
    };

    const handleAddToClipping = async (clippingId) => {
        if (!article?.id) return;
        try {
            setAddingToClippingId(clippingId);
            await fetchWithAuth(`${config.api.endpoints.clippings}/${clippingId}/articles`, {
                method: 'POST',
                body: { articleId: article.id },
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

    const [isRead, setIsRead] = useState(false);
    const [markingAsRead, setMarkingAsRead] = useState(false);
    const [readError, setReadError] = useState(null);

    const handleMarkAsRead = async () => {
        if (!isAuthenticated || !article?.id || isRead) return;

        try {
            setMarkingAsRead(true);
            setReadError(null);
            await fetchWithAuth(config.api.endpoints.history, {
                method: 'POST',
                body: { articleId: article.id },
            });
            setIsRead(true);
        } catch (err) {
            setReadError('Failed to mark as read.');
            console.error(err);
        } finally {
            setMarkingAsRead(false);
        }
    };
    // ... existing ...

    const highlightedBody = useMemo(() => {
        if (!article?.body || !termDefinitions.length) return article?.body;

        const terms = termDefinitions.map((item) => item.term).filter(Boolean);
        if (!terms.length || typeof window === 'undefined') return article.body;

        const parser = new DOMParser();
        const doc = parser.parseFromString(article.body, 'text/html');
        const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'));
        const regex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
        const used = new Set();

        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }

        nodes.forEach((node) => {
            const text = node.nodeValue;
            if (!text || !regex.test(text)) {
                regex.lastIndex = 0;
                return;
            }
            regex.lastIndex = 0;
            const fragment = doc.createDocumentFragment();
            let lastIndex = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
                const matchText = match[0];
                const key = matchText.toLowerCase();
                const before = text.slice(lastIndex, match.index);
                if (before) {
                    fragment.appendChild(doc.createTextNode(before));
                }

                if (!used.has(key)) {
                    const button = doc.createElement('button');
                    button.setAttribute('type', 'button');
                    button.setAttribute('data-term', matchText);
                    button.className = 'term-highlight';
                    button.textContent = matchText;
                    fragment.appendChild(button);
                    used.add(key);
                } else {
                    fragment.appendChild(doc.createTextNode(matchText));
                }

                lastIndex = match.index + matchText.length;
            }
            const after = text.slice(lastIndex);
            if (after) {
                fragment.appendChild(doc.createTextNode(after));
            }
            node.parentNode.replaceChild(fragment, node);
        });

        return doc.body.innerHTML;
    }, [article?.body, termDefinitions]);

    useEffect(() => {
        const container = articleBodyRef.current;
        if (!container) return undefined;

        const handleClick = (event) => {
            const target = event.target.closest('[data-term]');
            if (!target) return;

            const term = target.getAttribute('data-term');
            const definition = termDefinitions.find((item) => item.term.toLowerCase() === term.toLowerCase());
            if (!definition) return;

            const rect = target.getBoundingClientRect();
            setTermPopup({
                term: definition.term,
                definition: definition.definition,
                top: rect.bottom + 8,
                left: rect.left
            });
        };

        container.addEventListener('click', handleClick);
        return () => {
            container.removeEventListener('click', handleClick);
        };
    }, [termDefinitions]);

    if (loadingArticle || !article) {
        return (
            <div className="min-h-screen bg-cream-50 px-6 py-12">
                <div className="max-w-3xl mx-auto text-center font-bold text-gray-500">Loading article...</div>
            </div>
        );
    }

    const complexityScore = typeof article.complexity_score === 'number'
        ? Math.round(article.complexity_score * 100)
        : null;

    return (
        <div className="min-h-screen bg-cream-50 pb-20">
            {/* Hero Image */}
            <div className="h-[40vh] w-full relative border-b-4 border-black">
                <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20"></div>
                <Link to="/headlines" className="absolute top-6 left-6">
                    <Button variant="secondary" className="text-sm">← BACK</Button>
                </Link>
            </div>

            <div className="max-w-3xl mx-auto px-6 -mt-20 relative z-10">
                {/* Header Card */}
                <div className="bg-white border-4 border-black p-8 shadow-hard mb-12">
                    <div className="flex items-center gap-4 mb-4 text-sm font-bold text-gray-500 uppercase tracking-wider">
                        {article.published_at && (
                            <span>{new Date(article.published_at).toLocaleDateString()}</span>
                        )}
                    </div>
                    <h1 className="font-serif text-4xl md:text-5xl font-black mb-6 leading-tight">
                        {article.title}
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-black"></div>
                        <p className="font-bold">By {article.author}</p>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <div className="bg-soft-blue-100 border-2 border-black px-4 py-2 font-bold text-sm uppercase tracking-wider">
                            Complexity: {article.complexity_label || 'unknown'}
                            {complexityScore !== null ? ` (${complexityScore}%)` : ''}
                        </div>
                        <Button
                            variant="primary"
                            className="text-sm"
                            onClick={handleBuildRoadmap}
                            disabled={isBuildingRoadmap || checkingRoadmap}
                        >
                            {existingRoadmap
                                ? 'View Built Roadmap'
                                : isBuildingRoadmap
                                    ? 'Building Roadmap...'
                                    : checkingRoadmap
                                        ? 'Checking Roadmap...'
                                        : 'Build Learning Roadmap'}
                        </Button>
                        {(article.complexity_label === 'intermediate' || article.complexity_label === 'advanced') && (
                            <Button
                                variant="secondary"
                                className="text-sm"
                                onClick={handleToggleSimplified}
                                disabled={loadingSimplified}
                            >
                                {showSimplified ? 'Hide simplified' : 'Show simplified'}
                            </Button>
                        )}
                        {isAuthenticated && (
                            <Button
                                variant="secondary"
                                className="text-sm"
                                onClick={() => setIsClippingModalOpen(true)}
                            >
                                Add to Clipping
                            </Button>
                        )}
                    </div>
                </div>

                {/* AI Response Card (Dynamic) */}
                {(aiResponse || isAiLoading) && (
                    <div className="bg-soft-blue-100 border-4 border-black p-6 mb-8 animate-fade-in relative transition-all duration-500">
                        <button
                            onClick={() => { setAiResponse(null); setIsAiLoading(false); }}
                            className="absolute top-2 right-2 font-bold text-gray-500 hover:text-black"
                        >
                            ✕
                        </button>
                        <p className="font-bold text-soft-blue-800 text-sm uppercase mb-2">AI Insight</p>

                        {isAiLoading ? (
                            <div className="flex items-center gap-3 animate-pulse">
                                <div className="h-4 w-4 bg-soft-blue-600 rounded-full animate-bounce"></div>
                                <div className="h-4 w-4 bg-soft-blue-600 rounded-full animate-bounce delay-75"></div>
                                <div className="h-4 w-4 bg-soft-blue-600 rounded-full animate-bounce delay-150"></div>
                                <span className="font-serif italic text-soft-blue-700">Thinking...</span>
                            </div>
                        ) : (
                            <div>
                                <p className="font-serif text-xl leading-relaxed">{aiResponse}</p>
                                {lastAiAction === 'explain' && (
                                    <div className="mt-4">
                                        <Button
                                            variant="secondary"
                                            className="text-sm"
                                            onClick={() => handleAiAction('explain', null, { regenerate: true })}
                                            disabled={isAiLoading}
                                        >
                                            Try another explanation
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Article Content */}
                {showSimplified && (
                    <div className="bg-soft-blue-50 border-4 border-black p-6 shadow-hard mb-10">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-bold uppercase tracking-wider text-gray-500">Simplified Version</p>
                            {loadingSimplified && <span className="text-xs text-gray-500">Generating...</span>}
                        </div>
                        <p className="font-serif text-lg leading-relaxed text-gray-800">
                            {simplifiedText || 'No simplified version available yet.'}
                        </p>
                    </div>
                )}

                <div className="prose prose-lg max-w-none font-serif text-gray-800 leading-loose mb-16" ref={articleBodyRef}>
                    {article.body
                        ? <div dangerouslySetInnerHTML={{ __html: highlightedBody }} />
                        : <p>{article.description || "No content available."}</p>
                    }
                </div>

                {termPopup && (
                    <div
                        className="fixed z-50 max-w-xs bg-white border-2 border-black shadow-hard p-4 text-sm font-serif"
                        style={{ top: termPopup.top, left: termPopup.left }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-bold mb-2">{termPopup.term}</p>
                                <p className="text-gray-700">{termPopup.definition}</p>
                            </div>
                            <button
                                type="button"
                                className="text-gray-500 font-bold"
                                onClick={() => setTermPopup(null)}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}


                {/* Feedback Section */}
                <FeedbackSection />
                {/* Mark as Read Section */}
                {isAuthenticated && (
                    <div className="mt-12 text-center pb-8">
                        <Button
                            variant="primary"
                            className="text-lg px-8 py-4"
                            onClick={handleMarkAsRead}
                            disabled={isRead || markingAsRead}
                        >
                            {isRead
                                ? '✓ Marked as Read'
                                : markingAsRead
                                    ? 'Marking...'
                                    : 'Done Reading? Mark as Read'}
                        </Button>
                        {readError && <p className="text-red-500 font-bold mt-2">{readError}</p>}
                        {isRead && <p className="text-green-600 font-bold mt-2">Saved to your Reading History!</p>}
                    </div>
                )}
            </div>

            {/* Floating Highlight Menu */}
            {showHighlightMenu && (
                <HighlightMenu
                    position={highlightPosition}
                    onAction={handleAiAction}
                    onClose={() => {
                        setShowHighlightMenu(false);
                        window.getSelection().removeAllRanges();
                    }}
                />
            )}

            <Modal
                isOpen={isClippingModalOpen}
                onClose={() => setIsClippingModalOpen(false)}
                title="Add to Clipping"
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

export default ArticlePage;
