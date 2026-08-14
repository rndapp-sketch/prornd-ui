import { useEffect } from "react";
import useSWR from "swr";
import { appwriteClient, appwriteDatabases, appwriteConfig, Query } from "@/lib/appwrite";
import { channels, type Conversation, type Message } from "@/services/messagingService";

async function countUnreadByConversation(
    myUserId: string,
    conversations: Conversation[],
): Promise<Record<string, number>> {
    const conversationIds = new Set(conversations.map((conversation) => conversation.$id));
    if (conversationIds.size === 0) return {};

    const res = await appwriteDatabases.listDocuments<Message>(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        [Query.orderDesc("$createdAt"), Query.limit(500)],
    );

    return res.documents.reduce<Record<string, number>>((counts, message) => {
        if (
            conversationIds.has(message.conversation_id) &&
            message.sender_id !== myUserId &&
            !(message.read_by ?? []).includes(myUserId)
        ) {
            counts[message.conversation_id] = (counts[message.conversation_id] ?? 0) + 1;
        }
        return counts;
    }, {});
}

export function useConversationUnreadCounts(
    myUserId: string | null,
    conversations: Conversation[],
) {
    const conversationIds = conversations.map((conversation) => conversation.$id).join(",");
    const { data, mutate } = useSWR(
        myUserId ? ["appwrite:conversation-unread", myUserId, conversationIds] : null,
        () => countUnreadByConversation(myUserId as string, conversations),
        { revalidateOnFocus: false, refreshInterval: myUserId ? 3000 : 0 },
    );

    useEffect(() => {
        if (!myUserId) return;
        const unsub = appwriteClient.subscribe<Message>(channels.messages(), () => {
            mutate();
        });
        return () => unsub();
    }, [myUserId, mutate]);

    return { unreadCounts: data ?? {}, refresh: mutate };
}
