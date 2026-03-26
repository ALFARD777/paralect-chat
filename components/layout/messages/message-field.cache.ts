import type { QueryClient } from "@tanstack/react-query"

import { IChatAttachment, IMessageRecord } from "@/lib/chat"

export function initChatMessagesCache(queryClient: QueryClient, chatId: string) {
  queryClient.setQueryData<IMessageRecord[]>(["messages", chatId], [])
}

export function addOptimisticUserMessage({
  attachments,
  chatId,
  content,
  queryClient,
  userId,
}: {
  attachments: IChatAttachment[]
  chatId: string
  content: string
  queryClient: QueryClient
  userId: string
}) {
  const optimisticMessageId = crypto.randomUUID()
  const optimisticUserMessage: IMessageRecord = {
    id: optimisticMessageId,
    chat_id: chatId,
    user_id: userId,
    role: "user",
    content,
    attachments,
    created_at: new Date().toISOString(),
  }

  queryClient.setQueryData<IMessageRecord[]>(["messages", chatId], (current) => {
    const items = current ?? []

    if (items.some((message) => message.id === optimisticMessageId)) {
      return items
    }

    return [...items, optimisticUserMessage]
  })

  return optimisticMessageId
}

export function replaceOptimisticUserMessage({
  attachments,
  chatId,
  optimisticMessageId,
  persistedMessage,
  queryClient,
}: {
  attachments: IChatAttachment[]
  chatId: string
  optimisticMessageId: string
  persistedMessage: IMessageRecord
  queryClient: QueryClient
}) {
  queryClient.setQueryData<IMessageRecord[]>(["messages", chatId], (current) => {
    const items = (current ?? []).filter(
      (message) => message.id !== optimisticMessageId
    )
    const nextMessage = {
      ...persistedMessage,
      attachments,
    }

    if (items.some((message) => message.id === nextMessage.id)) {
      return items.map((message) =>
        message.id === nextMessage.id ? nextMessage : message
      )
    }

    return [...items, nextMessage]
  })
}

export function appendAssistantMessage({
  assistantMessage,
  chatId,
  queryClient,
}: {
  assistantMessage: IMessageRecord | undefined
  chatId: string
  queryClient: QueryClient
}) {
  queryClient.setQueryData<IMessageRecord[]>(["messages", chatId], (current) => {
    const items = current ?? []

    if (!assistantMessage) {
      return items
    }

    if (items.some((message) => message.id === assistantMessage.id)) {
      return items
    }

    return [...items, assistantMessage]
  })
}

export function appendAssistantErrorMessage({
  chatId,
  error,
  queryClient,
  userId,
}: {
  chatId: string | null
  error: unknown
  queryClient: QueryClient
  userId: string
}) {
  queryClient.setQueryData<IMessageRecord[]>(
    ["messages", chatId],
    (current) => [
      ...(current ?? []),
      {
        id: crypto.randomUUID(),
        chat_id: chatId ?? "",
        user_id: userId,
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Something went wrong while generating the response",
        kind: "error",
        created_at: new Date().toISOString(),
      },
    ]
  )
}
