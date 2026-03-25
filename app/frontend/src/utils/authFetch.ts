/**
 * Wrapper around fetch that auto-refreshes the access token on 401 responses.
 *
 * Usage: Replace `fetch(url, options)` with `authFetch(url, options)`.
 * If a request returns 401, authFetch will call POST /api/refresh and retry once.
 * If refreshing also fails, the user is redirected to /login.
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
    try {
        const res = await fetch('/api/refresh', {
            method: 'POST',
            credentials: 'include',
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function authFetch(
    url: string,
    options: RequestInit = {},
): Promise<Response> {
    const mergedOptions: RequestInit = {
        ...options,
        credentials: 'include',
    };

    const response = await fetch(url, mergedOptions);

    if (response.status !== 401) {
        return response;
    }

    // Got 401 — try to refresh the access token
    if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = tryRefreshToken().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
        });
    }

    const refreshed = await (refreshPromise ?? tryRefreshToken());

    if (refreshed) {
        // Retry the original request with a fresh access token
        return fetch(url, mergedOptions);
    }

    // Refresh failed — clear auth state and redirect to login
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';

    return response;
}
