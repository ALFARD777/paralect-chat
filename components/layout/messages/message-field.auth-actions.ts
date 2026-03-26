import type { QueryClient } from "@tanstack/react-query"
import type { User } from "@supabase/supabase-js"

import { IChatAttachment } from "@/lib/chat"
import {
  addOptimisticUserMessage,
  appendAssistantErrorMessage,
  appendAssistantMessage,
  initChatMessagesCache,
  replaceOptimisticUserMessage,
} from "./message-field.cache"
import {
  countChatMessages,
  createChat,
  createChatMessage,
  generateChatTitle,
  requestAssistantResponseStream,
  updateChatTitle,
  uploadMessageAttachment,
} from "./message-field.api"
import { IPendingAttachment } from "./message-field.types"
import { readStreamedResponse } from "./message-field.utils"

async function createChatIfNeeded({
  accessToken,
  activeChatId,
  onSelectChat,
  queryClient,
  user,
}: {
  accessToken: string | null
  activeChatId: string | "draft" | null
  onSelectChat: (chatId: string | "draft") => void
  queryClient: QueryClient
  user: User
}) {
  let chatId = activeChatId === "draft" ? null : activeChatId

  if (chatId) {
    return chatId
  }

  chatId = (await createChat(accessToken)).id

  initChatMessagesCache(queryClient, chatId)
  onSelectChat(chatId)

  await queryClient.invalidateQueries({
    queryKey: ["chats", user.id],
  })

  return chatId
}

async function updateFirstChatTitle({
  accessToken,
  chatId,
  isFirstMessageInChat,
  queryClient,
  trimmed,
  user,
}: {
  accessToken: string | null
  chatId: string
  isFirstMessageInChat: boolean
  queryClient: QueryClient
  trimmed: string
  user: User
}) {
  if (!isFirstMessageInChat) {
    return
  }

  try {
    const title = await generateChatTitle(trimmed)

    if (title) {
      await updateChatTitle({
        accessToken,
        chatId,
        title,
      })

      await queryClient.invalidateQueries({
        queryKey: ["chats", user.id],
      })
    }
  } catch (error) {
    console.error("Failed to generate chat title", error)
  }
}

export async function submitAuthenticatedMessage({
  accessToken,
  activeChatId,
  buildPendingAttachments,
  clearPendingAttachments,
  finishStreamingForChat,
  onSelectChat,
  pendingAttachments,
  queryClient,
  setValue,
  startStreamingForChat,
  trimmed,
  updateStreamingMessageForChat,
  user,
}: {
  accessToken: string | null
  activeChatId: string | "draft" | null
  buildPendingAttachments: (
    attachments: IPendingAttachment[]
  ) => IChatAttachment[]
  clearPendingAttachments: () => void
  finishStreamingForChat: (chatId: string) => void
  onSelectChat: (chatId: string | "draft") => void
  pendingAttachments: IPendingAttachment[]
  queryClient: QueryClient
  setValue: (value: string) => void
  startStreamingForChat: (chatId: string) => void
  trimmed: string
  updateStreamingMessageForChat: (chatId: string, content: string) => void
  user: User
}) {
  let chatId: string | null = null

  try {
    chatId = await createChatIfNeeded({
      accessToken,
      activeChatId,
      onSelectChat,
      queryClient,
      user,
    })
    const ensuredChatId = chatId

    startStreamingForChat(ensuredChatId)

    const existingMessagesCount = await countChatMessages(
      accessToken,
      ensuredChatId
    )
    const isFirstMessageInChat = existingMessagesCount === 0
    const attachments = buildPendingAttachments(pendingAttachments)
    const optimisticMessageId = addOptimisticUserMessage({
      attachments,
      chatId: ensuredChatId,
      content: trimmed,
      queryClient,
      userId: user.id,
    })

    const persistedUserMessage = await createChatMessage({
      accessToken,
      chatId: ensuredChatId,
      content: trimmed,
      role: "user",
    })

    const uploadedAttachments: IChatAttachment[] = []

    for (const attachment of pendingAttachments) {
      uploadedAttachments.push(
        await uploadMessageAttachment({
          accessToken,
          attachment,
          messageId: persistedUserMessage.id,
        })
      )
    }

    replaceOptimisticUserMessage({
      attachments: uploadedAttachments,
      chatId: ensuredChatId,
      optimisticMessageId,
      persistedMessage: persistedUserMessage,
      queryClient,
    })

    await queryClient.invalidateQueries({
      queryKey: ["messages", ensuredChatId],
    })

    setValue("")
    clearPendingAttachments()

    await updateFirstChatTitle({
      accessToken,
      chatId: ensuredChatId,
      isFirstMessageInChat,
      queryClient,
      trimmed,
      user,
    })

    const response = await requestAssistantResponseStream({
      accessToken,
      chatId: ensuredChatId,
    })

    const assistantContent = await readStreamedResponse(response, (content) =>
      updateStreamingMessageForChat(ensuredChatId, content)
    )

    appendAssistantMessage({
      assistantMessage: await createChatMessage({
        accessToken,
        chatId: ensuredChatId,
        content: assistantContent,
        role: "assistant",
      }),
      chatId: ensuredChatId,
      queryClient,
    })

    await queryClient.invalidateQueries({
      queryKey: ["messages", ensuredChatId],
    })

    finishStreamingForChat(ensuredChatId)
  } catch (error) {
    if (chatId) {
      finishStreamingForChat(chatId)
      appendAssistantErrorMessage({
        chatId,
        error,
        queryClient,
        userId: user.id,
      })
    }

    throw error
  }
}
