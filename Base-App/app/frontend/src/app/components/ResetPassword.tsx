import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Lock } from "lucide-react";

const parseErrors = (data: any): { global: string, fields: Record<string, string> } => {
  const result = { global: "", fields: {} as Record<string, string> };

  if (!data?.detail) {
    result.global = "Błąd serwera";
    return result;
  }

  if (typeof data.detail === 'string') {
    result.global = data.detail;
    return result;
  }

  if (Array.isArray(data.detail)) {
    data.detail.forEach((err: any) => {
      const field = err.loc?.[1];
      let msg = err.msg || "Błąd walidacji";

      if (msg.startsWith("Value error, ")) msg = msg.replace("Value error, ", "");
      else if (msg.includes("value is not a valid email address")) msg = "Niepoprawny adres email";
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

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Hasła nie są zgodne" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: newPassword }),
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
            Hasło zostało zmienione. Przekierowanie do logowania...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-foreground mb-8 text-center pixel-20 leading-relaxed">
          NOWE HASŁO
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
                Nowe hasło
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className={`w-full px-4 py-3 bg-input-background text-foreground border-4 focus:outline-none mono-font ${fieldErrors.new_password || fieldErrors.newPassword ? 'border-destructive focus:border-destructive' : 'border-border focus:border-primary'}`}
              />
              {(fieldErrors.new_password || fieldErrors.newPassword) && (
                <p className="text-destructive mt-2 pixel-8">{fieldErrors.new_password || fieldErrors.newPassword}</p>
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
              <Lock size={16} className="inline mr-2" />
              {loading ? "ZAPISYWANIE..." : "ZMIEŃ HASŁO"}
            </button>
          </form>

          <p className="mt-6 text-center text-muted-foreground pixel-8 leading-relaxed">
            <Link to="/login" className="text-primary hover:underline">
              Powrót do logowania
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
