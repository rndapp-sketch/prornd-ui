import React, { useMemo, useRef } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";

interface UseUserRolesResult {
  roles: string[];
  isLoading: boolean;
  error: any; // Use 'any' to accommodate the Frappe error type
  mutate: any; // SWR mutate function
}

export const useUserRoles = (user: string | null): UseUserRolesResult => {
  // Track if we've ever loaded roles - prevents showing loading on revalidation
  const hasEverLoaded = useRef(false);

  const { data, error, isLoading, mutate } = useFrappeGetCall(
    "rndopsapp.rndopsapp.api.get_user_roles",
    { user },
    user ? `user-roles-${user}` : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
    }
  );

  // Mark as loaded once we have data
  if (data?.message) {
    hasEverLoaded.current = true;
  }

  // Only show loading on INITIAL load, not on revalidation
  // Once we have data, never show loading again
  const isEffectiveLoading = !hasEverLoaded.current && !!user && (isLoading || (data === undefined && !error));

  // Permanent_head holders are permanent staff who also head a unit, so everywhere the
  // app checks "Permanent Employee" they must qualify as well.
  const roles = useMemo(() => {
    const raw = (data?.message || []) as string[];
    return raw.includes("Permanent_head") && !raw.includes("Permanent Employee")
      ? [...raw, "Permanent Employee"]
      : raw;
  }, [data?.message]);
  return { roles, isLoading: isEffectiveLoading, error, mutate };
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
