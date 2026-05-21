import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../context/AuthContext';
import config from '../config/config';
import ArticleCard from '../components/ArticleCard';
import Input from '../components/Input';

const HistoryPage = () => {
    const { isAuthenticated, fetchWithAuth } = useAuth();
    const [history, setHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        let cancelled = false;

        async function loadHistory() {
            try {
                setLoading(true);
                const data = await fetchWithAuth(config.api.endpoints.history);
                if (!cancelled) {
                    setHistory(data.history || []);
                    setFilteredHistory(data.history || []);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Failed to load reading history.');
                    console.error(err);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadHistory();

        return () => {
            cancelled = true;
        };
    }, [fetchWithAuth, isAuthenticated]);

    useEffect(() => {
        let results = history;

        if (searchTerm.trim()) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            results = results.filter(article =>
                (article.title && article.title.toLowerCase().includes(lowerCaseSearch)) ||
                (article.author && article.author.toLowerCase().includes(lowerCaseSearch))
            );
        }

        if (dateFilter) {
            // Compare the Local Date String since read_at is an ISO string
            const filterStr = dateFilter.toLocaleDateString();
            results = results.filter(article =>
                new Date(article.read_at).toLocaleDateString() === filterStr
            );
        }

        setFilteredHistory(results);
    }, [searchTerm, dateFilter, history]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6">
                <div className="bg-white border-4 border-black p-8 shadow-hard w-full max-w-md text-center">
                    <h2 className="text-2xl font-black mb-4">Please Login</h2>
                    <p className="font-bold text-gray-600 mb-6">You need to be logged in to view your reading history.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <div className="mb-12 border-b-4 border-black pb-8">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase mb-6">Reading History</h1>
                    <p className="text-xl font-bold font-serif text-gray-700 max-w-2xl">
                        A retrospective look at the articles you have consumed on News4U.
                    </p>
                </div>

                {/* Filter and Search Layout */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1">
                        <Input
                            placeholder="Search your history by title or author..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
                                    selected={dateFilter}
                                    onChange={(date) => setDateFilter(date)}
                                    dateFormat="MM-dd-yyyy"
                                    placeholderText="Filter by read date..."
                                    className={`w-full border-4 border-black p-4 font-bold text-lg bg-white focus:outline-none focus:ring-4 focus:ring-soft-blue-300 transition-all shadow-hard-sm focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] ${!dateFilter ? 'text-gray-400' : 'text-black'}`}
                                    wrapperClassName="w-full"
                                />
                                {dateFilter && (
                                    <button
                                        onClick={() => setDateFilter(null)}
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

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <p className="font-bold text-xl animate-pulse">Loading history...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
                        <p className="font-bold text-red-700">{error}</p>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="bg-white border-4 border-black p-12 text-center shadow-hard">
                        <p className="font-bold text-xl text-gray-500">
                            {searchTerm ? "No articles match your search." : "Your reading history is empty. Start reading!"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredHistory.map((article) => (
                            <div key={article.id} className="relative group">
                                <ArticleCard
                                    id={article.id}
                                    title={article.title}
                                    category={article.topic}
                                    imageUrl={article.image}
                                    article={article}
                                    size="medium"
                                />
                                <div className="absolute top-2 right-2 bg-soft-blue-200 border-2 border-black px-2 py-1 text-xs font-bold shadow-hard-sm pointer-events-none z-10">
                                    Read on {new Date(article.read_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
