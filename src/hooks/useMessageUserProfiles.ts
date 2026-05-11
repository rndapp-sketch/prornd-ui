import { useEffect, useMemo, useRef, useState } from "react";
import { commonAPI } from "@/services/apiService";

export interface MessageUserProfile {
    email: string;
    fullName: string;
    designation: string;
    department: string;
    employeeId: string;
}

type UserDetailsResponse = {
    message?: {
        full_name?: string;
        designation_name?: string;
        designation?: string;
        department_name?: string;
        applicant_department?: string;
        employee_id?: string;
    };
};

const fallbackProfile = (email: string): MessageUserProfile => ({
    email,
    fullName: email,
    designation: "",
    department: "",
    employeeId: "",
});

async function fetchUserProfile(email: string): Promise<MessageUserProfile> {
    const response = await fetch(`/api/method/${commonAPI.getUserDetailsByEmail}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Frappe-CSRF-Token": (window as Window & { csrf_token?: string }).csrf_token || "",
        },
        credentials: "include",
        body: JSON.stringify({ user_email: email }),
    });

    if (!response.ok) return fallbackProfile(email);

    const result = (await response.json()) as UserDetailsResponse;
    const details = result.message;
    if (!details) return fallbackProfile(email);

    return {
        email,
        fullName: details.full_name || email,
        designation: details.designation_name || details.designation || "",
        department: details.department_name || details.applicant_department || "",
        employeeId: details.employee_id || "",
    };
}

export function useMessageUserProfiles(emails: string[]) {
    const cacheRef = useRef<Record<string, MessageUserProfile>>({});
    const [profiles, setProfiles] = useState<Record<string, MessageUserProfile>>({});

    const emailsKey = Array.from(
        new Set(
            emails
                .map((email) => email.trim().toLowerCase())
                .filter(Boolean),
        ),
    )
        .sort()
        .join("\n");
    const normalizedEmails = useMemo(
        () => (emailsKey ? emailsKey.split("\n") : []),
        [emailsKey],
    );

    useEffect(() => {
        let cancelled = false;

        const seed = normalizedEmails.reduce<Record<string, MessageUserProfile>>((acc, email) => {
            acc[email] = cacheRef.current[email] ?? fallbackProfile(email);
            return acc;
        }, {});
        setProfiles(seed);

        const missing = normalizedEmails.filter((email) => !cacheRef.current[email]);
        if (missing.length === 0) return;

        void Promise.all(
            missing.map(async (email) => {
                try {
                    const profile = await fetchUserProfile(email);
                    cacheRef.current[email] = profile;
                    return profile;
                } catch {
                    const profile = fallbackProfile(email);
                    cacheRef.current[email] = profile;
                    return profile;
                }
            }),
        ).then((loadedProfiles) => {
            if (cancelled) return;
            setProfiles((current) => {
                const next = { ...current };
                loadedProfiles.forEach((profile) => {
                    next[profile.email.toLowerCase()] = profile;
                });
                return next;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [normalizedEmails]);

    return profiles;
}

export function formatMessageUserDetail(
    profile?: Pick<MessageUserProfile, "designation" | "department">,
) {
    if (!profile) return "";
    return [profile.designation, profile.department].filter(Boolean).join(" • ");
}
