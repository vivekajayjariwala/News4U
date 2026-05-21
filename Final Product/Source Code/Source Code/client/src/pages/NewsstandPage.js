import React from 'react';
import { Link } from 'react-router-dom';
import CommunityArticleCard from '../components/CommunityArticleCard';
import Button from '../components/Button';

const NewsstandPage = ({ articles }) => {
    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b-4 border-black pb-8">
                    <div>
                        <h1 className="font-serif text-6xl md:text-7xl font-black mb-4">THE NEWSSTAND</h1>
                        <p className="text-xl font-bold text-gray-500">Community-driven journalism. Validated by you.</p>
                    </div>
                    <div className="mt-6 md:mt-0">
                        <Link to="/create-story">
                            <Button variant="primary" className="text-lg">
                                ✎ START REPORTING
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Community Feed */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {articles.map((article) => (
                        <CommunityArticleCard
                            key={article.id}
                            {...article}
                            initialUpvotes={article.upvotes}
                        />
                    ))}
                </div>

                {/* Empty State / Call to Action */}
                {articles.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-2xl font-bold text-gray-400 mb-4">Be the first to break the news.</p>
                        <Link to="/create-story">
                            <Button variant="outline">WRITE A STORY</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsstandPage;
