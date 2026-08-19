import type { Models } from "appwrite";
import {
    appwriteDatabases,
    appwriteStorage,
    appwriteConfig,
    ID,
    Permission,
    Role,
    Query,
} from "@/lib/appwrite";

export interface Conversation extends Models.Document {
    members: string[];               // Appwrite userIds
    member_emails: string[];         // Frappe emails for display
    type: "dm" | "group";
    title: string;
    last_message_at: string | null;  // ISO
    last_message_preview: string;
    last_sender_id: string | null;
    typing_user_ids?: string[];
    typing_user_emails?: string[];
    typing_updated_at?: string | null;
}

export interface Message extends Models.Document {
    conversation_id: string;
    sender_id: string;
    sender_email: string;
    body: string;
    attachment_file_ids: string[];
    read_by: string[];               // Appwrite userIds who've read it
    reply_to_message_id?: string | null;
    reply_to_sender_email?: string | null;
    reply_to_body?: string | null;
    reactions?: string[];            // Stored as "emoji:userId"
    deleted_for_user_ids?: string[];
    deleted_for_everyone?: boolean;
    deleted_by?: string | null;
    deleted_at?: string | null;
}

const { databaseId, conversationsCollectionId, messagesCollectionId, attachmentsBucketId } =
    appwriteConfig;

const authenticatedUserPermissions = [
    Permission.read(Role.users()),
    Permission.update(Role.users()),
];

/* ───────── Conversations ───────── */

export async function listConversations(myUserId: string): Promise<Conversation[]> {
    const res = await appwriteDatabases.listDocuments<Conversation>(
        databaseId,
        conversationsCollectionId,
        [Query.contains("members", myUserId), Query.orderDesc("last_message_at"), Query.limit(100)],
    );
    return res.documents;
}

export async function getConversation(conversationId: string): Promise<Conversation> {
    return appwriteDatabases.getDocument<Conversation>(
        databaseId,
        conversationsCollectionId,
        conversationId,
    );
}

export async function leaveConversation(
    conversation: Conversation,
    me: { userId: string; email: string },
): Promise<void> {
    await appwriteDatabases.updateDocument(databaseId, conversationsCollectionId, conversation.$id, {
        members: conversation.members.filter((uid) => uid !== me.userId),
        member_emails: conversation.member_emails.filter(
            (email) => email.toLowerCase() !== me.email.toLowerCase(),
        ),
    });
}

