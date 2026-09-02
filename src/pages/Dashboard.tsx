import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from '../components/UserRole'; // Import the new hook
import { GlobalLoader } from '@/components/ui/global-loader';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();

  // Use the new useUserRoles hook to fetch user roles
  const { roles, isLoading: isRolesLoading, error: rolesError, mutate } = useUserRoles(currentUser ?? null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // GUARD: Only run redirect logic if we're actually on /dashboard
    // This prevents unwanted redirects when navigating to other routes
    if (location.pathname !== '/dashboard') {
      return;
    }

    // Wait until both authentication and roles are no longer loading
    if (isAuthLoading || isRolesLoading) {
      return;
    }

    // If currentUser is explicitly null (not just undefined during loading), redirect to login
    if (currentUser === null) {
      navigate('/login');
      return;
    }

    // If currentUser is undefined (initial state before any auth check result), wait
    if (currentUser === undefined) {
      return;
    }

    // Handle error during role fetching
    if (rolesError) {
      if (retryCount < 5) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          if (mutate) mutate();
        }, 3000);
      }
      return;
    }

    // If roles are not yet loaded (undefined or null), wait.
    // We only proceed if we have an array (even empty) or an error.
    if (!roles) {
      return;
    }

    // If roles are loaded, perform the redirection
    if (roles.length > 0) {
      const isHosRnd = roles.includes('Hos, RnD (Head of Section, RnD)');
      const isPermanentEmployee = roles.includes('Permanent Employee');
      const isDirector = roles.includes('Director');
      const isDean = roles.includes('Dean, RnD');
      const isHead = roles.includes('head_approver_1');
      const isProjectStaff = roles.includes('project staff');
      const isRndStaff = roles.includes('staff, RnD');
      const isAdoRnd = roles.includes('Ado_RnD');
      const isStudent = roles.includes('Student');

      const isInspiredFaculty = roles.includes('Inspired Faculty');
      const isIndependentResearcher = roles.includes('Independent Researcher');


      // Role-based redirection (in order of priority)
      // Higher administrative roles first, then specialized roles, then general roles
      if (isDirector) {
        navigate('/director-dashboard');
      } else if (isDean) {
        navigate('/dean-dashboard');
      } else if (isAdoRnd) {
        // Ado_RnD should come before HoS as it's a specialized administrative role
        navigate('/ado-rnd-dashboard');
      } else if (isHosRnd) {
        navigate('/hos-rnd-dashboard');
      } else if (isHead) {
        navigate('/head-dashboard');
      } else if (isRndStaff) {
        // RnD staff before project staff as they have broader scope
        navigate('/rnd-staff-dashboard');
      } else if (isProjectStaff) {
        navigate('/project-staff-dashboard');
      } else if (isStudent) {
        navigate('/student-dashboard');
      } else if (isInspiredFaculty || isIndependentResearcher) {
        navigate('/home');
      } else if (isPermanentEmployee) {
        navigate('/pihomepage');
      } else {
        if (retryCount < 5) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            if (mutate) mutate();
          }, 3000);
        }
      }
    } else {
      // If no roles found, attempt to refetch before giving up
      if (retryCount < 5) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          if (mutate) mutate();
        }, 3000);
      }
    }
    // NOTE: navigate is intentionally omitted - React Router guarantees it's stable
    // location.pathname is added to ensure redirect logic only runs on /dashboard route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isAuthLoading, roles, isRolesLoading, rolesError, location.pathname, retryCount]);

  // Display a loading message while we determine the correct route
  const isLoading = isAuthLoading || isRolesLoading || Boolean(currentUser && !roles && !rolesError);
  return <GlobalLoader isLoading={isLoading} />;
};

export default Dashboard;
