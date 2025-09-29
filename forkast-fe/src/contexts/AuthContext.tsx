'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';
import { EncryptionUtils } from '@/lib/encryption';

export interface User {
    id: string;
    email: string;
    name: string;
    publicKey?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        email: string;
        password: string;
        name: string;
    }) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const login = async (email: string, password: string) => {
        try {
            const response = await authAPI.login({ email, password });
            const { access_token, user: userData } = response.data;

            // Encrypt sensitive data before storing in localStorage
            const encryptionKey = EncryptionUtils.generateAESKey();
            const encryptedUser = EncryptionUtils.encryptForStorage(userData, encryptionKey);

            localStorage.setItem('authToken', access_token);
            localStorage.setItem('user', encryptedUser);
            localStorage.setItem('encryptionKey', encryptionKey);
            setUser(userData);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const register = async (data: {
        email: string;
        password: string;
        name: string;
    }) => {
        try {
            const response = await authAPI.register(data);
            const { access_token, user: userData } = response.data;

            // Encrypt sensitive data before storing in localStorage
            const encryptionKey = EncryptionUtils.generateAESKey();
            const encryptedUser = EncryptionUtils.encryptForStorage(userData, encryptionKey);

            localStorage.setItem('authToken', access_token);
            localStorage.setItem('user', encryptedUser);
            localStorage.setItem('encryptionKey', encryptionKey);
            setUser(userData);
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('encryptionKey');
        setUser(null);
    };

    const checkAuth = async () => {
        const token = localStorage.getItem('authToken');
        const encryptionKey = localStorage.getItem('encryptionKey');

        if (token && encryptionKey) {
            try {
                const response = await authAPI.getProfile();
                const encryptedUser = EncryptionUtils.encryptForStorage(response.data, encryptionKey);
                setUser(response.data);
                localStorage.setItem('user', encryptedUser);
            } catch {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                localStorage.removeItem('encryptionKey');
            }
        } else if (token) {
            // Fallback for existing users without encryption
            try {
                const response = await authAPI.getProfile();
                const encryptionKey = EncryptionUtils.generateAESKey();
                const encryptedUser = EncryptionUtils.encryptForStorage(response.data, encryptionKey);
                setUser(response.data);
                localStorage.setItem('user', encryptedUser);
                localStorage.setItem('encryptionKey', encryptionKey);
            } catch {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
