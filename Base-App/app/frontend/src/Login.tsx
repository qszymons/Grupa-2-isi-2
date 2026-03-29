import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './App.css'

function Login({ setIsAuthenticated }: { setIsAuthenticated?: (val: boolean) => void }) {
    const navigate = useNavigate()
    const [error, setError] = useState('')

    const formatError = (data: any): string => {
        if (!data || !data.detail) return 'Błąd logowania';
        if (typeof data.detail === 'string') return data.detail;
        if (Array.isArray(data.detail)) {
            return data.detail
                .map((err: any) => err.msg || JSON.stringify(err))
                .join(' ');
        }
        return JSON.stringify(data.detail);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')

        const form = e.currentTarget
        const email = (form.elements.namedItem('email') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value

        try {
            const response = await fetch('/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            })

            if (response.ok) {
                localStorage.setItem('isAuthenticated', 'true')
                if (setIsAuthenticated) setIsAuthenticated(true)
                navigate('/')
            } else {
                const data = await response.json()
                console.log('Backend response (error):', data)
                setError(formatError(data))
            }
        } catch {
            setError('Błąd połączenia z serwerem')
        }
    }

    return (
        <div className="login-container">
            <h2>Zaloguj się</h2>

            {error && <p className="error-message">{error}</p>}

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" placeholder="Wpisz email..." required />
                </div>

                <div className="input-group">
                    <label htmlFor="password">Hasło:</label>
                    <input type="password" id="password" name="password" placeholder="Wpisz hasło..." required />
                </div>

                <div className="forgot-password-link">
                    <Link to="/forgot-password" className="text-link">Zapomniałeś hasła?</Link>
                </div>

                <button type="submit" className="login-button">Zaloguj</button>
            </form>

            <div className="back-to-login">
                <Link to="/register" className="text-link">Nie masz konta? Zarejestruj się</Link>
            </div>
        </div>
    )
}

export default Login
