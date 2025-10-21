import React, { useEffect, useState } from 'react';
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk"; // Import Frappe hooks

const UserRoleCheck = () => {
  const { currentUser } = useFrappeAuth(); // Fetch the current user data
  const [isPermanentEmployee, setIsPermanentEmployee] = useState<boolean | null>(null); // State to store the result
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["user_roles"], // Fetch only user_roles to minimize data
    enabled: !!currentUser,  // Only fetch if currentUser exists
  });

  useEffect(() => {
    if (!isUserLoading && userData) {
      const isPermanent = userData?.user_roles?.some((role: any) => role.role === "Permanent Employee") || false;
      setIsPermanentEmployee(isPermanent);
    }
  }, [userData, isUserLoading]);

  if (isUserLoading) {
    return null;  // Return nothing or a loading spinner if needed
  }

  return isPermanentEmployee;
};

export default UserRoleCheck;
