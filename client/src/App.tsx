import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CoupleProvider } from './context/CoupleContext';
import AuthPage from './pages/AuthPage';
import CoupleSetup from './pages/CoupleSetup';
import Layout from './components/Layout';
import PhoneFrame from './components/PhoneFrame';
import Home from './pages/Home';
import Timeline from './pages/Timeline';
import Chat from './pages/Chat';
import Memories from './pages/Memories';
import More from './pages/More';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">Уншиж байна…</div>
    );
  }

  if (!user) return <AuthPage />;
  if (!user.couple) return <CoupleSetup />;

  return (
    <CoupleProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/more" element={<More />} />
        </Route>
        <Route
          path="/chat"
          element={
            <PhoneFrame>
              <Chat />
            </PhoneFrame>
          }
        />
      </Routes>
    </CoupleProvider>
  );
}
