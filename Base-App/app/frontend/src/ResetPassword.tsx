import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import './App.css'

function ResetPassword() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const formatError = (data: any): string => {
        if (!data || !data.detail) return 'Błąd resetowania hasła';
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
        setSuccess('')

        const form = e.currentTarget
        const newPassword = (form.elements.namedItem('new-password') as HTMLInputElement).value
        const confirmPassword = (form.elements.namedItem('confirm-new-password') as HTMLInputElement).value

        if (newPassword !== confirmPassword) {
            setError('Hasła nie są takie same')
            return
        }

        try {
            const response = await fetch(`/api/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: newPassword }),
            })

            if (response.ok) {
                setSuccess('Hasło zostało zmienione pomyślnie!')
                setTimeout(() => navigate('/login'), 3000)
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
            <h2>Ustaw nowe hasło</h2>

            <p className="recovery-text">Wpisz i zatwierdź swoje nowe hasło poniżej.</p>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="new-password">Nowe hasło:</label>
                    <input type="password" id="new-password" name="new-password" placeholder="Wpisz nowe hasło..." required />
                </div>

                <div className="input-group">
                    <label htmlFor="confirm-new-password">Powtórz nowe hasło:</label>
                    <input type="password" id="confirm-new-password" name="confirm-new-password" placeholder="Powtórz nowe hasło..." required />
                </div>

                <button type="submit" className="login-button">Zapisz nowe hasło</button>
            </form>

            <div className="back-to-login">
                <Link to="/login" className="text-link">Wróć do logowania</Link>
            </div>
        </div>
    )
}

export default ResetPassword
