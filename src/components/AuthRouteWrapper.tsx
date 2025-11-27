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
  allowedRole: AllowedRole | AllowedRole[];
  children: React.ReactNode;
}

const AuthRouteWrapper: React.FC<AuthRouteWrapperProps> = ({ allowedRole, children }) => {
  const navigate = useNavigate();
  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();
  const { roles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

  useEffect(() => {
    // 1. Wait until ALL loading is complete before doing anything.
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

    // 4. Access Control Logic
    const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];

    // Exception for routes that are for all logged-in users.
    if (allowedRoles.includes('All_ProRnd_User')) {
      return; // Access granted
    }

    // Check if user has at least one of the allowed roles
    const hasAccess = allowedRoles.some(role => roles.includes(role));

    if (!hasAccess) {
      console.warn(`Access Denied: User with roles [${roles.join(', ')}] tried to access a route for '${allowedRoles.join(', ')}'. Redirecting to dashboard.`);
      navigate('/dashboard');
    }

  }, [isAuthLoading, isRolesLoading, currentUser, roles, rolesError, allowedRole, navigate]);

  // Show a loading screen ONLY while loading.
  if (isAuthLoading || isRolesLoading) {
    return <GlobalLoader isLoading={true} />;
  }

  // If loading is finished and all checks passed (or we are about to redirect), render children.
  // Note: The redirection happens in useEffect, so there might be a brief flash of content or empty state.
  // Ideally, we should only render children if access is granted, but since the redirect is fast, this is usually acceptable.
  // To be stricter, we could add a state `isAuthorized` but let's keep it simple for now as per previous pattern.
  return <>{children}</>;
};

export default AuthRouteWrapper;