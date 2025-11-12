import React, { useEffect, useState, useMemo } from 'react';
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk"; // Import Frappe hooks
import { useUserRoles } from './UserRole';

const UserRoleCheck = () => {
  const { currentUser } = useFrappeAuth(); // Fetch the current user data
  const [isPermanentEmployee, setIsPermanentEmployee] = useState<boolean | null>(null); // State to store the result
  
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["roles"], // Fetch roles from the User doctype
    enabled: !!currentUser,  // Only fetch if currentUser exists
  });

  const { roles: fetchedRoles, isLoading: areRolesLoading } = useUserRoles(currentUser ?? null);

  const combinedRoles = useMemo(() => {
    const rolesFromUserData = userData?.roles?.map((r: any) => r.role) ?? [];
    const allRoles = [...new Set([...rolesFromUserData, ...fetchedRoles])];
    return allRoles;
  }, [userData, fetchedRoles]);

  useEffect(() => {
    if (!isUserLoading && !areRolesLoading) {
      const isPermanent = combinedRoles.includes("Permanent Employee");
      setIsPermanentEmployee(isPermanent);
    }
  }, [combinedRoles, isUserLoading, areRolesLoading]);

  if (isUserLoading || areRolesLoading) {
    return null;  // Return nothing or a loading spinner if needed
  }

  return isPermanentEmployee;
};

export default UserRoleCheck;
