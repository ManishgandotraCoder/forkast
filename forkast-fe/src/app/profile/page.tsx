'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Save, Edit2 } from 'lucide-react';

interface ProfileData {
    id: number;
    email: string;
    name: string;
    age?: number;
}

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        age: '' as string | number,
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3001/user/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setFormData({
                    name: data.name || '',
                    age: data.age || '',
                });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('http://localhost:3001/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: formData.name,
                    age: formData.age ? parseInt(formData.age.toString()) : undefined,
                }),
            });

            if (response.ok) {
                const updatedProfile = await response.json();
                setProfile(updatedProfile);
                setIsEditing(false);
            } else {
                console.error('Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: profile?.name || '',
            age: profile?.age || '',
        });
        setIsEditing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Profile</h1>
                            <p className="text-indigo-100">Manage your account information</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Profile Information */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors duration-200"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        <span>Edit</span>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email Address
                                    </label>
                                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                                        {profile?.email}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Enter your full name"
                                        />
                                    ) : (
                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            {profile?.name || 'Not provided'}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Age
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={formData.age}
                                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Enter your age"
                                            min="13"
                                            max="120"
                                        />
                                    ) : (
                                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
                                            {profile?.age || 'Not provided'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex space-x-3 pt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                    >
                                        <Save className="h-4 w-4" />
                                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Account Stats */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>

                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600">User ID</span>
                                        <span className="text-sm text-gray-900 font-mono">#{profile?.id}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600">Account Status</span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600">Member Since</span>
                                        <span className="text-sm text-gray-900">Recently</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="pt-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
                                <div className="space-y-2">
                                    <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors duration-200">
                                        View Transaction History
                                    </button>
                                    <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors duration-200">
                                        Download Account Data
                                    </button>
                                    <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors duration-200">
                                        Security Settings
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
