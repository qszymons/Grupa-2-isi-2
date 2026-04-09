import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from './utils/authFetch';
import './App.css';

interface UserProfileProps {
    handleLogout: () => void;
}

function UserProfile({ handleLogout }: UserProfileProps) {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await authFetch('/api/me');
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                }
            } catch (error) {
                console.error('Failed to fetch user', error);
            }
        };
        fetchUser();
    }, []);

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

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await authFetch('/api/avatar', {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    setUser(updatedUser);
                    window.alert('Zdjęcie zostało pomyślnie zaktualizowane.');
                } else {
                    const errData = await response.json();
                    window.alert(errData.detail || 'Błąd przy aktualizacji zdjęcia.');
                }
            } catch (error) {
                console.error('Failed to upload avatar', error);
                window.alert('Wystąpił błąd serwera.');
            }
        }
    };

    return (
        <div className="login-container">
            <h2>Panel Użytkownika</h2>
            {user?.username && (
                <>
                    <h3 style={{ marginTop: '10px' }}>
                        Witaj {user.username}!
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', marginBottom: '20px' }}>
                        <div style={{ 
                            width: '120px', 
                            height: '120px', 
                            borderRadius: '50%', 
                            overflow: 'hidden',
                            backgroundColor: '#444',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: '10px',
                            border: '3px solid #646cff'
                        }}>
                            {user.image ? (
                                <img 
                                    src={`${user.image}?t=${new Date().getTime()}`} 
                                    alt="Avatar" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            ) : (
                                <span style={{ fontSize: '40px', color: '#fff' }}>
                                    {user.username.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        
                        <input 
                            type="file" 
                            accept="image/png, image/jpeg" 
                            onChange={handleAvatarChange} 
                            style={{ display: 'none' }} 
                            id="avatar-upload" 
                        />
                        <label htmlFor="avatar-upload" className="login-button" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '14px', width: 'auto' }}>
                            Zmień zdjęcie
                        </label>
                    </div>
                </>
            )}
            <p style={{ marginTop: '20px', marginBottom: '40px' }}>
                Tutaj możesz zarządzać swoimi danymi.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px', width: '100%' }}>
                <button
                    onClick={() => navigate('/change-password')}
                    className="login-button"
                    style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px' }}
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
                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', width: '100%' }}
                >
                    Usuń konto
                </button>
            </div>
        </div>
    );
}

export default UserProfile;
