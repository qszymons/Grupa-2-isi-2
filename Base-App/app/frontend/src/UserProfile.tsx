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
    const [newUsername, setNewUsername] = useState('');
    const [isEditingUsername, setIsEditingUsername] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await authFetch('/api/me');
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                    setNewUsername(data.username);
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

    const handleUsernameChange = async () => {
        if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
            window.alert('Nazwa użytkownika musi mieć od 3 do 20 znaków.');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(newUsername)) {
            window.alert('Nazwa użytkownika może zawierać tylko litery, cyfry, myślniki i podkreślenia.');
            return;
        }

        try {
            const response = await authFetch('/api/change-username', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_username: newUsername })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUser(updatedUser);
                setIsEditingUsername(false);
                window.alert('Nazwa użytkownika została zaktualizowana.');
            } else {
                const errData = await response.json();
                if (errData.detail && Array.isArray(errData.detail)) {
                    window.alert(errData.detail[0].msg);
                } else {
                    window.alert(errData.detail || 'Wystąpił błąd przy zmianie nazwy użytkownika.');
                }
            }
        } catch (error) {
            console.error('Failed to change username', error);
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
                    <h3 className="profile-title">
                        Witaj {user.username}!
                    </h3>

                    <div className="profile-avatar-section">
                        <div className="profile-avatar-wrapper">
                            {user.image ? (
                                <img
                                    src={`${user.image}?t=${new Date().getTime()}`}
                                    alt="Avatar"
                                    className="profile-avatar-img"
                                />
                            ) : (
                                <span className="profile-avatar-initial">
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
                        <label htmlFor="avatar-upload" className="login-button profile-upload-btn">
                            Zmień zdjęcie
                        </label>
                    </div>
                </>
            )}
            <p className="profile-text">
                Tutaj możesz zarządzać swoimi danymi.
            </p>

            <div className="profile-actions-section">

                {!isEditingUsername ? (
                    <button
                        onClick={() => { setIsEditingUsername(true); setNewUsername(user?.username || ''); }}
                        className="login-button profile-action-btn"
                    >
                        Zmień nazwę użytkownika
                    </button>
                ) : (
                    <div className="profile-edit-panel">
                        <input
                            type="text"
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                            placeholder="Nowa nazwa użytkownika"
                            className="login-input profile-edit-input"
                        />
                        <div className="profile-edit-buttons">
                            <button
                                onClick={handleUsernameChange}
                                className="login-button profile-edit-btn"
                                disabled={newUsername === user.username}
                            >
                                Zapisz nick
                            </button>
                            <button
                                onClick={() => setIsEditingUsername(false)}
                                className="logout-btn profile-edit-btn profile-cancel-btn"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => navigate('/change-password')}
                    className="login-button profile-action-btn"
                >
                    Zmień hasło
                </button>

                <button
                    onClick={handleLogout}
                    className="logout-btn profile-action-btn"
                >
                    Wyloguj się
                </button>

                <button
                    onClick={handleDeleteAccount}
                    className="logout-btn profile-action-btn"
                >
                    Usuń konto
                </button>
            </div>
        </div>
    );
}

export default UserProfile;
