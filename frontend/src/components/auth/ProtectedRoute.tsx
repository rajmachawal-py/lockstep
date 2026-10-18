import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert, Terminal } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <div className="auth-loading-icon-wrapper">
            <ShieldAlert size={36} className="auth-loading-icon" />
            <div className="auth-loading-ring" />
          </div>
          <div className="auth-loading-text">
            <div className="auth-loading-title">AUTHENTICATING OPERATOR</div>
            <div className="auth-loading-subtitle">
              Verifying cryptographic session & RBAC credentials...
            </div>
          </div>
          <div className="auth-loading-telemetry">
            <Terminal size={12} />
            <span>sys.auth.validate_token() [OK]</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
