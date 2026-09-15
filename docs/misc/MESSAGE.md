# ProRnD Messaging Implementation

## Overview

The messaging module adds an Appwrite-backed chat experience inside the ProRnD UI at `/messages`. It supports direct conversations, named group conversations, group member management, message sending, attachments, reactions, read status, delete actions, forwarding, message replies, unread counts, notification sounds, typing status, a collapsible conversation sidebar, and a pinned ProRND Admin support chat.

The implementation bridges the existing Frappe-authenticated user session into Appwrite by deriving a stable Appwrite user ID from the logged-in user's email. Frappe remains the source for user search and profile display, while Appwrite stores conversations, messages, and attachments.

## Main Files

- `src/pages/messages/MessagesPage.tsx`
  - Main messaging screen.
  - Owns active conversation state from the `?c=` URL parameter.
  - Wires conversation list, thread, composer, new conversation dialog, group members dialog, and forward dialog.
  - Handles notification permission, ping sound, online/offline display, chat deletion, admin chat opening, and typing updates.
  - Opens the group members modal when a group title is clicked.
  - Owns the selected reply target and passes it to the composer.

- `src/pages/messages/components/ConversationList.tsx`
  - Sidebar conversation list.
  - Supports collapse/expand.
  - Shows unread badges, last message preview, user metadata, and active row state.
  - De-duplicates direct message conversations by user and keeps the older chat.
  - Hides self-chat conversations.
  - Pins the ProRND Admin conversation at the top.

- `src/pages/messages/components/MessageThread.tsx`
  - Renders the active message timeline.
  - Supports attachment previews, reactions, delete for me, delete for everyone, forwarding, replying, seen/sent status, and typing indicators.
  - Displays a compact quoted preview above messages that reply to another message.
  - Marks unread incoming messages as read when the thread is open.

- `src/pages/messages/components/MessageComposer.tsx`
  - Sends text and attachment messages.
  - Uploads files to Appwrite Storage before sending.
  - Shows the active reply target with a cancel action before sending.
  - Emits typing state while the user is composing.

- `src/pages/messages/components/NewConversationDialog.tsx`
  - Searches Frappe users only after at least 2 characters are typed.
  - Excludes self, `Administrator`, and `Guest`.
  - Reuses an older existing direct chat when starting a conversation with the same user.
  - Shows a required group name field only when more than one user is selected.
  - Passes the group name as the Appwrite conversation `title`.
  - Prevents creating self-chat.

- `src/pages/messages/components/GroupMembersDialog.tsx`
  - Opens from the active group title in the chat header.
  - Shows all current group members with profile names when available.
  - Treats the first stored member as the group creator.
  - Allows the creator or ProRND admin to add/remove members.
  - Prevents removing the creator and prevents reducing a group below 2 members.
  - Searches Frappe users only after at least 2 characters are typed.

- `src/pages/messages/components/ForwardMessageDialog.tsx`
  - Forwards a message to existing conversations or searched users.
  - Reuses an existing DM if available.
  - Creates a new DM only when needed.
  - Prevents forwarding to self.

- `src/services/messagingService.ts`
  - Appwrite database/storage service layer.
  - Provides conversation listing/creation, group member updates, message listing/sending, read status updates, reactions, delete operations, typing updates, attachment upload, and preview/view URLs.

- `src/hooks/useAppwriteSession.ts`
  - Connects the current browser session to Appwrite Account.
  - Creates or logs into a matching Appwrite user using the Frappe email.

- `src/hooks/useConversations.ts`
  - Loads the current user's Appwrite conversations.
  - Refreshes periodically so new messages/conversations appear.

- `src/hooks/useMessages.ts`
  - Loads messages for the active conversation.
  - Filters out messages deleted for the current user.

- `src/hooks/useConversationUnreadCounts.ts`
  - Computes unread counts by checking message `read_by` values.

- `src/hooks/useMessageUserProfiles.ts`
  - Fetches Frappe user profile details by email for display labels.

- `src/lib/appwrite.ts`
  - Appwrite client configuration.
  - Exposes account, databases, storage, realtime, ID, permissions, roles, and queries.

## Appwrite Data Model

Database:

```text
prornd_messaging
```

Tables:

### conversations

Required columns:

