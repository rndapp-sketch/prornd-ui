import { useEffect } from "react";
import useSWR from "swr";
import { appwriteClient, appwriteDatabases, appwriteConfig, Query } from "@/lib/appwrite";
import { channels, listConversations, type Message } from "@/services/messagingService";

async function countUnread(myUserId: string): Promise<number> {
    const conversations = await listConversations(myUserId);
    const conversationIds = new Set(conversations.map((conversation) => conversation.$id));
    if (conversationIds.size === 0) return 0;

    // Pull the recent message slice and count locally. The membership filter is
    // needed while dev table permissions are broad authenticated-user permissions.
    const res = await appwriteDatabases.listDocuments<Message>(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        [Query.orderDesc("$createdAt"), Query.limit(200)],
    );
    return res.documents.filter(
        (m) =>
            conversationIds.has(m.conversation_id) &&
            m.sender_id !== myUserId &&
            !(m.read_by ?? []).includes(myUserId),
    ).length;
}

export function useUnreadCount(myUserId: string | null) {
    const { data, mutate } = useSWR(
        myUserId ? ["appwrite:unread", myUserId] : null,
        () => countUnread(myUserId as string),
        { revalidateOnFocus: false, refreshInterval: myUserId ? 3000 : 0 },
    );

    useEffect(() => {
        if (!myUserId) return;
        const unsub = appwriteClient.subscribe<Message>(channels.messages(), () => {
            mutate();
        });
        return () => unsub();
    }, [myUserId, mutate]);

    return { unreadCount: data ?? 0, refresh: mutate };
}
