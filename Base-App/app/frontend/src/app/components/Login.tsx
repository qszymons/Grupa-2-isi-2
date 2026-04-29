import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { LogIn } from "lucide-react";

interface LoginProps {
  setIsAuthenticated: (value: boolean) => void;
}

const parseErrors = (data: any): { global: string, fields: Record<string, string> } => {
  const result = { global: "", fields: {} as Record<string, string> };

  if (!data?.detail) {
    result.global = "Błąd serwera";
    return result;
  }

  if (typeof data.detail === 'string') {
    const detailLower = data.detail.toLowerCase();
    if (detailLower.includes('invalid credentials') || detailLower.includes('incorrect') || detailLower.includes('nieprawidłow')) {
      result.fields['login_highlight'] = "true";
      result.fields['password'] = data.detail;
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

export function Login({ setIsAuthenticated }: LoginProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ login, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        const parsed = parseErrors(data);
        if (parsed.global) setError(parsed.global);
        if (Object.keys(parsed.fields).length > 0) setFieldErrors(parsed.fields);
        return;
      }

      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      navigate('/');
    } catch (err) {
      setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-foreground mb-8 text-center pixel-20 leading-relaxed">
          LOGOWANIE
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
                Email lub nick
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.login || fieldErrors.username || fieldErrors.login_highlight ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
              />
              {(fieldErrors.login || fieldErrors.username) && (
                <p className="text-destructive mt-2 pixel-8">{fieldErrors.login || fieldErrors.username}</p>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground px-6 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed pixel-10 shadow-retro-fg"
            >
              <LogIn size={16} className="inline mr-2" />
              {loading ? "ŁADOWANIE..." : "ZALOGUJ"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-center text-muted-foreground pixel-8 leading-relaxed">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Zapomniałeś hasła?
              </Link>
            </p>
            <p className="text-center text-muted-foreground pixel-8 leading-relaxed">
              Nie masz konta?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Zarejestruj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
