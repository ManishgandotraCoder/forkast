'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import RealTimeCryptoDashboard from '@/components/trading/RealTimeCryptoDashboard';
import { TrendingUp, BarChart3, Activity, DollarSign } from 'lucide-react';

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
            <div className="relative">
                <RealTimeCryptoDashboard />
            </div>
        </div>
    );
}