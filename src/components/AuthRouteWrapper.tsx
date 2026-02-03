import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from './UserRole';

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

  // Track if we've ever loaded - don't block rendering after initial load
  const hasInitialized = useRef(false);

  if (roles && roles.length > 0) {
    hasInitialized.current = true;
  }

  useEffect(() => {
    // Wait until ALL loading is complete before doing anything.
    if (isAuthLoading || isRolesLoading) {
      return;
    }

    // If loading is done and there's no user, go to login.
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // If there was an error fetching roles, redirect to a safe fallback.
    if (rolesError || !roles) {
      console.error("AuthRouteWrapper: Error or no roles found, redirecting.");
      navigate('/home');
      return;
    }

    // Access Control Logic
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

  // Don't block rendering - let the App.tsx handle navigation loading
  // Only block on initial auth check when we have no user info at all
  if (!hasInitialized.current && (isAuthLoading || isRolesLoading) && !currentUser) {
    // Return null briefly during initial auth check - App.tsx handles the loader
    return null;
  }

  // Render children - loading states are handled by App.tsx
  return <>{children}</>;
};

export default AuthRouteWrapper;