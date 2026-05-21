import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/httpClient';
import config from '../config/config';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, loadProfile } = useAuth();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const data = await request(`${config.api.endpoints.auth}/login`, {
                method: 'POST',
                body: formData,
            });

            login(data);
            await loadProfile(true);
            navigate('/', { replace: true });
        } catch (err) {
            console.error('Login failed', err);
            setError(err.message || 'Unable to sign in. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white border-4 border-black p-8 shadow-hard relative">
                    <div className="absolute -top-12 left-0 bg-soft-blue-400 border-4 border-black px-4 py-2 shadow-hard-sm transform -rotate-2">
                        <h1 className="font-serif font-black text-3xl">WELCOME BACK</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                        <Input
                            label="Email Address"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={submitting}
                        />
                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={submitting}
                        />

                        {error && (
                            <p className="text-red-500 font-bold text-sm bg-red-50 p-2 border-l-4 border-red-500">
                                {error}
                            </p>
                        )}

                        <Button
                            variant="primary"
                            className="w-full text-xl uppercase tracking-widest"
                            disabled={submitting}
                            type="submit"
                        >
                            {submitting ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-8 text-center border-t-2 border-gray-200 pt-6">
                        <p className="font-bold text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-black underline decoration-4 decoration-soft-blue-400 hover:text-soft-blue-600">
                                Join the club
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
