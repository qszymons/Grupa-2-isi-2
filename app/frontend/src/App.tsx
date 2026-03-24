import { useState, useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'

import Home from './Home'
import Login from './Login'
import ForgotPassword from './ForgotPassword'
import Register from './Register'
import ResetPassword from './ResetPassword'

import './App.css'

function App() {
    const [isLightMode, setIsLightMode] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
        localStorage.getItem('isAuthenticated') === 'true'
    );

    useEffect(() => {
        const verifyAuth = async () => {
            try {
                const res = await fetch('/api/check-auth', { credentials: 'include' });
                if (res.ok) {
                    setIsAuthenticated(true);
                    return;
                }

                const refreshRes = await fetch('/api/refresh', { method: 'POST', credentials: 'include' });
                if (refreshRes.ok) {
                    setIsAuthenticated(true);
                    localStorage.setItem('isAuthenticated', 'true');
                } else {
                    setIsAuthenticated(false);
                    localStorage.removeItem('isAuthenticated');
                }
            } catch (error) {
                console.error('Błąd autoryzacji:', error);
                setIsAuthenticated(false);
                localStorage.removeItem('isAuthenticated');
            }
        };
        verifyAuth();
    }, []);

    useEffect(() => {
        if (isLightMode) {
            document.body.classList.add('light-mode');
        }
        else {
            document.body.classList.remove('light-mode');
        }
    }, [isLightMode]);

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {
            console.error('Błąd wylogowania:', e);
        }
        setIsAuthenticated(false);
        localStorage.removeItem('isAuthenticated');
        window.location.href = '/login';
    };

    return (
        <>
            <header>
                <h1>Baza wiedzy</h1>
            </header>

            <nav>
                <ul>
                    <li><Link to="/" className="text-link">Strona główna</Link></li>
                    {isAuthenticated ? (
                        <li><a href="#" className="text-link" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Wyloguj</a></li>
                    ) : (
                        <>
                            <li><Link to="/login" className="text-link">Logowanie</Link></li>
                            <li><Link to="/register" className="text-link">Rejestracja</Link></li>
                        </>
                    )}
                    <li style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                        <button className="theme-toggle-btn" onClick={() => setIsLightMode(!isLightMode)}>
                            {isLightMode ? 'Tryb ciemny' : 'Tryb jasny'}
                        </button>
                    </li>
                </ul>
            </nav>

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
            </Routes>

            <footer>
                Aplikacja do zarządzania bazą wiedzy i przeszukiwania danych. Grupa 2 ISI 2.
            </footer>
        </>
    )
}

export default App
