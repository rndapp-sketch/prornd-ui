import { useEffect } from "react";
import useSWR from "swr";
import { appwriteClient } from "@/lib/appwrite";
import { channels, listMessages, type Message } from "@/services/messagingService";

interface RealtimeEvent<T> {
    events: string[];
    payload: T;
}

export function useMessages(conversationId: string | null, myUserId?: string | null) {
    const { data, error, isLoading, mutate } = useSWR(
        conversationId ? ["appwrite:messages", conversationId] : null,
        () => listMessages(conversationId as string),
        { refreshInterval: conversationId ? 3000 : 0 },
    );

    const visibleMessages = (data ?? []).filter(
        (message) => !myUserId || !message.deleted_for_user_ids?.includes(myUserId),
    );

    useEffect(() => {
        if (!conversationId) return;
        const unsub = appwriteClient.subscribe<Message>(
            channels.messages(),
            (event: RealtimeEvent<Message>) => {
                const msg = event.payload;
                if (!msg || msg.conversation_id !== conversationId) return;

                const isCreate = event.events.some((e) => e.endsWith(".create"));
                const isUpdate = event.events.some((e) => e.endsWith(".update"));
                const isDelete = event.events.some((e) => e.endsWith(".delete"));

                mutate((current) => {
                    const list = current ?? [];
                    if (isDelete) return list.filter((m) => m.$id !== msg.$id);
                    if (isUpdate)
                        return list.map((m) => (m.$id === msg.$id ? { ...m, ...msg } : m));
                    if (isCreate) {
                        if (list.some((m) => m.$id === msg.$id)) return list;
                        return [...list, msg];
                    }
                    return list;
                }, { revalidate: false });
            },
        );
        return () => unsub();
    }, [conversationId, mutate]);

    return {
        messages: visibleMessages,
        isLoading,
        error,
        refresh: mutate,
        appendMessage: (message: Message) =>
            mutate((current) => {
                const list = current ?? [];
                if (list.some((m) => m.$id === message.$id)) return list;
                return [...list, message];
            }, { revalidate: false }),
        removeMessage: (messageId: string) =>
            mutate((current) => (current ?? []).filter((message) => message.$id !== messageId), {
                revalidate: false,
            }),
        updateMessage: (message: Message) =>
            mutate((current) => {
                const list = current ?? [];
                return list.map((item) => (item.$id === message.$id ? { ...item, ...message } : item));
            }, { revalidate: false }),
    };
}
