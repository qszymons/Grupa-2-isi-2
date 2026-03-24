import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './App.css'

function Register() {
    const navigate = useNavigate()
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        const form = e.currentTarget
        const email = (form.elements.namedItem('email') as HTMLInputElement).value
        const password = (form.elements.namedItem('password') as HTMLInputElement).value
        const confirmPassword = (form.elements.namedItem('confirm-password') as HTMLInputElement).value

        if (password !== confirmPassword) {
            setError('Hasła nie są takie same')
            return
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            if (response.ok) {
                setSuccess('Rejestracja udana! Sprawdź email, aby aktywować konto.')
                setTimeout(() => navigate('/login'), 3000)
            } else {
                const data = await response.json()
                setError(data.detail || 'Błąd rejestracji')
            }
        } catch {
            setError('Błąd połączenia z serwerem')
        }
    }

    return (
        <div className="login-container">
            <h2>Zarejestruj się</h2>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" placeholder="Wpisz email..." required />
                </div>

                <div className="input-group">
                    <label htmlFor="password">Hasło:</label>
                    <input type="password" id="password" name="password" placeholder="Wpisz hasło..." required />
                </div>

                <div className="input-group">
                    <label htmlFor="confirm-password">Powtórz hasło:</label>
                    <input type="password" id="confirm-password" name="confirm-password" placeholder="Powtórz hasło..." required />
                </div>

                <button type="submit" className="login-button">Zarejestruj</button>
            </form>

            <div className="back-to-login">
                <Link to="/login" className="text-link">Masz już konto? Zaloguj się</Link>
            </div>
        </div>
    )
}

export default Register
