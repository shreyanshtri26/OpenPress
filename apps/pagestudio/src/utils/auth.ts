import Cookies from 'js-cookie';

const MEDIA_TECH_LOGIN_URL = import.meta.env.VITE_MEDIA_TECH_LOGIN_URL;
const TOKEN_KEY = 'token';
const WEBSITE_TOKEN_KEY = 'website_token';

const readStorage = (key: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const value = localStorage.getItem(key);
  return value || undefined;
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
};

const isJwtExpired = (token?: string): boolean => {
  if (!token) return true;
  const parts = token.split('.');
  if (parts.length < 2) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    if (!payload?.exp) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    return Number(payload.exp) <= nowInSeconds;
  } catch {
    return false;
  }
};

const clearAudienceSession = () => {
  websiteLogout();
  if (typeof window === 'undefined') return;
  localStorage.removeItem('website_user');
  localStorage.removeItem('auth_user');
};

export const getToken = (): string | undefined => {
  return Cookies.get(TOKEN_KEY) || readStorage(TOKEN_KEY);
};

export const logout = () => {
  Cookies.remove(TOKEN_KEY);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getWebsiteToken = (): string | undefined => {
  return Cookies.get(WEBSITE_TOKEN_KEY) || readStorage(WEBSITE_TOKEN_KEY);
};

export const websiteLogout = () => {
  Cookies.remove(WEBSITE_TOKEN_KEY);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WEBSITE_TOKEN_KEY);
  }
};

export const websiteLogin = () => {
  Cookies.set(WEBSITE_TOKEN_KEY, 'mock-web-token-' + Math.random().toString(36).substring(7), { expires: 7 });
};

export const checkAuth = (type: 'admin' | 'website' = 'admin'): string | null => {
  let token = type === 'admin' ? getToken() : getWebsiteToken();

  if (!token && type === 'website' && window.location.hash.includes('/published/')) {
    token = getToken();
  }

  if (!token) {
    if (window.location.hostname === 'localhost') {
      const hash = window.location.hash;
      if (hash === '#/login' || hash === '#/about' || hash === '#/privacy-policy' || hash === '#/new-zealand-media-council') return null;

      if (hash !== '#/login') {
        window.location.hash = '#/login';
      }
      return null;
    }

    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${MEDIA_TECH_LOGIN_URL}?redirect=${returnUrl}`;
    return null;
  }

  return token;
};

const parseStoredUser = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getStoredAudienceUser = () => {
  return (
    parseStoredUser(localStorage.getItem('auth_user')) ||
    parseStoredUser(localStorage.getItem('website_user')) ||
    parseStoredUser(localStorage.getItem('user'))
  );
};

export const persistAudienceUser = (user: any) => {
  if (!user) return;
  const serialized = JSON.stringify(user);
  localStorage.setItem('auth_user', serialized);
  localStorage.setItem('website_user', serialized);
};

export const isDonorAudienceUser = (user?: any): boolean => {
  const candidate = user || getStoredAudienceUser();
  if (!candidate || typeof candidate !== 'object') return false;
  return Boolean(
    candidate.isDonor === true ||
    candidate.suppressCampaigns === true ||
    candidate.adFree === true ||
    Number(candidate.donationTotalAmount || 0) > 0 ||
    Number(candidate.donationCount || 0) > 0 ||
    Number(candidate.lastDonationAmount || 0) > 0
  );
};

export const shouldSuppressCampaigns = (): boolean => {
  return isDonorAudienceUser();
};

export const refreshAudienceProfile = async () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_API;
  const token = getWebsiteToken();
  if (isJwtExpired(token)) {
    clearAudienceSession();
    return null;
  }
  if (!token) return null;

  const response = await fetch(`${BACKEND_URL}/api/audience/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAudienceSession();
      return null;
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch audience profile');
  }

  const data = await response.json();
  if (data?.user) {
    persistAudienceUser(data.user);
  }
  return data?.user || null;
};
