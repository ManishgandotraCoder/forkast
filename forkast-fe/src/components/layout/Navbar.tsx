'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    TrendingUp,
    ShoppingCart,
    BarChart3,
    Activity,
    User,
    LogOut,
    ChevronDown,
    Plus,
    Minus
} from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isBuySellOpen, setIsBuySellOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const buySellRef = useRef<HTMLDivElement>(null);

    const navItems = [
        { href: '/orders', label: 'Orders', icon: ShoppingCart },
        { href: '/trades', label: 'Trades', icon: BarChart3 },
        { href: '/orderbook', label: 'Order Book', icon: Activity },
    ];

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (buySellRef.current && !buySellRef.current.contains(event.target as Node)) {
                setIsBuySellOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBuyOrder = () => {
        router.push('/orders/new?type=buy');
        setIsBuySellOpen(false);
    };

    const handleSellOrder = () => {
        router.push('/orders/new?type=sell');
        setIsBuySellOpen(false);
    };

    const handleProfileClick = () => {
        router.push('/profile');
        setIsProfileOpen(false);
    };

    const handleLogout = () => {
        logout();
        setIsProfileOpen(false);
        router.push('/');
    };

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center space-x-2"
                        >
                            <TrendingUp className="h-8 w-8 text-indigo-600" />
                            <h1 className="text-xl font-bold text-gray-900">Forkast Trading</h1>
                        </button>
                    </div>

                    {/* Center Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {/* Buy/Sell Dropdown */}
                        <div className="relative" ref={buySellRef}>
                            <button
                                onClick={() => setIsBuySellOpen(!isBuySellOpen)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                New Order
                                <ChevronDown className="h-4 w-4 ml-1" />
                            </button>

                            {isBuySellOpen && (
                                <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                    <div className="py-1">
                                        <button
                                            onClick={handleBuyOrder}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600"
                                        >
                                            <Plus className="h-4 w-4 mr-2 text-green-600" />
                                            Buy Order
                                        </button>
                                        <button
                                            onClick={handleSellOrder}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Minus className="h-4 w-4 mr-2 text-red-600" />
                                            Sell Order
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation Links */}
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? 'text-indigo-600 bg-indigo-50'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md p-2"
                        >
                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                            </div>
                            <span className="hidden md:block font-medium">
                                {user?.name || user?.email}
                            </span>
                            <ChevronDown className="h-4 w-4" />
                        </button>

                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1">
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden border-t border-gray-200">
                <div className="px-4 py-2 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <button
                                key={item.href}
                                onClick={() => router.push(item.href)}
                                className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md text-sm font-medium ${isActive
                                    ? 'text-indigo-600 bg-indigo-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}

                    <div className="pt-2 border-t border-gray-200">
                        <button
                            onClick={handleBuyOrder}
                            className="flex items-center w-full px-3 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-md"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Buy Order
                        </button>
                        <button
                            onClick={handleSellOrder}
                            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                        >
                            <Minus className="h-4 w-4 mr-2" />
                            Sell Order
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
