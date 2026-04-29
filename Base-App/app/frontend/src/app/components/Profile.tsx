import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { User, Lock, LogOut, Trash2, Upload } from "lucide-react";
import { authFetch } from "../../utils/authFetch";
import type { User as UserType } from "../../types";

const formatError = (data: any): string => {
  if (!data?.detail) return 'Błąd serwera';
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map(e => e.msg ?? JSON.stringify(e)).join(' ');
  return JSON.stringify(data.detail);
};

export function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [avatarKey, setAvatarKey] = useState(Date.now());

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await authFetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setNewUsername(userData.username);
        }
      } catch (err) {
        setError('Błąd ładowania profilu');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const validateUsername = (username: string): boolean => {
    return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
  };

  const handleUsernameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateUsername(newUsername)) {
      setError("Nick musi mieć 3-20 znaków i zawierać tylko litery, cyfry, _ lub -");
      return;
    }

    try {
      const response = await authFetch('/api/change-username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_username: newUsername }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(formatError(data));
        return;
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditingUsername(false);
    } catch (err) {
      setError('Błąd aktualizacji nicku');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg)$/)) {
      setError("Dozwolone formaty: PNG, JPEG");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await authFetch('/api/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(formatError(data));
        return;
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setAvatarKey(Date.now()); // Force re-render of avatar image
    } catch (err) {
      setError('Błąd przesyłania awatara');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      // Ignore errors
    }

    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      const response = await authFetch('/api/delete/me', {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        handleLogout();
      } else {
        const data = await response.json();
        setError(formatError(data));
      }
    } catch (err) {
      setError('Błąd usuwania konta');
    }
  };

  const getUserInitial = (): string => {
    return user?.username.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-foreground pixel-12">
          ŁADOWANIE...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-destructive pixel-12">
          Błąd ładowania profilu
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-foreground mb-12 text-center pixel-20 leading-relaxed">
        PANEL UŻYTKOWNIKA
      </h1>

      {error && (
        <div className="bg-destructive/20 border-4 border-destructive p-4 mb-8">
          <p className="text-destructive pixel-8 leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => setError("")}
            className="mt-2 text-foreground underline pixel-8"
          >
            Zamknij
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Avatar Section */}
        <div className="lg:col-span-1">
          <div className="bg-card border-4 border-border p-6 card-panel">
            {/* Avatar */}
            <div className="relative w-full aspect-square mb-4">
              {user.image ? (
                <img
                  src={`${user.image}?t=${avatarKey}`}
                  alt="Avatar"
                  className="w-full h-full object-cover border-4 border-foreground"
                />
              ) : (
                <div
                  className="w-full h-full border-4 border-foreground flex items-center justify-center"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <span className="text-primary-foreground pixel-48">
                    {getUserInitial()}
                  </span>
                </div>
              )}

              {/* Upload button overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 border-2 border-foreground hover:translate-x-[1px] hover:translate-y-[1px] transition-transform shadow-retro-sm"
              >
                <Upload size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <p className="text-center text-foreground pixel-10 leading-tight">
              @{user.username}
            </p>
          </div>
        </div>

        {/* Forms Section */}
        <div className="lg:col-span-2 space-y-8">
          {/* Username Form */}
          <div className="bg-card border-4 border-border p-6 card-panel">
            <h2 className="text-foreground mb-6 pixel-12 leading-tight">
              <User size={16} className="inline mr-2" />
              NICK
            </h2>

            {!isEditingUsername ? (
              <div className="flex items-center justify-between">
                <p className="text-foreground mono-16">
                  {user.username}
                </p>
                <button
                  onClick={() => setIsEditingUsername(true)}
                  className="bg-primary text-primary-foreground px-4 py-2 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg"
                >
                  EDYTUJ
                </button>
              </div>
            ) : (
              <form onSubmit={handleUsernameUpdate} className="space-y-4">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-input-background text-foreground border-4 border-border focus:border-primary focus:outline-none mono-font"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={newUsername === user.username}
                    className="flex-1 bg-primary text-primary-foreground px-4 py-2 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed pixel-10 shadow-retro-fg"
                  >
                    ZAPISZ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingUsername(false);
                      setNewUsername(user.username);
                    }}
                    className="flex-1 bg-muted text-muted-foreground px-4 py-2 border-4 border-border hover:border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-all pixel-10 shadow-retro"
                  >
                    ANULUJ
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={() => navigate('/change-password')}
              className="w-full bg-primary text-primary-foreground px-6 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg"
            >
              <Lock size={16} className="inline mr-2" />
              ZMIEŃ HASŁO
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-secondary text-secondary-foreground px-6 py-3 border-4 border-border hover:border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-all pixel-10 shadow-retro"
            >
              <LogOut size={16} className="inline mr-2" />
              WYLOGUJ
            </button>

            <button
              onClick={handleDeleteAccount}
              className={`w-full px-6 py-3 border-4 transition-all ${
                showDeleteConfirm
                  ? 'bg-destructive text-destructive-foreground border-foreground'
                  : 'bg-muted text-muted-foreground border-border hover:border-destructive'
              } hover:translate-x-[2px] hover:translate-y-[2px] pixel-10 shadow-retro`}
            >
              <Trash2 size={16} className="inline mr-2" />
              {showDeleteConfirm ? 'POTWIERDŹ USUNIĘCIE!' : 'USUŃ KONTO'}
            </button>

            {showDeleteConfirm && (
              <div className="bg-destructive/20 border-4 border-destructive p-4">
                <p className="text-destructive text-center pixel-8 leading-relaxed">
                  UWAGA! Ta operacja jest nieodwracalna! Kliknij ponownie, aby potwierdzić.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
