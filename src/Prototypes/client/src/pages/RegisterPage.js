import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import SelectionCard from '../components/SelectionCard';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/httpClient';
import config from '../config/config';
import { interestsOptions } from '../constants/topics';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { login, loadProfile, isAuthenticated } = useAuth();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        interests: [],
        understandingLevel: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);


    const understandingOptions = [
        { id: 'beginner', title: 'The Basics', description: 'Explain like I’m 5. Simple terms, big picture.' },
        { id: 'intermediate', title: 'In The Know', description: 'I know the jargon. Give me the details.' },
        { id: 'expert', title: 'Deep Dive', description: 'Technical analysis and raw data. No fluff.' },
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleInterest = (id) => {
        const current = formData.interests;
        const updated = current.includes(id)
            ? current.filter(item => item !== id)
            : [...current, id];
        setFormData({ ...formData, interests: updated });
    };

    const selectUnderstanding = (id) => {
        setFormData({ ...formData, understandingLevel: id });
    };

    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) return "Password must be at least 8 characters.";
        if (!hasUpperCase) return "Password must contain at least one uppercase letter.";
        if (!hasSymbol) return "Password must contain at least one special character.";
        return "";
    };

    const nextStep = () => {
        if (step === 1) {
            const error = validatePassword(formData.password);
            if (error) {
                setPasswordError(error);
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setPasswordError("Passwords do not match.");
                return;
            }
            setPasswordError("");
        }

        if (step === 2 && formData.interests.length < 3) {
            alert("Please select at least 3 interests!");
            return;
        }
        setStep(step + 1);
    };

    const prevStep = () => setStep(step - 1);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setError('');
        setSubmitting(true);

        try {
            if (!formData.understandingLevel) {
                throw new Error('Select how you prefer your news before finishing.');
            }

            const registration = await request(`${config.api.endpoints.auth}/register`, {
                method: 'POST',
                body: {
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                    interests: formData.interests,
                    understandingLevel: formData.understandingLevel,
                },
            });

            // Registration successful, email sent for verification
            setError('');
            alert('Registration successful! Please check your email to verify your account before logging in. Be sure to check your spam folder if you don\'t see it in your inbox.');
            navigate('/login', { replace: true }); // Redirect to login page
        } catch (err) {
            console.error('Registration failed', err);
            if (err.message && err.message.toLowerCase().includes('email')) {
                setError('Email has already been used and there\'s an existing account.');
            } else {
                setError(err.message || 'Unable to register. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6 py-12">
            {/* Progress Bar */}
            <div className="w-full max-w-2xl mb-12">
                <div className="flex justify-between mb-4 font-bold uppercase tracking-widest text-sm">
                    <span className={step >= 1 ? "text-black" : "text-gray-300"}>01. Account</span>
                    <span className={step >= 2 ? "text-black" : "text-gray-300"}>02. Interests</span>
                    <span className={step >= 3 ? "text-black" : "text-gray-300"}>03. Profile</span>
                </div>
                <div className="h-4 border-2 border-black bg-white rounded-full overflow-hidden">
                    <div
                        className="h-full bg-soft-blue-400 transition-all duration-500 ease-out"
                        style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                </div>
            </div>

            <div className="w-full max-w-3xl">
                <div className="bg-white border-4 border-black p-8 md:p-12 shadow-hard">

                    {/* Step 1: Account Details */}
                    {step === 1 && (
                        <div className="animate-fade-in">
                            <h2 className="font-serif text-4xl font-black mb-2">LET'S GET STARTED</h2>
                            <p className="text-xl text-gray-600 mb-8 font-bold">Create your account to join the revolution.</p>

                            <div className="space-y-6">
                                <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" required disabled={submitting} />
                                <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="jane@example.com" required disabled={submitting} />
                                <Input label="Password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required disabled={submitting} />
                                <Input label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required disabled={submitting} />

                                {passwordError && (
                                    <p className="text-red-500 font-bold text-sm bg-red-50 p-2 border-l-4 border-red-500">
                                        ⚠️ {passwordError}
                                    </p>
                                )}

                                <div className="pt-6 flex justify-end">
                                    <Button onClick={nextStep} variant="primary" className="w-full md:w-auto text-lg" disabled={submitting}>
                                        CONTINUE →
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Interests */}
                    {step === 2 && (
                        <div className="animate-fade-in">
                            <h2 className="font-serif text-4xl font-black mb-2">PICK YOUR MIX</h2>
                            <p className="text-xl text-gray-600 mb-8 font-bold">Select at least 3 topics you care about.</p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                {interestsOptions.map((option) => (
                                    <SelectionCard
                                        key={option.id}
                                        title={option.label}
                                        icon={option.icon}
                                        selected={formData.interests.includes(option.id)}
                                        onClick={() => toggleInterest(option.id)}
                                        size="small"
                                        disabled={submitting}
                                    />
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-100">
                                <button onClick={prevStep} className="font-bold text-gray-500 hover:text-black underline">
                                    ← BACK
                                </button>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-sm text-gray-500">
                                        {formData.interests.length} SELECTED
                                    </span>
                                    <Button onClick={nextStep} variant="primary" className="text-lg" disabled={submitting}>
                                        NEXT STEP →
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Understanding Level */}
                    {step === 3 && (
                        <div className="animate-fade-in">
                            <h2 className="font-serif text-4xl font-black mb-2">YOUR STYLE</h2>
                            <p className="text-xl text-gray-600 mb-8 font-bold">How do you want your news served?</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {understandingOptions.map((option) => (
                                    <SelectionCard
                                        key={option.id}
                                        title={option.title}
                                        description={option.description}
                                        selected={formData.understandingLevel === option.id}
                                        onClick={() => selectUnderstanding(option.id)}
                                        size="large"
                                        disabled={submitting}
                                    />
                                ))}
                            </div>

                            {error && (
                                <p className="text-red-500 font-bold text-sm bg-red-50 p-2 border-l-4 border-red-500 mb-4">
                                    {error}
                                </p>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-100">
                                <button onClick={prevStep} className="font-bold text-gray-500 hover:text-black underline">
                                    ← BACK
                                </button>
                                <Button onClick={handleSubmit} variant="primary" className="text-lg bg-black text-white hover:bg-gray-800 hover:text-white" disabled={submitting}>
                                    {submitting ? 'Creating Account...' : 'COMPLETE SETUP'}
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
