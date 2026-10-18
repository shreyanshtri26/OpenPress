// src/utils/api.ts
// Centralized API wrapper with global 401 unauthorized handling

type FetchOptions = RequestInit & {
    skipAuthRedirect?: boolean; // Skip 401 redirect for specific calls (e.g., login)
};

/**
 * Handles 401 unauthorized response by clearing auth data and redirecting to login
 */
function handleUnauthorized(): void {
    // Save current route for post-login redirect
    if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
            localStorage.setItem('lastRoute', currentPath);
        }
    }

    // Clear all auth data from localStorage
    localStorage.removeItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('permissions');

    // Redirect to login page
    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
}

/**
 * Wrapper around fetch that automatically handles 401 unauthorized responses
 * by redirecting the user to the login page.
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options plus optional `skipAuthRedirect`
 * @returns Promise resolving to the fetch Response
 */
export async function apiFetch(
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { skipAuthRedirect, ...fetchOptions } = options;

    const headers = new Headers(fetchOptions.headers || {});
    const isPresignedS3Url = url.includes('X-Amz-Signature') || url.includes('X-Amz-Algorithm');
    if (!headers.has('Authorization') && !isPresignedS3Url && typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    }
    fetchOptions.headers = headers;

    const response = await fetch(url, fetchOptions);

    // Check for 401 unauthorized and redirect to login
    if (response.status === 401 && !skipAuthRedirect) {
        console.warn('🔒 401 Unauthorized - Redirecting to login');
        handleUnauthorized();
        // Throw an error to stop further execution
        throw new Error('Unauthorized - Session expired');
    }

    return response;
}



export default apiFetch;
