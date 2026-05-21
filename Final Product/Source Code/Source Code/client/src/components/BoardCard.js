import React from 'react';

const BoardCard = ({ title, articleCount, previewImages = [], onClick }) => {
    return (
        <div
            onClick={onClick}
            className="group cursor-pointer relative"
        >
            {/* Stacked Effect Backgrounds */}
            {/* Stacked Effect Backgrounds */}
            <div className="absolute top-0 left-0 w-full h-full bg-black translate-x-2 translate-y-2 rounded-none transition-transform duration-300 group-hover:translate-x-3 group-hover:translate-y-3"></div>
            <div className="relative bg-white border-4 border-black z-10 transition-transform duration-300 group-hover:-translate-y-1 group-hover:-translate-x-1">

                {/* Preview Grid */}
                <div className="h-48 border-b-4 border-black bg-gray-100 grid grid-cols-2 gap-0 overflow-hidden">
                    {previewImages.slice(0, 4).map((img, index) => (
                        <img
                            key={index}
                            src={img}
                            alt=""
                            className={`w-full h-full object-cover ${index === 2 && previewImages.length === 3 ? 'col-span-2' : ''}`}
                        />
                    ))}
                    {previewImages.length === 0 && (
                        <div className="col-span-2 flex items-center justify-center bg-soft-blue-50 text-gray-400 font-bold text-4xl">
                            +
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 bg-white">
                    <h3 className="font-serif font-bold text-xl truncate group-hover:text-soft-blue-600 transition-colors">
                        {title}
                    </h3>
                    <p className="font-bold text-sm text-gray-500 mt-1 uppercase tracking-wider">
                        {articleCount} {articleCount === 1 ? 'Article' : 'Articles'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BoardCard;