export async function updateConversationMembers(
    conversation: Conversation,
    members: { userId: string; email: string }[],
): Promise<Conversation> {
    const seen = new Set<string>();
    const uniqueMembers = members.filter((member) => {
        const key = member.email.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return appwriteDatabases.updateDocument<Conversation>(
        databaseId,
        conversationsCollectionId,
        conversation.$id,
        {
            members: uniqueMembers.map((member) => member.userId),
            member_emails: uniqueMembers.map((member) => member.email),
        },
    );
}

export async function updateTypingStatus(
    conversation: Conversation,
    user: { userId: string; email: string },
    isTyping: boolean,
): Promise<Conversation> {
    const typingUserIds = conversation.typing_user_ids ?? [];
    const typingUserEmails = conversation.typing_user_emails ?? [];
    const nextUserIds = isTyping
        ? Array.from(new Set([...typingUserIds, user.userId]))
        : typingUserIds.filter((uid) => uid !== user.userId);
    const nextUserEmails = isTyping
        ? Array.from(new Set([...typingUserEmails, user.email]))
        : typingUserEmails.filter((email) => email.toLowerCase() !== user.email.toLowerCase());

    return appwriteDatabases.updateDocument<Conversation>(
        databaseId,
        conversationsCollectionId,
        conversation.$id,
        {
            typing_user_ids: nextUserIds,
            typing_user_emails: nextUserEmails,
            typing_updated_at: new Date().toISOString(),
        },
    );
}

interface CreateConversationInput {
    me: { userId: string; email: string };
    others: { userId: string; email: string }[];
    title?: string;
}

export async function createConversation({
    me,
    others,
    title,
}: CreateConversationInput): Promise<Conversation> {
    const allUserIds = [me.userId, ...others.map((o) => o.userId)];
    const allEmails = [me.email, ...others.map((o) => o.email)];
    const type: Conversation["type"] = others.length === 1 ? "dm" : "group";
    const computedTitle =
        title ??
        (type === "dm" ? others[0].email : others.map((o) => o.email.split("@")[0]).join(", "));

    return appwriteDatabases.createDocument<Conversation>(
        databaseId,
        conversationsCollectionId,
        ID.unique(),
        {
            members: allUserIds,
            member_emails: allEmails,
            type,
            title: computedTitle,
            last_message_at: null,
            last_message_preview: "",
            last_sender_id: null,
        },
        // Dev-only browser bridge: the client can only grant roles it currently has.
        // Production should create docs server-side and assign exact member permissions.
        authenticatedUserPermissions,
    );
}

/* ───────── Messages ───────── */

export async function listMessages(
    conversationId: string,
    limit = 50,
): Promise<Message[]> {
    const res = await appwriteDatabases.listDocuments<Message>(
        databaseId,
        messagesCollectionId,
        [
            Query.equal("conversation_id", conversationId),
            Query.orderDesc("$createdAt"),
            Query.limit(limit),
        ],
    );
    // Return oldest → newest for natural rendering.
    return res.documents.slice().reverse();
}

interface SendMessageInput {
    conversation: Conversation;
    sender: { userId: string; email: string };
    body: string;
    attachmentFileIds?: string[];
    replyTo?: Pick<Message, "$id" | "sender_email" | "body" | "attachment_file_ids"> | null;
}

export async function sendMessage({
    conversation,
    sender,
    body,
    attachmentFileIds = [],
    replyTo,
}: SendMessageInput): Promise<Message> {
    const messagePermissions = [
        ...authenticatedUserPermissions,
        Permission.delete(Role.user(sender.userId)),
    ];

    const message = await appwriteDatabases.createDocument<Message>(
        databaseId,
        messagesCollectionId,
        ID.unique(),
        {
            conversation_id: conversation.$id,
            sender_id: sender.userId,
            sender_email: sender.email,
            body,
            attachment_file_ids: attachmentFileIds,
            read_by: [sender.userId],
            reply_to_message_id: replyTo?.$id ?? null,
            reply_to_sender_email: replyTo?.sender_email ?? null,
            reply_to_body:
                replyTo
                    ? (replyTo.body || ((replyTo.attachment_file_ids ?? []).length > 0 ? "Attachment" : "")).slice(0, 180)
                    : null,
        },
        messagePermissions,
    );

    // Best-effort: bump the conversation summary.
    appwriteDatabases
        .updateDocument(databaseId, conversationsCollectionId, conversation.$id, {
            last_message_at: message.$createdAt,
            last_message_preview: body.slice(0, 140),
            last_sender_id: sender.userId,
        })
        .catch(() => {});

    return message;
}

export async function markMessageRead(message: Message, myUserId: string): Promise<void> {
    if (message.read_by?.includes(myUserId)) return;
    await appwriteDatabases.updateDocument(
        databaseId,
        messagesCollectionId,
        message.$id,
        { read_by: [...(message.read_by ?? []), myUserId] },
    );
}

export async function deleteMessageForMe(message: Message, myUserId: string): Promise<Message> {
    const deletedForUserIds = Array.from(
        new Set([...(message.deleted_for_user_ids ?? []), myUserId]),
    );

    return appwriteDatabases.updateDocument<Message>(
        databaseId,
        messagesCollectionId,
        message.$id,
        { deleted_for_user_ids: deletedForUserIds },
    );
}

export async function deleteMessageForEveryone(
    message: Message,
    myUserId: string,
): Promise<Message> {
    return appwriteDatabases.updateDocument<Message>(
        databaseId,
        messagesCollectionId,
        message.$id,
        {
            body: "",
            attachment_file_ids: [],
            deleted_for_everyone: true,
            deleted_by: myUserId,
            deleted_at: new Date().toISOString(),
        },
    );
}

export async function toggleMessageReaction(
    message: Message,
    myUserId: string,
    emoji: string,
): Promise<Message> {
    const reactionKey = `${emoji}:${myUserId}`;
    const existing = message.reactions ?? [];
    const reactions = existing.includes(reactionKey)
        ? existing.filter((reaction) => reaction !== reactionKey)
        : [
              ...existing.filter((reaction) => !reaction.endsWith(`:${myUserId}`)),
              reactionKey,
          ];

    return appwriteDatabases.updateDocument<Message>(
        databaseId,
        messagesCollectionId,
        message.$id,
        { reactions },
    );
}

/* ───────── Attachments ───────── */

export async function uploadAttachment(file: File, _allowedUserIds: string[]): Promise<string> {
    void _allowedUserIds;
    const uploaded = await appwriteStorage.createFile(
        attachmentsBucketId,
        ID.unique(),
        file,
        [Permission.read(Role.users())],
    );
    return uploaded.$id;
}

export function getAttachmentDownloadUrl(fileId: string): string {
    return appwriteStorage.getFileDownload(attachmentsBucketId, fileId).toString();
}

export function getAttachmentPreviewUrl(fileId: string): string {
    return appwriteStorage.getFilePreview(attachmentsBucketId, fileId).toString();
}

export function getAttachmentViewUrl(fileId: string): string {
    return appwriteStorage.getFileView(attachmentsBucketId, fileId).toString();
}

/* ───────── Realtime channels ───────── */

export const channels = {
    conversations: () =>
        `databases.${databaseId}.collections.${conversationsCollectionId}.documents`,
    messages: () =>
        `databases.${databaseId}.collections.${messagesCollectionId}.documents`,
};
