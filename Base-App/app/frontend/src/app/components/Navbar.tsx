import { Link, useLocation } from "react-router";
import { Sun, Moon } from "lucide-react";

interface NavbarProps {
  isDark: boolean;
  toggleTheme: () => void;
  isAuthenticated: boolean;
}

export function Navbar({ isDark, toggleTheme, isAuthenticated }: NavbarProps) {
  const location = useLocation();

  return (
    <nav className="bg-card border-b-4 border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <img src="/book.png" alt="Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-foreground pixel-12">
                BAZA WIEDZY
              </h1>
            </div>

            <div className="flex gap-4">
              <NavLink to="/" active={location.pathname === "/"}>
                Strona główna
              </NavLink>

              {isAuthenticated && (
                <>
                  <NavLink to="/projects" active={location.pathname === "/projects"}>
                    Projekty
                  </NavLink>
                  <NavLink to="/profile" active={location.pathname === "/profile"}>
                    Profil
                  </NavLink>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <NavLink to="/login" active={location.pathname === "/login"}>
                Zaloguj się
              </NavLink>
            )}
            <button
              onClick={toggleTheme}
              className="bg-primary text-primary-foreground px-4 py-2 border-2 border-foreground hover:translate-x-[2px] hover:translate-y-[2px] transition-transform pixel-10 shadow-retro-fg"
              aria-label="Przełącz motyw"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 border-2 transition-all pixel-10 ${active
        ? 'bg-primary text-primary-foreground border-foreground nav-link-active'
        : 'bg-secondary text-secondary-foreground border-border hover:border-foreground nav-link-inactive'
        }`}
    >
      {children}
    </Link>
  );
}
