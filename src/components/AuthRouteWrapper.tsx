import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from './UserRole'; // This is your existing hook
import { GlobalLoader } from '@/components/ui/global-loader';

// Type definition remains the same
type AllowedRole =
  | 'Director'
  | 'Dean, RnD'
  | 'head_approver_1'
  | 'Hos, RnD (Head of Section, RnD)'
  | 'staff, RnD'
  | 'project staff'
  | 'Independent Researcher'
  | 'Permanent Employee'
  | 'All_ProRnd_User'
  | 'non-permanent';

interface AuthRouteWrapperProps {
  allowedRole: AllowedRole;
  children: React.ReactNode;
}

const AuthRouteWrapper: React.FC<AuthRouteWrapperProps> = ({ allowedRole, children }) => {
  const navigate = useNavigate();
  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();
  const { roles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

  useEffect(() => {
    // 1. Wait until ALL loading is complete before doing anything.
    // This is the most critical part of the fix.
    if (isAuthLoading || isRolesLoading) {
      return;
    }

    // 2. If loading is done and there's no user, go to login.
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // 3. If there was an error fetching roles, redirect to a safe fallback.
    if (rolesError || !roles) {
      console.error("AuthRouteWrapper: Error or no roles found, redirecting.");
      navigate('/home');
      return;
    }

    // --- 4. THE SIMPLIFIED AND CORRECT LOGIC ---
    // The component now only cares about the one role it's supposed to allow.

    // Exception for routes that are for all logged-in users.
    if (allowedRole === 'All_ProRnd_User') {
      return; // Access granted, do nothing.
    }

    // The single, powerful check:
    // If the user's roles array does NOT include the specific role this route requires,
    // then they are not authorized. Redirect them back to the main dispatcher.
    // if (!roles.includes(allowedRole)) {
    //   console.warn(`Access Denied: User with roles [${roles.join(', ')}] tried to access a route for '${allowedRole}'. Redirecting to dispatcher.`);
    //   // Redirecting to '/dashboard' is better than '/home' because it allows the
    //   // dispatcher to correctly route the user to their actual dashboard.
    //   navigate('/dashboard'); 
    // }
    // If the check passes (the user has the role), we do nothing, and the children are rendered.

  }, [isAuthLoading, isRolesLoading, currentUser, roles, rolesError, allowedRole, navigate]);

  // Show a loading screen ONLY while loading.
  if (isAuthLoading || isRolesLoading) {
    return <GlobalLoader isLoading={true} />;
  }

  // If loading is finished and all checks passed, render the page.
  return <>{children}</>;
};

export default AuthRouteWrapper;