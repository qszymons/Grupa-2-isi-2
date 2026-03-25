import { useNavigate } from 'react-router-dom';
import { authFetch } from './utils/authFetch';
import './App.css';

interface UserProfileProps {
    handleLogout: () => void;
}

function UserProfile({ handleLogout }: UserProfileProps) {
    const navigate = useNavigate();

    const handleDeleteAccount = async () => {
        if (!window.confirm('Czy na pewno chcesz usunąć swoje konto? Ta operacja jest nieodwracalna.')) {
            return;
        }

        try {
            const response = await authFetch('/api/delete/me', {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                window.alert('Twoje konto zostało usunięte.');
                handleLogout();
            } else {
                const data = await response.json();
                window.alert(data.detail || 'Wystąpił błąd podczas usuwania konta.');
            }
        } catch (err) {
            window.alert('Wystąpił błąd serwera.');
        }
    };

    return (
        <div className="login-container">
            <h2>Panel Użytkownika</h2>
            <p style={{ marginTop: '20px', marginBottom: '40px' }}>
                Witaj w swoim panelu! Tutaj możesz zarządzać swoimi danymi.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', width: '100%' }}>
                <button
                    onClick={() => navigate('/change-password')}
                    className="login-btn"
                    style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', width: '100%' }}
                >
                    Zmień hasło
                </button>

                <button
                    onClick={handleLogout}
                    className="logout-btn"
                    style={{ padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', width: '100%' }}
                >
                    Wyloguj się
                </button>

                <button
                    onClick={handleDeleteAccount}
                    className="logout-btn"
                    style={{ backgroundColor: '#ff4c4c', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', width: '100%' }}
                >
                    Usuń konto
                </button>
            </div>
        </div>
    );
}

export default UserProfile;
