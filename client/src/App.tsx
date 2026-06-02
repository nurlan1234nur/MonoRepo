import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import CoupleSetup from './pages/CoupleSetup';
import Home from './pages/Home';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Уншиж байна…</div>;
  }

  if (!user) return <AuthPage />;
  if (!user.couple) return <CoupleSetup />;
  return <Home />;
}
