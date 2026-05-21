import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const Navbar = () => {
    const { isAuthenticated, user } = useAuth();

    const initials = (user?.fullName || user?.email || 'U')
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');

    return (
        <nav className="sticky top-0 z-50 bg-cream-50 border-b-4 border-black px-6 py-4 flex justify-between items-center">
            <Link to="/" className="text-3xl font-black tracking-tighter hover:text-soft-blue-600 transition-colors">
                NEWS 4 U
            </Link>
            <div className="hidden md:flex space-x-8 font-bold text-lg">
                <Link to="/headlines" className="hover:underline decoration-4 underline-offset-4 decoration-soft-blue-400">
                    HEADLINES
                </Link>
                <Link to="/newsstand" className="hover:underline decoration-4 underline-offset-4 decoration-soft-blue-400">
                    NEWSSTAND
                </Link>
                {isAuthenticated && (
                    <>
                        <Link to="/clippings" className="hover:underline decoration-4 underline-offset-4 decoration-soft-blue-400">
                            CLIPPINGS
                        </Link>
                        <Link to="/roadmaps" className="hover:underline decoration-4 underline-offset-4 decoration-soft-blue-400">
                            ROADMAPS
                        </Link>
                    </>
                )}
            </div>
            <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                    <Menu as="div" className="relative inline-block text-left">
                        <div>
                            <Menu.Button className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-black bg-soft-blue-200 font-black shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all" aria-label="Open context menu">
                                {initials}
                            </Menu.Button>
                        </div>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white border-2 border-black shadow-hard focus:outline-none z-50">
                                <div className="py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                to="/history"
                                                className={`${active ? 'bg-soft-blue-100 text-black' : 'text-gray-900'
                                                    } group flex items-center px-4 py-2 text-sm font-bold border-b-2 border-transparent hover:border-black`}
                                            >
                                                Reading History
                                            </Link>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                to="/settings"
                                                className={`${active ? 'bg-soft-blue-100 text-black' : 'text-gray-900'
                                                    } group flex items-center px-4 py-2 text-sm font-bold border-b-2 border-transparent hover:border-black`}
                                            >
                                                Settings
                                            </Link>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                ) : (
                    <>
                        <Link to="/login" className="font-bold border-2 border-black px-4 py-2 hover:bg-black hover:text-white transition-all shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                            LOGIN
                        </Link>
                        <Link to="/register" className="font-bold bg-soft-blue-400 border-2 border-black px-4 py-2 hover:bg-soft-blue-500 transition-all shadow-hard-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                            SUBSCRIBE
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
