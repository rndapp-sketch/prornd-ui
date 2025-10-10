import React, { useEffect } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";

interface UseUserRolesResult {
  roles: string[];
  isLoading: boolean;
  error: any; // Use 'any' to accommodate the Frappe error type
}

export const useUserRoles = (user: string | null): UseUserRolesResult => {
  const { data, error, isLoading } = useFrappeGetCall(
    "rndopsapp.rndopsapp.api.get_user_roles",
    { user },
    { enabled: !!user } // Only run if user is not null
  );

  useEffect(() => {
    if (isLoading && user) console.log("Fetching roles for:", user);
    if (error) console.error("Error fetching roles:", error);
    if (data) console.log("Fetched roles data:", data);
  }, [data, error, isLoading, user]);

  const roles = (data?.message || []) as string[];
  return { roles, isLoading, error };
};

interface UserRolesViewerProps {
  user: string;
}

export const UserRolesViewer: React.FC<UserRolesViewerProps> = ({ user }) => {
  const { roles, isLoading, error } = useUserRoles(user);

  if (isLoading) return <div>Loading roles...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h3>Roles for {user}:</h3>
      {roles.length > 0 ? (
        <ul>
          {roles.map((role: string, index: number) => (
            <li key={index}>{role}</li>
          ))}
        </ul>
      ) : (
        <p>No roles found for {user}.</p>
      )}
    </div>
  );
};
