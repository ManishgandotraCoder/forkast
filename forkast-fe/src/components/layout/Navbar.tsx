'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usdProfileAPI } from '@/lib/api';
import {
    TrendingUp,
    ShoppingCart,
    BarChart3,
    Activity,
    User,
    LogOut,
    ChevronDown,
    Plus,
    Minus,
    Menu,
    X,
    DollarSign,
    Wallet
} from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [userUsdBalance, setUserUsdBalance] = useState<number>(0);
    const profileRef = useRef<HTMLDivElement>(null);

    // Fetch user USD balance
    const fetchUserUsdBalance = async () => {
        try {
            const response = await usdProfileAPI.getUserBalances();
            const balances = response.data;
            const usdBalance = balances.find((balance: { symbol: string; amount: number }) => balance.symbol === 'USD');
            setUserUsdBalance(usdBalance ? usdBalance.amount : 0);
        } catch (error) {
            console.error('Failed to fetch USD balance:', error);
            setUserUsdBalance(0);
        }
    };

    const navItems = [
        { href: '/', label: 'Dashboard', icon: TrendingUp },
        { href: '/orders', label: 'Orders', icon: ShoppingCart },
        { href: '/trades', label: 'Trades', icon: BarChart3 },
        { href: '/orderbook', label: 'Order Book', icon: Activity },
        {
            href: '/buy-usdt',
            label: `Buy USDT - $${userUsdBalance.toFixed(2)} Available`,
            icon: DollarSign
        },
    ];

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            setIsScrolled(scrollTop > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch USD balance when user is available
    useEffect(() => {
        if (user) {
            fetchUserUsdBalance();
            // Refresh balance every 30 seconds
            const interval = setInterval(fetchUserUsdBalance, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBuyOrder = () => {
        router.push('/orders/new?type=buy');
    };

    const handleSellOrder = () => {
        router.push('/orders/new?type=sell');
    };

    const handleLogout = () => {
        logout();
        setIsProfileOpen(false);
        router.push('/');
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50'
            : 'bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200/30'
            }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center space-x-2 hover:scale-105 transition-transform duration-200"
                        >
                            <TrendingUp className="h-8 w-8 text-indigo-600" />
                            <h1 className="text-xl font-bold text-gray-900">Forkast Trading</h1>
                        </button>
                    </div>

                    {/* Center Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        {/* Navigation Links */}
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <button
                                    key={item.href}
                                    onClick={() => router.push(item.href)}
                                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}

                        {/* Quick Actions */}
                        {/* <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
                            <button
                                onClick={handleBuyOrder}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Buy</span>
                            </button>
                            <button
                                onClick={handleSellOrder}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <Minus className="h-4 w-4" />
                                <span>Sell</span>
                            </button>
                        </div> */}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex items-center space-x-3">
                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md p-2 transition-colors duration-200"
                            >
                                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                                <span className="hidden lg:block font-medium">
                                    {user?.name || user?.email}
                                </span>
                                <ChevronDown className="h-4 w-4 transition-transform duration-200" style={{
                                    transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                                }} />
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white/95 backdrop-blur-md ring-1 ring-black ring-opacity-5 z-50 border border-gray-200/50">
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                router.push('/profile');
                                                setIsProfileOpen(false);
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors duration-200"
                                        >
                                            <User className="h-4 w-4 mr-2" />
                                            Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push('/portfolio');
                                                setIsProfileOpen(false);
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors duration-200"
                                        >
                                            <Wallet className="h-4 w-4 mr-2" />
                                            Portfolio
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors duration-200"
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className={`md:hidden transition-all duration-300 overflow-hidden ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                <div className="border-t border-gray-200/50 bg-white/95 backdrop-blur-md">
                    <div className="px-4 py-3 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <button
                                    key={item.href}
                                    onClick={() => {
                                        router.push(item.href);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}

                        <div className="pt-3 border-t border-gray-200/50">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => {
                                        handleBuyOrder();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors duration-200 shadow-sm"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Buy
                                </button>
                                <button
                                    onClick={() => {
                                        handleSellOrder();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200 shadow-sm"
                                >
                                    <Minus className="h-4 w-4 mr-1" />
                                    Sell
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
