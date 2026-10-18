import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
    name: string;
    email: string;
    picture?: string;
    accessToken: string;
    idToken: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
}

interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    login: (user: AuthUser) => void;
    logout: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_STORAGE_KEY = 'auth_user';
const WEBSITE_TOKEN_KEY = 'website_token';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely read and parse auth_user from localStorage. Returns null on any error. */
function readStoredUser(): AuthUser | null {
    try {
        // ── Primary: read the unified auth_user key ──────────────────────────
        const raw = localStorage.getItem('auth_user');
        let user: AuthUser | null = null;
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.email === 'string') {
                user = parsed as AuthUser;
                // Ensure accessToken is always populated from website_token
                // (auth_user may not include it when written by the backend)
                if (!user.accessToken) {
                    const websiteToken = localStorage.getItem('website_token');
                    if (websiteToken) user = { ...user, accessToken: websiteToken };
                }
            }
        }

        // ── Fallback: hydrate from existing website_user stored by loginWithSSO ──
        // This covers sessions that existed before auth_user was introduced.
        if (!user) {
            const websiteToken = localStorage.getItem('website_token');
            if (websiteToken) {
                const websiteUserRaw = localStorage.getItem('website_user');
                if (websiteUserRaw) {
                    const u = JSON.parse(websiteUserRaw);
                    if (u && (typeof u.email === 'string' || typeof u.name === 'string')) {
                        user = {
                            name: u.name ?? u.displayName ?? '',
                            email: u.email ?? '',
                            picture: u.picture ?? u.photoURL ?? u.image ?? '',
                            accessToken: websiteToken,
                            idToken: '',
                        } as AuthUser;
                    }
                }
            }
        }

        return user;
    } catch {
        return null;
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Hydrate from localStorage on first render
    const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

    const isAuthenticated = user !== null;

    /**
     * Call this after a successful MSAL/SSO login.
     * Persists user to localStorage and updates global state.
     */
    const login = useCallback((newUser: AuthUser) => {
        try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
        } catch {
            // localStorage might be unavailable; continue without persistence
        }
        setUser(newUser);
    }, []);

    /**
     * Clears localStorage, cookies, and resets auth state in place.
     * All components reading useAuth() will re-render immediately via React state —
     * no page navigation needed. The user stays on whatever page they were on.
     */
    const logout = useCallback(() => {
        try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem('website_token');
            localStorage.removeItem('website_user');
        } catch {
            // ignore
        }
        // Clear only the website session cookie. 
        // We preserve 'token' (Admin) so the builder session remains active.
        Cookies.remove(WEBSITE_TOKEN_KEY);

        // Resetting state triggers an instant re-render of all useAuth() consumers
        // (navbar flips to Sign In, paywalls restore, etc.) — no redirect required.
        setUser(null);
    }, []);

    // Keep auth_user in sync across browser tabs
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === AUTH_STORAGE_KEY) {
                if (e.newValue === null) {
                    setUser(null);
                } else {
                    setUser(readStoredUser());
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Safe no-op fallback used when AuthProvider is absent (Puck builder, tests, etc.) */
const FALLBACK_AUTH: AuthState = {
    user: null,
    isAuthenticated: false,
    login: () => { },
    logout: () => { },
};

/**
 * useAuth — access global website auth state.
 *
 * Safe to call outside AuthProvider — returns a no-op fallback state
 * so components don't crash in the Puck builder or test environments.
 *
 * @example
 * const { isAuthenticated, user, login, logout } = useAuth();
 */
export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    // Return safe defaults instead of throwing — avoids try/catch hook violations
    return ctx ?? FALLBACK_AUTH;
}