```text
members[]                 String(36)
member_emails[]           String(320)
type                      String(10)
title                     String(500)
last_message_at           String(50), optional
last_message_preview      String(200), optional
last_sender_id            String(36), optional
typing_user_ids[]         String(36), optional
typing_user_emails[]      String(320), optional
typing_updated_at         String(50), optional
```

Document security should be enabled.

### messages

Required columns:

```text
conversation_id           String(36)
sender_id                 String(36)
sender_email              String(320)
body                      String(10000), optional
attachment_file_ids[]     String(36), optional
read_by[]                 String(36), optional
reply_to_message_id       String(36), optional
reply_to_sender_email     String(320), optional
reply_to_body             String(500), optional
reactions[]               String(100), optional
deleted_for_user_ids[]    String(36), optional
deleted_for_everyone      Boolean, optional
deleted_by                String(36), optional
deleted_at                String(50), optional
```

Index:

```text
by_conversation           key index on conversation_id
```

Document security should be enabled.

Storage bucket:

```text
message_attachments
```

File security should be enabled.

## Conversation Behavior

Direct messages are identified by the other user's email. When creating or forwarding to a user:

1. The UI checks existing direct conversations.
2. If a DM already exists, it opens or reuses the older conversation.
3. If none exists, a new Appwrite conversation is created.

This prevents multiple visible chats with the same user. Existing duplicates are collapsed in the UI by keeping the oldest DM.

Self-chats are blocked:

- Self user is not shown in user search.
- Self-chat creation is rejected.
- Existing self-chat conversations are hidden in the sidebar.

## Group Conversation Behavior

Groups are created when more than one other user is selected in the new conversation dialog.

Group creation requires:

```text
Group name
At least 2 selected users including the creator
```

The group name is stored in the conversation `title` field.

Clicking the group title in the active chat header opens the group members modal. All members can view the list. Only managers can edit members.

Current manager rule:

```text
The first stored member is treated as the group creator.
The configured ProRND admin email is also treated as an admin.
```

Manager actions:

- Add users from Frappe search.
- Remove users from the group.
- Cannot remove the creator.
- Cannot reduce the group below 2 members.

This uses the existing `members[]` and `member_emails[]` conversation fields. No separate creator/admin Appwrite columns are currently required.

## Pinned Admin Chat

The sidebar always shows a pinned admin row at the top:

```text
ProRND Admin
prorndadmin@prornd.local
Official Support Technical Team
```

Clicking the row:

1. Opens the existing older admin DM if it exists.
2. Otherwise creates the admin DM once and opens it.

The admin row is not duplicated in the normal conversation list.

## User Search

User search uses Frappe `User` data and starts only after at least 2 characters are typed. It searches:

```text
full_name
email
name
username
first_name
last_name
```

It excludes:

```text
current logged-in user
Administrator
Guest
```

The implementation avoids fetching all users on dialog open.

## Message Features

Messages support:

- Text body
- Multiple file attachments
- Attachment previews using Appwrite Storage preview/view URLs
- Emoji reactions stored as `emoji:userId`
- Read receipts using `read_by[]`
- Delete for me using `deleted_for_user_ids[]`
- Delete for everyone using `deleted_for_everyone`, `deleted_by`, and `deleted_at`
- Forwarding to users or conversations
- Replying to a specific message using `reply_to_message_id`, `reply_to_sender_email`, and `reply_to_body`
- Typing indicators using conversation typing fields
- New-message ping sound and browser notifications

## Reply Behavior

Each message action menu includes `Reply`.

When the user clicks `Reply`:

1. `MessagesPage` stores the selected reply target.
2. `MessageComposer` shows a quoted preview above the input.
3. Sending the message stores reply metadata on the new message.
4. `MessageThread` renders the quoted preview above the replied message.

Reply metadata is intentionally denormalized into the message document so the quoted preview still renders even if the original message is later deleted or not loaded in the current message page.

## Notes

- Appwrite permissions are currently broad authenticated-user permissions for the browser bridge. A production hardening pass should move conversation/message creation to a server-side trusted function so exact member permissions can be assigned.
- Frappe remains the source for user identity/profile search.
- Appwrite stores chat state and attachments.
- The current group creator/admin logic is inferred in the client. A production version should add explicit `created_by`, `admin_user_ids[]`, or `admin_emails[]` fields and enforce membership changes server-side.
