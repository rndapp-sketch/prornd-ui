import { useEffect } from "react";
import useSWR from "swr";
import type { Models } from "appwrite";
import { appwriteClient } from "@/lib/appwrite";
import { channels, listConversations, type Conversation } from "@/services/messagingService";

export function useConversations(myUserId: string | null) {
    const { data, error, isLoading, mutate } = useSWR(
        myUserId ? ["appwrite:conversations", myUserId] : null,
        () => listConversations(myUserId as string),
        { refreshInterval: myUserId ? 1000 : 0 },
    );

    useEffect(() => {
        if (!myUserId) return;
        const unsub = appwriteClient.subscribe<Models.Document>(channels.conversations(), () => {
            // Any change anywhere in conversations → revalidate.
            // We could merge in-place, but conversation updates are infrequent
            // and the cost of a refetch is small.
            mutate();
        });
        return () => unsub();
    }, [myUserId, mutate]);

    return {
        conversations: (data ?? []) as Conversation[],
        isLoading,
        error,
        refresh: mutate,
    };
}
