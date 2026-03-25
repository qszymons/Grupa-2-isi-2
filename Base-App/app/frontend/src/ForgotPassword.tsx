import { useState } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

function ForgotPassword() {
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        const form = e.currentTarget
        const email = (form.elements.namedItem('email') as HTMLInputElement).value

        try {
            const response = await fetch('/api/request-password-reset/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            if (response.ok) {
                setSuccess('Link do resetowania hasła został wysłany na podany email.')
            } else {
                const data = await response.json()
                setError(data.detail || 'Błąd wysyłania emaila')
            }
        } catch {
            setError('Błąd połączenia z serwerem')
        }
    }

    return (
        <div className="login-container">
            <h2>Odzyskiwanie hasła</h2>

            <p className="recovery-text">Wpisz swój adres email, na który wyślemy link do zresetowania hasła.</p>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="recovery-email">Email:</label>
                    <input type="email" id="recovery-email" name="email" placeholder="Wpisz email..." required />
                </div>

                <button type="submit" className="login-button">Wyślij link resetujący</button>
            </form>

            <div className="back-to-login">
                <Link to="/login" className="text-link">Powrót do logowania</Link>
            </div>
        </div>
    )
}

export default ForgotPassword
