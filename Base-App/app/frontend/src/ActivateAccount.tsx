import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';

function ActivateAccount() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [message, setMessage] = useState('Aktywacja konta w toku...');
    const [error, setError] = useState(false);

    useEffect(() => {
        const activate = async () => {
            try {
                const response = await fetch(`/api/activate/${token}`);
                if (response.ok) {
                    setMessage('Konto zostało pomyślnie aktywowane! Przekierowywanie na stronę główną...');
                    setTimeout(() => navigate('/'), 3000);
                } else {
                    const data = await response.json();
                    setMessage(data.detail || 'Nie udało się aktywować konta (być może link wygasł).');
                    setError(true);
                }
            } catch (err) {
                setMessage('Błąd połączenia z serwerem.');
                setError(true);
            }
        };

        if (token) {
            activate();
        }
    }, [token, navigate]);

    return (
        <div className="login-container">
            <h2>Aktywacja konta</h2>
            <p className={error ? "activate-message activate-message-error" : "activate-message activate-message-success"}>
                {message}
            </p>
            {error && (
                <button 
                    onClick={() => navigate('/')} 
                    className="login-btn activate-link-wrapper" 
                >
                    Wróć na stronę główną
                </button>
            )}
        </div>
    );
}

export default ActivateAccount;
