import type { Dispatch, SetStateAction } from "react"

import { IChatAttachment, IChatMessage } from "@/lib/chat"
import {
  buildGuestRequestMessages,
  readStreamedResponse,
} from "./message-field.utils"
import { GUEST_STREAMING_KEY, IPendingAttachment } from "./message-field.types"

export async function submitGuestMessage({
  guestMessages,
  pendingAttachments,
  setGuestMessages,
  trimmed,
  buildPendingAttachments,
  createErrorMessage,
  clearPendingAttachments,
  finishStreamingForChat,
  startStreamingForChat,
  updateStreamingMessageForChat,
  setValue,
}: {
  guestMessages: IChatMessage[]
  pendingAttachments: IPendingAttachment[]
  setGuestMessages: Dispatch<SetStateAction<IChatMessage[]>>
  trimmed: string
  buildPendingAttachments: (attachments: IPendingAttachment[]) => IChatAttachment[]
  createErrorMessage: (error: unknown) => IChatMessage
  clearPendingAttachments: () => void
  finishStreamingForChat: (chatId: string) => void
  startStreamingForChat: (chatId: string) => void
  updateStreamingMessageForChat: (chatId: string, content: string) => void
  setValue: (value: string) => void
}) {
  startStreamingForChat(GUEST_STREAMING_KEY)

  const userMessage: IChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: trimmed,
    attachments: buildPendingAttachments(pendingAttachments),
  }

  const nextGuestMessages = [...guestMessages, userMessage]
  const guestRequestMessages = buildGuestRequestMessages(
    nextGuestMessages,
    pendingAttachments
  )

  setGuestMessages(nextGuestMessages)
  setValue("")
  clearPendingAttachments()

  try {
    const response = await fetch("/api/messages/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: guestRequestMessages,
      }),
    })

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => null)

      if (response.status === 403) {
        setGuestMessages((current) => current.slice(0, -1))
      }

      throw new Error(errorData?.error ?? "Request failed")
    }

    const assistantContent = await readStreamedResponse(response, (content) =>
      updateStreamingMessageForChat(GUEST_STREAMING_KEY, content)
    )

    setGuestMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
      },
    ])

    finishStreamingForChat(GUEST_STREAMING_KEY)
  } catch (error) {
    finishStreamingForChat(GUEST_STREAMING_KEY)
    setGuestMessages((current) => [...current, createErrorMessage(error)])
    throw error
  }
}
