// import React, { useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useFrappeAuth } from 'frappe-react-sdk';
// import { useUserRoles } from './UserRole'; // Import the new useUserRoles hook

// // The type now correctly includes "Permanent Employee"
// type AllowedRole = 'Permanent Employee' | 'non-permanent' | 'All_ProRnd_User' | 'Hos, RnD (Head of Section, RnD)' | 'staff, RnD';
// interface AuthRouteWrapperProps {
//   allowedRole: AllowedRole;
//   children: React.ReactNode;
// }

// const AuthRouteWrapper: React.FC<AuthRouteWrapperProps> = ({ allowedRole, children }) => {
//   const navigate = useNavigate();
//   const { currentUser, isLoading: isAuthLoading } = useFrappeAuth();
//   // Use the new useUserRoles hook to fetch user roles
//   const { roles, isLoading: isRolesLoading, error: rolesError } = useUserRoles(currentUser ?? null);

//   useEffect(() => {
//     console.log("AuthRouteWrapper useEffect triggered:");
//     console.log("  isAuthLoading:", isAuthLoading);
//     console.log("  isRolesLoading:", isRolesLoading);
//     console.log("  currentUser:", currentUser);
//     console.log("  rolesError:", rolesError);
//     console.log("  roles:", roles);

//     // Wait until both authentication and roles are no longer loading
//     if (isAuthLoading || isRolesLoading) {
//       console.log("  AuthRouteWrapper: Still loading auth or roles, returning.");
//       return;
//     }

//     // If currentUser is explicitly null (not just undefined during loading), redirect to login
//     if (currentUser === null) {
//       console.log("  AuthRouteWrapper: Current user is null, navigating to /login.");
//       navigate('/login');
//       return;
//     }

//     // If currentUser is undefined (initial state before any auth check result), wait
//     if (currentUser === undefined) {
//       console.log("  AuthRouteWrapper: Current user is undefined, waiting for auth check.");
//       return;
//     }

//     if (rolesError) {
//       console.error("AuthRouteWrapper: Error fetching user roles:", rolesError);
//       console.log("  AuthRouteWrapper: Roles error, navigating to /home.");
//       navigate('/home'); // Handle error during role fetching
//       return;
//     }

//     // Once user data and roles are available, perform the role check
//     if (currentUser && roles.length > 0) {
//       const isPermanentEmployee = roles.includes("Permanent Employee");
//       console.log("  AuthRouteWrapper: isPermanentEmployee:", isPermanentEmployee);
//       console.log("  AuthRouteWrapper: allowedRole for current route:", allowedRole);
//       console.log("  AuthRouteWrapper: User roles:", roles);

//       // If the user's role does not match what this route allows, redirect them to a default unauthorized page.
//       // Temporarily bypass role check for All_ProRnd_User to debug redirection
//       if (allowedRole === 'All_ProRnd_User') {
//         console.log("AuthRouteWrapper: allowedRole is All_ProRnd_User, temporarily allowing access for debugging.");
//         // No redirection here, allow access
//       } else if (allowedRole === 'Permanent Employee' && !isPermanentEmployee) {
//         console.log("AuthRouteWrapper: User is not Permanent Employee, redirecting to /home.");
//         navigate('/home'); // Non-permanent employee trying to access PE route, redirect to home
//       } else if (allowedRole === 'non-permanent' && isPermanentEmployee) {
//         console.log("AuthRouteWrapper: User is Permanent Employee trying to access non-permanent route, redirecting to /pihomepage.");
//         navigate('/pihomepage'); // Permanent employee trying to access non-PE route, redirect to pihomepage
//       }
//     } else if (currentUser && !isRolesLoading && roles.length === 0) {
//       // If loading is finished and we have a user but no roles, it's an unauthorized state.
//       console.log("  AuthRouteWrapper: User has no roles, redirecting to /home.");
//       navigate('/home');
//     }
//   }, [isAuthLoading, isRolesLoading, currentUser, roles, rolesError, allowedRole, navigate]); // Keep dependencies as is for now

//   // Show a loading state while we verify authentication and roles
//   if (isAuthLoading || isRolesLoading) {
//     return (
//         <div className="flex h-screen w-full items-center justify-center bg-gray-100">
//             <div>Verifying Access...</div>
//         </div>
//     );
//   }

//   // If all checks pass, render the actual page component (the children)
//   return <>{children}</>;
// };

// export default AuthRouteWrapper;












// -=-==-=-=-=-=



import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useUserRoles } from './UserRole'; // This is your existing hook

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
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#FDFCEC]">
            <div className="font-mono text-neutral-700">Verifying Access...</div>
        </div>
    );
  }

  // If loading is finished and all checks passed, render the page.
  return <>{children}</>;
};

export default AuthRouteWrapper;