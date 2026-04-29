let isRefreshing = false;
let refreshPromise: Promise<Response> | null = null;

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const makeRequest = () =>
    fetch(url, {
      ...options,
      credentials: 'include',
    });

  let response = await makeRequest();

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = fetch('/api/refresh', {
        method: 'POST',
        credentials: 'include',
      }).finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const refreshResponse = await refreshPromise!;

    if (!refreshResponse.ok) {
      localStorage.removeItem('isAuthenticated');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    response = await makeRequest();
  }

  return response;
}
