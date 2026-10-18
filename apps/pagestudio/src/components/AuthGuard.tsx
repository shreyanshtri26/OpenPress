// src/components/AuthGuard.tsx

import { useEffect, useState } from 'react';
import { checkAuth } from '../utils/auth';

interface AuthGuardProps {
    children: React.ReactNode;
    type?: 'admin' | 'website';
}

// AuthGuard is responsible for ONE thing: gating access to protected routes.
//
// SSO callback handling (id_token in hash) has been moved to App.tsx so it
// runs at the root, regardless of which route the OAuth redirect lands on.
// This fixes the navbar not updating after Google login, and also prevents
// the token from being visible in the URL while an async backend call is
// in-flight.
export const AuthGuard: React.FC<AuthGuardProps> = ({ children, type = 'admin' }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const token = checkAuth(type);
        setIsAuthenticated(!!token);
    }, [type]);

    // Show nothing while checking authentication
    if (isAuthenticated === null) {
        return null;
    }

    if (!isAuthenticated) {
        window.location.href = import.meta.env.VITE_MEDIA_TECH_LOGIN_URL || '/login';
        return null;
    }

    return <>{children}</>;
};