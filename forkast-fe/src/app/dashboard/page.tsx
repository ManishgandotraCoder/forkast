'use client';

import { TrendingUp, ShoppingCart, BarChart3, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const quickActions = [
    {
        name: 'Place Buy Order',
        description: 'Create a new buy order',
        icon: TrendingUp,
        href: '/orders/new?type=buy',
        gradient: 'from-green-500 to-green-600',
    },
    {
        name: 'Place Sell Order',
        description: 'Create a new sell order',
        icon: TrendingUp,
        href: '/orders/new?type=sell',
        gradient: 'from-red-500 to-red-600',
    },
    {
        name: 'View Orders',
        description: 'Manage your active orders',
        icon: ShoppingCart,
        href: '/orders',
        gradient: 'from-blue-500 to-blue-600',
    },
    {
        name: 'Trade History',
        description: 'View your trading history',
        icon: BarChart3,
        href: '/trades',
        gradient: 'from-purple-500 to-purple-600',
    },
    {
        name: 'Order Book',
        description: 'View market depth',
        icon: Activity,
        href: '/orderbook',
        gradient: 'from-indigo-500 to-indigo-600',
    },
];

export default function Dashboard() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-lg">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="border-b pb-4">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                    Trading Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                    Welcome back! Here’s an overview of your trading activity.
                </p>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.name}
                                onClick={() => router.push(action.href)}
                                className={`
                  relative overflow-hidden rounded-2xl p-6 text-left 
                  bg-gradient-to-br ${action.gradient} text-white 
                  transition-transform duration-300 hover:scale-105 hover:shadow-xl
                `}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">{action.name}</h3>
                                        <p className="text-sm opacity-90 mt-1">
                                            {action.description}
                                        </p>
                                    </div>
                                    <div className="bg-white/20 p-2 rounded-full">
                                        <Icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}