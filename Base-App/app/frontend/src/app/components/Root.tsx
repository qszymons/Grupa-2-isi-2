import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { useEffect, useState } from "react";

interface RootProps {
  isAuthenticated: boolean;
}

export function Root({ isAuthenticated }: RootProps) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} isAuthenticated={isAuthenticated} />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-card border-t-4 border-border mt-auto footer">
        <p className="text-muted-foreground pixel-8 leading-relaxed">
          Aplikacja do zarządzania bazą wiedzy i przeszukiwania danych. Grupa 2 ISI 2.
        </p>
      </footer>
    </div>
  );
}
