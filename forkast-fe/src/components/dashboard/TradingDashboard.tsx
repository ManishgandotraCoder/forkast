'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, TrendingUp, ShoppingCart, BarChart3, Activity, User } from 'lucide-react';
import OrderBook from '@/components/trading/OrderBook';
import TradeHistory from '@/components/trading/TradeHistory';
import OrderForm from '@/components/trading/OrderForm';
import OrderManagement from '@/components/trading/OrderManagement';
import { useRouter } from 'next/navigation';

const tabs = [
    { id: 'trading', name: 'Trading', icon: TrendingUp },
    { id: 'orders', name: 'Orders', icon: ShoppingCart },
    { id: 'trades', name: 'Trades', icon: BarChart3 },
    { id: 'orderbook', name: 'Order Book', icon: Activity },
    { id: 'system', name: 'System', icon: User },
];

export default function TradingDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('trading');

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'trading':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <OrderForm />
                            <OrderBook />
                        </div>
                        <div>
                            <TradeHistory />
                        </div>
                    </div>
                );
            case 'orders':
                return <OrderManagement />;
            case 'trades':
                return <TradeHistory />;
            case 'orderbook':
                return <OrderBook />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">Forkast Trading</h1>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-700">
                                Welcome, <span className="font-medium">{user?.name || user?.email}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <LogOut className="h-4 w-4 mr-1" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`${activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                {renderTabContent()}
            </main>
        </div>
    );
}
