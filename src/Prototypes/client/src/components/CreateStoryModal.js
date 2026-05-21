import React, { useState } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

const CreateStoryModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        title: '',
        category: '',
        imageUrl: '',
        content: ''
    });

    const handleSubmit = () => {
        if (!formData.title || !formData.category) return;
        onSubmit(formData);
        setFormData({ title: '', category: '', imageUrl: '', content: '' });
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Report a Story"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>CANCEL</Button>
                    <Button variant="primary" onClick={handleSubmit}>PUBLISH</Button>
                </>
            }
        >
            <div className="space-y-4">
                <Input
                    label="Headline"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., New Community Garden Opens"
                />

                <div>
                    <label className="block font-bold text-sm uppercase tracking-wider mb-1">Category</label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full border-4 border-black p-3 font-bold focus:outline-none focus:ring-4 focus:ring-soft-blue-300 bg-white"
                    >
                        <option value="">Select a Category...</option>
                        <option value="Local">Local News</option>
                        <option value="Opinion">Opinion</option>
                        <option value="Review">Review</option>
                        <option value="Event">Event</option>
                    </select>
                </div>

                <Input
                    label="Image URL (Optional)"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                />

                <div>
                    <label className="block font-bold text-sm uppercase tracking-wider mb-1">The Story</label>
                    <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="w-full border-4 border-black p-3 font-bold min-h-[150px] focus:outline-none focus:ring-4 focus:ring-soft-blue-300"
                        placeholder="What's happening?"
                    />
                </div>
            </div>
        </Modal>
    );
};

export default CreateStoryModal;
