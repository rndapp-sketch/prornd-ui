


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
    console.log("Dashboard useEffect triggered:");
    console.log("  isAuthLoading:", isAuthLoading);
    console.log("  isRolesLoading:", isRolesLoading);
    console.log("  currentUser:", currentUser);
    console.log("  rolesError:", rolesError);
    console.log("  roles:", roles);

    // Wait until we have the authentication status and roles are loaded
    if (isAuthLoading || isRolesLoading) {
      console.log("  Still loading auth or roles, returning.");
      return;
    }

    // If there is no logged-in user, send them to the login page
    if (!currentUser) {
      console.log("  No current user, navigating to /login.");
      navigate('/login');
      return;
    }

    // Handle error during role fetching
    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      console.log("  Roles error, navigating to /home.");
      navigate('/home');
      return;
    }

    // If roles are loaded, perform the redirection
    if (roles) {
      console.log("User roles fetched:", roles); // Print the roles
      if (roles.length > 0) {
        const isPermanentEmployee = roles.includes('Permanent Employee');
        console.log("  isPermanentEmployee:", isPermanentEmployee);

        if (isPermanentEmployee) {
          console.log("  Navigating to /pihomepage.");
          navigate('/pihomepage');
        } else {
          console.log("  Navigating to /home (not Permanent Employee).");
          navigate('/home');
        }
      } else {
        // If no roles found, default to home or a specific page
        console.log("  No roles found, navigating to /home.");
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
