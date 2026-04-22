import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authFetch } from './utils/authFetch'
import './App.css'

function ChangePassword() {
    const navigate = useNavigate()
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const formatError = (data: any): string => {
        if (!data || !data.detail) return 'Błąd podczas zmiany hasła';
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
        const oldPassword = (form.elements.namedItem('old-password') as HTMLInputElement).value
        const newPassword = (form.elements.namedItem('new-password') as HTMLInputElement).value
        const confirmPassword = (form.elements.namedItem('confirm-password') as HTMLInputElement).value

        if (newPassword === oldPassword) {
            setError('Nowe hasło musi być inne niż obecne.')
            return
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]).{8,}$/
        if (!passwordRegex.test(newPassword)) {
            setError('Hasło musi mieć co najmniej 8 znaków, zawierać co najmniej jedną wielką literę, jedną cyfrę oraz jeden znak specjalny.')
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Hasła nie są takie same')
            return
        }

        try {
            const response = await authFetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
                credentials: 'include'
            })

            if (response.ok) {
                setSuccess('Hasło zostało pomyślnie zmienione.')
                setTimeout(() => navigate('/profile'), 2000)
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
            <h2>Zmień hasło</h2>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message success-message-text">{success}</p>}

            <form className="login-form" onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="old-password">Stare hasło:</label>
                    <input type="password" id="old-password" name="old-password" placeholder="Wpisz stare hasło..." required />
                </div>

                <div className="input-group">
                    <label htmlFor="new-password">Nowe hasło:</label>
                    <input type="password" id="new-password" name="new-password" placeholder="Wpisz nowe hasło..." required />
                </div>

                <div className="input-group">
                    <label htmlFor="confirm-password">Powtórz nowe hasło:</label>
                    <input type="password" id="confirm-password" name="confirm-password" placeholder="Powtórz nowe hasło..." required />
                </div>

                <button type="submit" className="login-button">Zmień hasło</button>
            </form>

            <div className="back-to-login back-link-wrapper">
                <button
                    onClick={() => navigate('/profile')}
                    className="text-link nav-link-btn"
                >
                    Wróć do profilu
                </button>
            </div>
        </div>
    )
}

export default ChangePassword
