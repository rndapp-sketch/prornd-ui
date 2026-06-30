import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from './UserRole';
import { GlobalLoader } from '@/components/ui/global-loader';

// Type definition remains the same
type AllowedRole =
  | 'Director'
  | 'Dean, RnD'
  | 'DoRnD'
  | 'Ado_RnD'
  | 'head_approver_1'
  | 'Hos, RnD (Head of Section, RnD)'
  | 'staff, RnD'
  | 'project staff'
  | 'Independent Researcher'
  | 'IF - Inspired Faculty'
  | 'Permanent Employee'
  | 'All_ProRnd_User'
  | 'non-permanent'
  | 'Student';

interface AuthRouteWrapperProps {
  allowedRole: AllowedRole | AllowedRole[];
  children: React.ReactNode;
}

const AUTH_STORAGE_KEY = 'prornd_last_user';

const AuthRouteWrapper: React.FC<AuthRouteWrapperProps> = ({ allowedRole, children }) => {
  const navigate = useNavigate();
  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();
  const { roles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

  // Track if we've ever loaded - don't block rendering after initial load
  const hasInitialized = useRef(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Get last known user from localStorage
  const lastKnownUser = localStorage.getItem(AUTH_STORAGE_KEY);

  // Save current user to localStorage when available
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, currentUser);
    }
  }, [currentUser]);

  if (roles && roles.length > 0) {
    hasInitialized.current = true;
  }

  useEffect(() => {
    // Wait until ALL loading is complete before doing anything.
    if (isAuthLoading || isRolesLoading) {
      return;
    }

    // If loading is done and there's no user
    if (!currentUser) {
      // If we had a previous user, this might be a transient failure
      // Retry a few times before redirecting to login
      if (lastKnownUser && retryCount < maxRetries) {
        console.log(`AuthRouteWrapper: No user but had previous session, retry ${retryCount + 1}/${maxRetries}`);
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 500);
        return () => clearTimeout(timer);
      }

      // Clear stored user and redirect to login
      localStorage.removeItem(AUTH_STORAGE_KEY);
      console.log('AuthRouteWrapper: Session expired or no user, redirecting to login');
      navigate('/login');
      return;
    }

    // Reset retry count on successful auth
    if (retryCount > 0) {
      setRetryCount(0);
    }

    // If there was an actual error fetching roles, log it but don't redirect
    if (rolesError) {
      console.error("AuthRouteWrapper: Error fetching roles:", rolesError);
      return;
    }

    // If roles is null/undefined/empty after loading completes, wait — don't redirect yet
    if (!roles || roles.length === 0) {
      console.warn("AuthRouteWrapper: No roles data available after loading.");
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, isRolesLoading, currentUser, roles, rolesError, allowedRole, lastKnownUser, retryCount]);

  // Show loading while authentication is being verified
  // If we have a last known user, assume we're still logged in during initial load
  if (isAuthLoading || (isRolesLoading && !hasInitialized.current)) {
    return <GlobalLoader isLoading delay={0} />;
  }

  // Don't render until we have confirmed auth
  if (!currentUser && !lastKnownUser) {
    return null;
  }

  // Render children
  return <>{children}</>;
};

export default AuthRouteWrapper;
