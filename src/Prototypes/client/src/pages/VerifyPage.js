import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/httpClient';
import config from '../config/config';

const VerifyPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, loadProfile } = useAuth();
    const [message, setMessage] = useState('Verifying your email...');
    const [error, setError] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setError('No verification token provided.');
            return;
        }

        const verifyEmail = async () => {
            try {
                const verification = await request(`${config.api.endpoints.auth}/verify`, {
                    method: 'POST',
                    body: { token },
                });

                login(verification);
                await loadProfile(true);
                setMessage('Email verified successfully! Redirecting...');
                setTimeout(() => navigate('/', { replace: true }), 2000);
            } catch (err) {
                console.error('Verification failed', err);
                setError(err.message || 'Verification failed. The token may be invalid or expired.');
            }
        };

        verifyEmail();
    }, [searchParams, login, loadProfile, navigate]);

    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="bg-white border-4 border-black p-8 shadow-hard text-center">
                    {error ? (
                        <>
                            <h2 className="font-serif text-3xl font-black mb-4 text-red-600">Verification Failed</h2>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-black text-white px-6 py-2 font-bold hover:bg-gray-800"
                            >
                                Go to Login
                            </button>
                        </>
                    ) : (
                        <>
                            <h2 className="font-serif text-3xl font-black mb-4">Verifying...</h2>
                            <p className="text-gray-600 mb-6">{message}</p>
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyPage;