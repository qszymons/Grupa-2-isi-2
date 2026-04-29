import { RouterProvider } from 'react-router';
import { createAppRouter } from './routes';
import { useEffect, useState } from 'react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const stored = localStorage.getItem('isAuthenticated');
      if (stored !== 'true') {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/check-auth', {
          credentials: 'include',
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Try refresh
          const refreshResponse = await fetch('/api/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('isAuthenticated');
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        localStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const router = createAppRouter({ isAuthenticated, setIsAuthenticated });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground pixel-24">
          ŁADOWANIE...
        </p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}