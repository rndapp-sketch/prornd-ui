import { Client, Account, Databases, Storage, ID, Permission, Role, Query } from "appwrite";

const rawEndpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;

if (!rawEndpoint || !projectId) {
}

// The Appwrite SDK rejects relative URLs. Resolve "/appwrite/v1" against the
// current origin so it still flows through the Vite dev proxy.
function resolveEndpoint(value: string | undefined): string {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (typeof window !== "undefined") {
        return `${window.location.origin}${value.startsWith("/") ? "" : "/"}${value}`;
    }
    return value;
}

const endpoint = resolveEndpoint(rawEndpoint);

export const appwriteConfig = {
    endpoint,
    projectId: projectId ?? "",
    databaseId: (import.meta.env.VITE_APPWRITE_DATABASE_ID as string) ?? "prornd_messaging",
    conversationsCollectionId:
        (import.meta.env.VITE_APPWRITE_CONVERSATIONS_COLLECTION_ID as string) ?? "conversations",
    messagesCollectionId:
        (import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID as string) ?? "messages",
    attachmentsBucketId:
        (import.meta.env.VITE_APPWRITE_ATTACHMENTS_BUCKET_ID as string) ?? "message_attachments",
};

export const appwriteClient = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

// The installed Web SDK sends 1.9.2 by default, while this server is 1.9.0.
// Pin the response format to the server patch version to avoid noisy mismatch warnings.
appwriteClient.headers["X-Appwrite-Response-Format"] = "1.9.0";

export const appwriteAccount = new Account(appwriteClient);
export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);

export { ID, Permission, Role, Query };
