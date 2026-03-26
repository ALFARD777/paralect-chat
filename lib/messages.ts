import {
  CHAT_ATTACHMENTS_BUCKET,
  IMessageAttachmentRecord,
} from "@/lib/attachments"
import {
  ChatCompletionMessage,
  IChatAttachment,
  IMessageRecord,
} from "@/lib/chat"
import { supabaseServer } from "@/lib/supabase-server"

const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60

async function getSignedAttachmentUrl(storagePath: string) {
  const { data, error } = await supabaseServer.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, ATTACHMENT_SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

function normalizeAttachment(
  record: IMessageAttachmentRecord,
  url: string
): IChatAttachment {
  return {
    id: record.id,
    name: record.name,
    mimeType: record.mime_type,
    url,
    type: record.type,
  }
}

export async function getChatMessagesWithAttachments(
  chatId: string,
  userId: string
): Promise<IMessageRecord[]> {
  const [
    { data: messages, error: messagesError },
    { data: attachments, error: attachmentsError },
  ] = await Promise.all([
    supabaseServer
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("message_attachments")
      .select("*")
      .eq("chat_id", chatId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ])

  if (messagesError) {
    throw new Error(messagesError.message || "Failed to load messages")
  }

  if (attachmentsError) {
    throw new Error(attachmentsError.message || "Failed to load attachments")
  }

  const serializedAttachments = await Promise.all(
    ((attachments ?? []) as IMessageAttachmentRecord[]).map(async (record) => {
      const url = await getSignedAttachmentUrl(record.storage_path)

      if (!url) {
        return null
      }

      return {
        messageId: record.message_id,
        attachment: normalizeAttachment(record, url),
      }
    })
  )

  const attachmentsByMessageId = serializedAttachments.reduce<
    Map<string, IChatAttachment[]>
  >((map, item) => {
    if (!item) {
      return map
    }

    const current = map.get(item.messageId) ?? []
    current.push(item.attachment)
    map.set(item.messageId, current)

    return map
  }, new Map())

  return ((messages ?? []) as IMessageRecord[]).map((message) => ({
    ...message,
    attachments: attachmentsByMessageId.get(message.id) ?? [],
  }))
}

export function buildCompletionMessages(
  messages: IMessageRecord[]
): ChatCompletionMessage[] {
  return messages.map((message) => {
    const imageAttachments =
      message.role === "user"
        ? (message.attachments ?? []).filter(
            (attachment) => attachment.type === "image" && attachment.url
          )
        : []

    if (imageAttachments.length === 0) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    return {
      role: message.role,
      content: [
        {
          type: "text",
          text: message.content,
        },
        ...imageAttachments.map((attachment) => ({
          type: "image_url" as const,
          image_url: {
            url: attachment.url,
          },
        })),
      ],
    }
  })
}
