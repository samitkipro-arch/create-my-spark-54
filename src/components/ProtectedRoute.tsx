import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait max 5 seconds for auth to be ready
    const timeout = setTimeout(() => {
      if (!loading) {
        setIsReady(true);
      }
    }, 100);

    if (!loading) {
      setIsReady(true);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (isReady && !user) {
      const next = encodeURIComponent(window.location.pathname);
      navigate(`/auth?next=${next}`);
    }
  }, [user, isReady, navigate]);

  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
