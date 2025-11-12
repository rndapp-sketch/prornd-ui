


import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from '../components/UserRole'; // Import the new hook

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

    // If roles are loaded, perform the redirection
  //   if (roles) {
  //     if (roles.length > 0) {
  //       const isHosRnd = roles.includes('Hos, RnD (Head of Section, RnD)');
  //       const isPermanentEmployee = roles.includes('Permanent Employee');

  //       if (isHosRnd) {
  //         navigate('/hos-rnd');
  //       } else if (isPermanentEmployee) {
  //         navigate('/pihomepage');
  //       } else {
  //         navigate('/home');
  //       }
  //     } else {
  //       // If no roles found, default to home or a specific page
  //       navigate('/home');
  //     }
  //   }
  // }, [currentUser, isAuthLoading, roles, isRolesLoading, rolesError, navigate]);


  // mky

  if (roles) {
      if (roles.length > 0) {
        const isHosRnd = roles.includes('Hos, RnD (Head of Section, RnD)');
        const isPermanentEmployee = roles.includes('Permanent Employee');
        const isDirector = roles.includes('Director');
        const isDean = roles.includes('Dean, RnD');
        const isHead = roles.includes('head_approver_1');
        const isProjectStaff = roles.includes('project staff');
        const isRndStaff = roles.includes('staff, RnD');

        if (isHosRnd) {
          navigate('/hos-rnd-dashboard');
        } else if (isPermanentEmployee) {
          navigate('/pihomepage');
        } else if (isDirector) {
          navigate('/director-dashboard');
        } else if (isDean) {
          navigate('/dean-dashboard');
        } else if (isHead) {
          navigate('/head-dashboard');
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
    }
  }, [currentUser, isAuthLoading, roles, isRolesLoading, rolesError, navigate]);





  // Display a loading message while we determine the correct route
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <div>Loading user roles and redirecting...</div>
    </div>
  );
};

export default Dashboard;
