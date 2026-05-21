import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const CreateStoryPage = ({ onSubmit }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        imageUrl: '',
        content: ''
    });

    const handleSubmit = () => {
        if (!formData.title || !formData.category) {
            alert("Please fill in at least the title and category.");
            return;
        }
        onSubmit(formData);
        navigate('/newsstand');
    };

    return (
        <div className="min-h-screen bg-cream-50 px-6 py-12">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="font-serif text-4xl md:text-5xl font-black">REPORT A STORY</h1>
                    <Button variant="outline" onClick={() => navigate('/newsstand')}>CANCEL</Button>
                </div>

                <div className="bg-white border-4 border-black p-8 shadow-hard space-y-6">
                    <div>
                        <label className="block font-bold text-sm uppercase tracking-wider mb-2">Headline</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Local Hero Saves Cat"
                            className="w-full border-4 border-black p-4 font-serif text-2xl md:text-3xl font-bold focus:outline-none focus:ring-4 focus:ring-soft-blue-300 placeholder-gray-300"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wider mb-2">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full border-4 border-black p-4 font-bold text-lg focus:outline-none focus:ring-4 focus:ring-soft-blue-300 bg-white"
                            >
                                <option value="">Select a Category...</option>
                                <option value="Local">Local News</option>
                                <option value="Opinion">Opinion</option>
                                <option value="Review">Review</option>
                                <option value="Event">Event</option>
                                <option value="Sports">Sports</option>
                                <option value="Tech">Tech</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-bold text-sm uppercase tracking-wider mb-2">Cover Image</label>
                            <div className="border-4 border-black border-dashed p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors relative h-[200px] flex items-center justify-center overflow-hidden group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const url = URL.createObjectURL(file);
                                            setFormData({ ...formData, imageUrl: url });
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                {formData.imageUrl ? (
                                    <>
                                        <img
                                            src={formData.imageUrl}
                                            alt="Preview"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <span className="text-white font-bold">CHANGE IMAGE</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-gray-400">
                                        <span className="text-4xl block mb-2">📷</span>
                                        <span className="font-bold">CLICK TO UPLOAD</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-sm uppercase tracking-wider mb-2">The Story</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full border-4 border-black p-4 font-serif text-xl leading-relaxed min-h-[400px] focus:outline-none focus:ring-4 focus:ring-soft-blue-300 placeholder-gray-300"
                            placeholder="Start writing your story here..."
                        />
                    </div>

                    <div className="flex justify-end pt-6 border-t-2 border-gray-100">
                        <Button onClick={handleSubmit} variant="primary" className="text-xl px-12 py-4">
                            PUBLISH STORY
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateStoryPage;
