import './App.css';

interface UserProfileProps {
    handleLogout: () => void;
}

function UserProfile({ handleLogout }: UserProfileProps) {
    return (
        <div className="login-container">
            <h2>Panel Użytkownika</h2>
            <p style={{ marginTop: '20px', marginBottom: '40px' }}>
                Witaj w swoim panelu! Tutaj możesz zarządzać swoimi danymi.
            </p>
            
            <button 
                onClick={handleLogout}
                className="logout-btn"
            >
                Wyloguj się
            </button>
        </div>
    );
}

export default UserProfile;
