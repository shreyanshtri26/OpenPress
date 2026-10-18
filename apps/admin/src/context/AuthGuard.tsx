// src/context/AuthGuard.tsx
import { ReactNode, useContext, useEffect } from 'react';
import { useRouter } from '@/hooks/useRouter';
import toast from 'react-hot-toast';
import { UserContext } from './UserContext';

type AuthGuardProps = {
  children: ReactNode;
  allowedRoles?: string[];
};

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const userContext = useContext(UserContext);
  const user = userContext?.user ?? null;
  const loading = userContext?.loading ?? true;
  const router = useRouter();

  useEffect(() => {
    // Wait until the loading is finished
    if (loading) {
      return;
    }

    // If user is not logged in, redirect to login page
    if (!user) {
      router.replace('/login');
      return;
    }

    // If there are allowedRoles and the user's role is not included, redirect
    // if (allowedRoles && !allowedRoles.includes(user.role)) {
    //   toast.error('You are not authorized to view this page.');
    //   router.replace('/dashboard'); // Or a dedicated '/unauthorized' page
    // }
  }, [user, loading, router]);

  // While loading, show a loader to prevent flicker
  if (loading) {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  // If user is authenticated and authorized, render the page
  if (user) {
    return <>{children}</>;
  }

  // Fallback, though the useEffect should handle redirection
  return null;
};
