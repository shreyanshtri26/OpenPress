import Cookies from 'js-cookie';

const COOKIE_NAME = 'token';

// Helper to determine domain based on environment
const getCookieDomain = () => {
    const hostname = window.location.hostname;
    // If running locally, don't set a specific domain (uses current host)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return undefined;
    }
    // Production/Dev environment on the domain
    if (hostname.endsWith(`${import.meta.env.VITE_DOMAIN}`)) {
        return `${import.meta.env.VITE_DOMAIN}`;
    }
    // Fallback for other environments (e.g. vercel preview)
    return hostname;
};

export const setAuthCookie = (token) => {
    const domain = getCookieDomain();

    Cookies.set(COOKIE_NAME, token, {
        domain: domain,
        path: '/',
        expires: 7,
        secure: window.location.protocol === 'https:', // Only secure if on https
        sameSite: 'Lax',
    });
};

export const getAuthCookie = () => {
    return Cookies.get(COOKIE_NAME);
};

export const removeAuthCookie = () => {
    const domain = getCookieDomain();
    Cookies.remove(COOKIE_NAME, {
        domain: domain,
        path: '/',
    });
};
