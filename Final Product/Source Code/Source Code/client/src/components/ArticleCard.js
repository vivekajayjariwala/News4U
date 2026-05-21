import React from 'react';
import { Link } from 'react-router-dom';

const ArticleCard = ({ id, title, category, imageUrl, size = 'medium', article, showQuickAdd = false, onQuickAdd, quickAddDisabled = false }) => {
    const sizeClasses = {
        small: 'col-span-1 row-span-1',
        medium: 'col-span-1 row-span-2',
        large: 'col-span-2 row-span-2',
    };

    return (
        <Link
            to={`/article/${id}`}
            state={{ article }}   // now article is defined
            className={`group relative border-4 border-black bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-hard cursor-pointer overflow-hidden flex flex-col ${sizeClasses[size]}`}
        >
            {showQuickAdd && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (onQuickAdd) {
                            onQuickAdd(article || { id, title, topic: category, image: imageUrl });
                        }
                    }}
                    disabled={quickAddDisabled}
                    className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full border-2 border-black bg-white shadow-hard-sm transition-all flex items-center justify-center ${quickAddDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'}`}
                    aria-label="Add to clipping"
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </button>
            )}
            <div className="relative w-full flex-grow overflow-hidden border-b-4 border-black">
                <img
                    src={imageUrl || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800"}
                    alt={title}
                    onError={(e) => { e.target.onError = null; e.target.src = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&q=80&w=800"; }}
                    className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 bg-soft-blue-400 border-2 border-black px-3 py-1 font-bold text-xs uppercase tracking-wider shadow-hard-sm">
                    {category}
                </div>
            </div>
            <div className="p-4 bg-white flex flex-col justify-between flex-grow">
                <h3 className="font-serif font-bold text-xl leading-tight group-hover:text-soft-blue-700 transition-colors mb-2">
                    {title}
                </h3>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-auto border-t border-gray-100 pt-3 flex justify-between">
                    <span>{article?.author || 'Unknown Author'}</span>
                    <span>{article?.published_at ? new Date(article.published_at).toLocaleDateString() : ''}</span>
                </div>
            </div>
        </Link>
    );
};

export default ArticleCard;