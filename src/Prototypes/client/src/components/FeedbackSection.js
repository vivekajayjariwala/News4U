import React, { useState } from 'react';
import Button from './Button';

const FeedbackSection = () => {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        console.log({ rating, feedback });
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="bg-soft-blue-50 border-4 border-black p-8 text-center animate-fade-in">
                <h3 className="font-serif font-bold text-2xl mb-2">Thank You!</h3>
                <p className="font-bold text-gray-600">Your feedback helps us tailor the news to your understanding.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border-4 border-black p-8 shadow-hard">
            <h3 className="font-serif font-bold text-2xl mb-6">Rate this Article</h3>

            <div className="mb-6">
                <p className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-2">Understanding Level</p>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-4xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-gray-200'}`}
                        >
                            ★
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-6">
                <p className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-2">Any specific feedback?</p>
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Was the language too complex? Did we miss something?"
                    className="w-full border-4 border-black p-4 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-soft-blue-300 min-h-[120px]"
                />
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSubmit} variant="primary">
                    SUBMIT FEEDBACK
                </Button>
            </div>
        </div>
    );
};

export default FeedbackSection;
