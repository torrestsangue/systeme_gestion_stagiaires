import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';

interface Props {
  children: JSX.Element;
}

export default function ProtectedRoute({ children }: Props) {
  useEffect(() => {
    // could add token validation here
  }, []);

  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
