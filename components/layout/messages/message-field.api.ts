import { IChat, IChatAttachment, IMessageRecord } from "@/lib/chat"
import { createAuthorizedHeaders } from "@/lib/client-api"
import { IPendingAttachment } from "./message-field.types"

async function parseJsonResponse(response: Response) {
  return response.json().catch(() => null)
}

export async function createChat(accessToken: string | null) {
  const response = await fetch("/api/chats", {
    method: "POST",
    headers: createAuthorizedHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      title: "New chat",
    }),
  })

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to create chat")
  }

  const chat = data?.chat as IChat | undefined

  if (!chat?.id) {
    throw new Error("Failed to create chat")
  }

  return chat
}

export async function countChatMessages(
  accessToken: string | null,
  chatId: string
) {
  const response = await fetch(
    `/api/messages?chatId=${chatId}&countOnly=true`,
    {
      headers: createAuthorizedHeaders(accessToken),
    }
  )
  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to count messages")
  }

  return data?.count ?? 0
}

export async function createChatMessage({
  accessToken,
  chatId,
  content,
  role,
}: {
  accessToken: string | null
  chatId: string
  content: string
  role: "user" | "assistant"
}) {
  const response = await fetch("/api/messages", {
    method: "POST",
    headers: createAuthorizedHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      chatId,
      role,
      content,
    }),
  })

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data?.error ?? `Failed to create ${role} message`)
  }

  const message = data?.message as IMessageRecord | undefined

  if (!message?.id) {
    throw new Error(`Failed to create ${role} message`)
  }

  return message
}

export async function uploadMessageAttachment({
  accessToken,
  attachment,
  messageId,
}: {
  accessToken: string | null
  attachment: IPendingAttachment
  messageId: string
}) {
  if (!accessToken) {
    throw new Error("Unauthorized")
  }

  const formData = new FormData()
  formData.set("file", attachment.file)

  const response = await fetch(`/api/messages/${messageId}/attachments`, {
    method: "POST",
    headers: createAuthorizedHeaders(accessToken),
    body: formData,
  })

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to upload attachment")
  }

  return data?.attachment as IChatAttachment
}

export async function generateChatTitle(message: string) {
  const response = await fetch("/api/chats/title", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  })

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to generate chat title")
  }

  return data?.title as string | undefined
}

export async function updateChatTitle({
  accessToken,
  chatId,
  title,
}: {
  accessToken: string | null
  chatId: string
  title: string
}) {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: "PATCH",
    headers: createAuthorizedHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ title }),
  })

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data?.error ?? "Failed to update chat title")
  }
}

export async function requestAssistantResponseStream({
  accessToken,
  chatId,
}: {
  accessToken: string | null
  chatId: string
}) {
  const response = await fetch("/api/messages/respond", {
    method: "POST",
    headers: createAuthorizedHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({ chatId }),
  })

  if (!response.ok || !response.body) {
    const data = await parseJsonResponse(response)
    throw new Error(data?.error ?? "Request failed")
  }

  return response
}
