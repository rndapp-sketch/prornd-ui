import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from './UserRole'; // Import the new useUserRoles hook

// The type now correctly includes "Permanent Employee"
interface AuthRouteWrapperProps {
  allowedRole: 'Permanent Employee' | 'non-permanent';
  children: React.ReactNode;
}

const AuthRouteWrapper: React.FC<AuthRouteWrapperProps> = ({ allowedRole, children }) => {
  const navigate = useNavigate();
  const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();
  // Use the new useUserRoles hook to fetch user roles
  const { roles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

  useEffect(() => {
    console.log("AuthRouteWrapper useEffect triggered:");
    console.log("  isAuthLoading:", isAuthLoading);
    console.log("  isRolesLoading:", isRolesLoading);
    console.log("  currentUser:", currentUser);
    console.log("  rolesError:", rolesError);
    console.log("  roles:", roles);

    if (isAuthLoading || isRolesLoading) {
      console.log("  AuthRouteWrapper: Still loading auth or roles, returning.");
      return; // Wait for authentication check and roles to complete
    }

    if (!currentUser) {
      console.log("  AuthRouteWrapper: No current user, navigating to /login.");
      navigate('/login'); // If not logged in at all, go to login
      return;
    }

    if (rolesError) {
      console.error("AuthRouteWrapper: Error fetching user roles:", rolesError);
      console.log("  AuthRouteWrapper: Roles error, navigating to /home.");
      navigate('/home'); // Handle error during role fetching
      return;
    }

    // Once user data and roles are available, perform the role check
    if (roles) {
      const isPermanentEmployee = roles.includes("Permanent Employee");
      console.log("  AuthRouteWrapper: isPermanentEmployee:", isPermanentEmployee);

      // If the user's role does not match what this route allows, redirect them to a default unauthorized page.
      // The Dashboard component handles the initial role-based redirection.
      if (allowedRole === 'Permanent Employee' && !isPermanentEmployee) {
        console.log("AuthRouteWrapper: User is not Permanent Employee, redirecting to /home.");
        navigate('/home');
      } else if (allowedRole === 'non-permanent' && isPermanentEmployee) {
        console.log("AuthRouteWrapper: User is Permanent Employee trying to access non-permanent route, redirecting to /home.");
        navigate('/home'); // Redirect to home if a PE tries to access a non-PE route
      }
    }
  }, [isAuthLoading, isRolesLoading, currentUser, roles, rolesError, allowedRole, navigate]);

  // Show a loading state while we verify authentication and roles
  if (isAuthLoading || isRolesLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-100">
            <div>Verifying Access...</div>
        </div>
    );
  }

  // If all checks pass, render the actual page component (the children)
  return <>{children}</>;
};

export default AuthRouteWrapper;
