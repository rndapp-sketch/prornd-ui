import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from './UserRole';
import { GlobalLoader } from '@/components/ui/global-loader';

type StudentProfileCheck = { is_student: boolean; is_complete: boolean } | null;

// AuthRouteWrapper mounts fresh on every protected-route navigation, and a
// plain useFrappeGetCall re-hits the endpoint on each of those mounts once
// enough time has passed (SWR's dedupingInterval is only ~2s) — visible as a
// flicker while browsing, especially since this endpoint can be slow/erroring.
// Cache the result at module scope so it's fetched at most once per user per
// session, not once per navigation.
let studentProfileCache: { user: string; promise: Promise<StudentProfileCheck> } | null = null;

function checkStudentProfileOnce(user: string): Promise<StudentProfileCheck> {
  if (studentProfileCache?.user === user) return studentProfileCache.promise;
  const promise = fetch(
    '/api/method/rndopsapp.rndopsapp.user_api.student_api.get_my_student_profile',
    { credentials: 'include' },
  )
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => json?.message ?? null)
    .catch(() => null);
  studentProfileCache = { user, promise };
  return promise;
}

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
  blockedRole?: AllowedRole | AllowedRole[];
  children: React.ReactNode;
}

const AUTH_STORAGE_KEY = 'prornd_last_user';

const AuthRouteWrapper: React.FC<AuthRouteWrapperProps> = ({ allowedRole, blockedRole, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();
  const { roles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

  // A student added by a PI can log in straight away, but must complete their
  // own details before using the portal. This is the single gate for that —
  // every protected route goes through AuthRouteWrapper. Checked at most once
  // per session (see checkStudentProfileOnce) rather than on every mount.
  const [studentProfile, setStudentProfile] = useState<StudentProfileCheck>(null);
  const [isStudentProfileLoading, setIsStudentProfileLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setIsStudentProfileLoading(false);
      return;
    }
    let cancelled = false;
    checkStudentProfileOnce(currentUser).then((result) => {
      if (cancelled) return;
      setStudentProfile(result);
      setIsStudentProfileLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // A user carrying the "Student" role is the authoritative signal that they
  // need a completed profile. If the lookup failed (endpoint error) we fail
  // open — only an explicit is_complete: false forces the redirect — so a
  // backend outage doesn't lock every student out of the whole portal.
  const isStudentRole = !!roles?.includes('Student');
  const mustCompleteProfile =
    !isStudentProfileLoading &&
    isStudentRole &&
    studentProfile?.is_complete === false;

  useEffect(() => {
    if (!mustCompleteProfile) return;
    if (location.pathname === '/student-profile') return;
    navigate('/student-profile', { replace: true });
  }, [mustCompleteProfile, location.pathname, navigate]);

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
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 500);
        return () => clearTimeout(timer);
      }

      // Clear stored user and redirect to login
      localStorage.removeItem(AUTH_STORAGE_KEY);
      navigate('/login');
      return;
    }

    // Reset retry count on successful auth
    if (retryCount > 0) {
      setRetryCount(0);
    }

    // If there was an actual error fetching roles, log it but don't redirect
    if (rolesError) {
      return;
    }

    // If roles is null/undefined/empty after loading completes, wait — don't redirect yet
    if (!roles || roles.length === 0) {
      return;
    }

    // Access Control Logic
    const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];

    // Check blocked roles first — deny even if user would otherwise have access.
    if (blockedRole) {
      const blockedRoles = Array.isArray(blockedRole) ? blockedRole : [blockedRole];
      const isBlocked = blockedRoles.some(role => roles.includes(role));
      if (isBlocked) {
        navigate('/dashboard');
        return;
      }
    }

    // Exception for routes that are for all logged-in users.
    if (allowedRoles.includes('All_ProRnd_User')) {
      return; // Access granted
    }

    // Check if user has at least one of the allowed roles
    const hasAccess = allowedRoles.some(role => roles.includes(role));

    if (!hasAccess) {
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
