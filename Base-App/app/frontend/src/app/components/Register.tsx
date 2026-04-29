import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { UserPlus } from "lucide-react";

const parseErrors = (data: any): { global: string, fields: Record<string, string> } => {
  const result = { global: "", fields: {} as Record<string, string> };

  if (!data?.detail) {
    result.global = "Błąd serwera";
    return result;
  }

  if (typeof data.detail === 'string') {
    if (data.detail.toLowerCase().includes('email already registered')) {
      result.global = "Ten adres email jest już zarejestrowany.";
    } else if (data.detail.toLowerCase().includes('username already registered')) {
      result.global = "Ta nazwa użytkownika jest już zajęta.";
    } else {
      result.global = data.detail;
    }
    return result;
  }

  if (Array.isArray(data.detail)) {
    data.detail.forEach((err: any) => {
      const field = err.loc?.[1];
      let msg = err.msg || "Błąd walidacji";

      if (msg.includes("value is not a valid email address")) msg = "Niepoprawny adres email";
      else if (msg.includes("String should have at least")) msg = "Zbyt krótka wartość";
      else if (msg.includes("String should have at most")) msg = "Zbyt długa wartość";
      else if (msg.includes("ensure this value has at least")) msg = "Wartość jest zbyt krótka";

      if (field && typeof field === 'string') {
        result.fields[field] = msg;
      } else {
        result.global += msg + " ";
      }
    });
    return result;
  }

  result.global = JSON.stringify(data.detail);
  return result;
};

export function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateUsername = (username: string): boolean => {
    return /^[a-zA-Z0-9_-]{3,20}$/.test(username);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!validateUsername(username)) {
      setFieldErrors(prev => ({ ...prev, username: "Nick musi mieć 3-20 znaków i zawierać tylko litery, cyfry, _ lub -" }));
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: "Hasła nie są zgodne" }));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        const parsed = parseErrors(data);
        if (parsed.global) setError(parsed.global);
        if (Object.keys(parsed.fields).length > 0) setFieldErrors(parsed.fields);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="bg-card border-4 border-border p-8 max-w-md text-center card-panel">
          <p className="text-primary mb-4 pixel-12 leading-relaxed">
            SUKCES!
          </p>
          <p className="text-foreground pixel-8 leading-relaxed">
            Sprawdź swoją skrzynkę email, aby aktywować konto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-foreground mb-8 text-center pixel-20 leading-relaxed">
          REJESTRACJA
        </h1>

        <div className="bg-card border-4 border-border p-8 card-panel">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/20 border-4 border-destructive p-4">
                <p className="text-destructive pixel-8 leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            <div>
              <label className="block text-foreground mb-2 pixel-10">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.email ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
              />
              {fieldErrors.email && (
                <p className="text-destructive mt-2 pixel-8">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-foreground mb-2 pixel-10">
                Nick
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.username ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
              />
              {fieldErrors.username && (
                <p className="text-destructive mt-2 pixel-8">{fieldErrors.username}</p>
              )}
            </div>

            <div>
              <label className="block text-foreground mb-2 pixel-10">
                Hasło
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.password ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
              />
              {fieldErrors.password && (
                <p className="text-destructive mt-2 pixel-8">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-foreground mb-2 pixel-10">
                Potwierdź hasło
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.confirmPassword ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-destructive mt-2 pixel-8">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground px-6 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed pixel-10 shadow-retro-fg"
            >
              <UserPlus size={16} className="inline mr-2" />
              {loading ? "ŁADOWANIE..." : "ZAREJESTRUJ"}
            </button>
          </form>

          <p className="mt-6 text-center text-muted-foreground pixel-8 leading-relaxed">
            Masz już konto?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
