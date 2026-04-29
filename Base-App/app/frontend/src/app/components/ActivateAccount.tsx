import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { CheckCircle, XCircle } from "lucide-react";

export function ActivateAccount() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState("");

  useEffect(() => {
    const activateAccount = async () => {
      try {
        const response = await fetch(`/api/activate/${token}`);

        if (!response.ok) {
          const data = await response.json();
          setMessage(data.detail || 'Błąd aktywacji konta');
          setStatus('error');
          return;
        }

        setMessage('Konto zostało aktywowane pomyślnie!');
        setStatus('success');
        setTimeout(() => navigate('/'), 3000);
      } catch (err) {
        setMessage('Błąd połączenia z serwerem');
        setStatus('error');
      }
    };

    if (token) {
      activateAccount();
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="bg-card border-4 border-border p-8 max-w-md text-center card-panel">
        {status === 'loading' && (
          <>
            <p className="text-foreground pixel-12 leading-relaxed">
              AKTYWACJA KONTA...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-primary mx-auto mb-4" />
            <p className="text-primary mb-4 pixel-12 leading-relaxed">
              SUKCES!
            </p>
            <p className="text-foreground pixel-8 leading-relaxed">
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4 pixel-12 leading-relaxed">
              BŁĄD
            </p>
            <p className="text-foreground mb-6 pixel-8 leading-relaxed">
              {message}
            </p>
            <Link
              to="/"
              className="inline-block bg-primary text-primary-foreground px-6 py-3 border-4 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg"
            >
              POWRÓT DO STRONY GŁÓWNEJ
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
