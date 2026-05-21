import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CommunityArticleCard = ({ id, title, category, imageUrl, author, authorAvatar, efficacy, initialUpvotes }) => {
    const [upvotes, setUpvotes] = useState(initialUpvotes);
    const [hasUpvoted, setHasUpvoted] = useState(false);

    const handleUpvote = (e) => {
        e.preventDefault(); // Prevent navigation if wrapped in Link
        e.stopPropagation();
        if (!hasUpvoted) {
            setUpvotes(upvotes + 1);
            setHasUpvoted(true);
        }
    };

    return (
        <Link to={`/article/${id}`} className="group relative block h-full">
            <div className="border-4 border-black bg-white h-full flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-hard">
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden border-b-4 border-black">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-soft-blue-400 border-2 border-black px-2 py-0.5 font-bold text-xs uppercase tracking-wider shadow-hard-sm">
                        {category}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-serif font-bold text-xl leading-tight mb-4 group-hover:text-soft-blue-700 transition-colors">
                        {title}
                    </h3>

                    <div className="mt-auto pt-4 border-t-2 border-gray-100 flex items-center justify-between">
                        {/* Author Info */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-black overflow-hidden">
                                <img src={authorAvatar} alt={author} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="font-bold text-xs">{author}</p>
                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">
                                    {efficacy}% Efficacy
                                </p>
                            </div>
                        </div>

                        {/* Vote Buttons */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleUpvote}
                                className={`flex items-center justify-center w-8 h-8 border-2 border-black font-bold text-xs transition-colors ${hasUpvoted ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                                    }`}
                            >
                                ▲
                            </button>
                            <span className="font-bold text-sm min-w-[20px] text-center">{upvotes}</span>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!hasUpvoted) setUpvotes(upvotes - 1);
                                }}
                                className="flex items-center justify-center w-8 h-8 border-2 border-black font-bold text-xs bg-white hover:bg-gray-100 transition-colors"
                            >
                                ▼
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default CommunityArticleCard;
