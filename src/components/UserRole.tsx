import React, { useEffect, useRef } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";

interface UseUserRolesResult {
  roles: string[];
  isLoading: boolean;
  error: any; // Use 'any' to accommodate the Frappe error type
}

export const useUserRoles = (user: string | null): UseUserRolesResult => {
  // Track if we've ever loaded roles - prevents showing loading on revalidation
  const hasEverLoaded = useRef(false);

  const { data, error, isLoading } = useFrappeGetCall(
    "rndopsapp.rndopsapp.api.get_user_roles",
    { user },
    {
      enabled: !!user,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      key: `user-roles-${user}` // Force unique cache key per user
    }
  );

  // Mark as loaded once we have data
  if (data?.message) {
    hasEverLoaded.current = true;
  }

  useEffect(() => {
    if (isLoading && user) console.log("Fetching roles for:", user);
    if (error) console.error("Error fetching roles:", error);
    if (data) console.log("Fetched roles data:", data);
  }, [data, error, isLoading, user]);

  // Only show loading on INITIAL load, not on revalidation
  // Once we have data, never show loading again
  const isEffectiveLoading = !hasEverLoaded.current && !!user && (isLoading || (data === undefined && !error));

  const roles = (data?.message || []) as string[];
  return { roles, isLoading: isEffectiveLoading, error };
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
