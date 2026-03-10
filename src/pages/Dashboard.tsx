import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from '../components/UserRole'; // Import the new hook
import { GlobalLoader } from '@/components/ui/global-loader';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();

  // Use the new useUserRoles hook to fetch user roles
  const { roles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

  useEffect(() => {
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
      console.error("Error fetching user roles:", rolesError);
      navigate('/home');
      return;
    }

    // If roles are not yet loaded (undefined or null), wait.
    // We only proceed if we have an array (even empty) or an error.
    if (!roles) {
      return;
    }

    // If roles are loaded, perform the redirection
    if (roles.length > 0) {
      console.log("Dashboard: Roles loaded:", roles);
      const isHosRnd = roles.includes('Hos, RnD (Head of Section, RnD)');
      const isPermanentEmployee = roles.includes('Permanent Employee');
      const isDirector = roles.includes('Director');
      const isDean = roles.includes('Dean, RnD');
      const isHead = roles.includes('head_approver_1');
      const isProjectStaff = roles.includes('project staff');
      const isRndStaff = roles.includes('staff, RnD');

      const isInspiredFaculty = roles.includes('Inspired Faculty');
      const isIndependentResearcher = roles.includes('Independent Researcher');

      console.log("Dashboard Checks:", { isHosRnd, isPermanentEmployee, isDirector, isDean, isHead, isProjectStaff, isRndStaff, isInspiredFaculty, isIndependentResearcher });

      if (isDirector) {
        navigate('/director-dashboard');
      } else if (isDean) {
        navigate('/dean-dashboard');
      } else if (isHosRnd) {
        navigate('/hos-rnd-dashboard');
      } else if (isHead) {
        navigate('/head-dashboard');
      } else if (isInspiredFaculty || isIndependentResearcher) {
        navigate('/home');
      } else if (isPermanentEmployee) {
        navigate('/pihomepage');
      } else if (isProjectStaff) {
        navigate('/project-staff-dashboard');
      } else if (isRndStaff) {
        navigate('/rnd-staff-dashboard');
      } else {
        navigate('/home');
      }
    } else {
      // If no roles found, default to home or a specific page
      navigate('/home');
    }
  }, [currentUser, isAuthLoading, roles, isRolesLoading, rolesError, navigate]);

  // Display a loading message while we determine the correct route
  return <GlobalLoader isLoading={true} />;
};

export default Dashboard;
