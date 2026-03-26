"use client"

import { DragEvent, useCallback, useEffect, useState } from "react"

import { useAuth } from "@/components/auth-provider"
import MessageField from "@/components/layout/messages/message-field"
import Container from "@/components/ui/container"
import { IChatMessage, IMessageRecord } from "@/lib/chat"
import { createAuthorizedHeaders } from "@/lib/client-api"
import { supabaseRealtime } from "@/lib/supabase"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import MessageList from "./messages/message-list"

const GUEST_MESSAGES_STORAGE_KEY = "guest-chat-messages"
const ATTACHMENT_URL_REFRESH_INTERVAL_MS = 45 * 60 * 1000

interface ChatProps {
  activeChatId: string | "draft" | null
  onSelectChat: (chatId: string | "draft") => void
  activeStreamingMessage: string
  startStreamingForChat: (chatId: string) => void
  updateStreamingMessageForChat: (chatId: string, content: string) => void
  finishStreamingForChat: (chatId: string) => void
}

function normalizeMessageForComparison(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

export default function Chat({
  activeChatId,
  onSelectChat,
  activeStreamingMessage,
  startStreamingForChat,
  updateStreamingMessageForChat,
  finishStreamingForChat,
}: ChatProps) {
  const { accessToken, isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [externalFileHandler, setExternalFileHandler] = useState<
    ((files: FileList | File[]) => void) | null
  >(null)
  const [guestMessages, setGuestMessages] = useState<IChatMessage[]>(() => {
    if (typeof window === "undefined") {
      return []
    }

    const storedMessages = window.localStorage.getItem(
      GUEST_MESSAGES_STORAGE_KEY
    )

    if (!storedMessages) {
      return []
    }

    try {
      const parsedMessages = JSON.parse(storedMessages) as IChatMessage[]
      return Array.isArray(parsedMessages) ? parsedMessages : []
    } catch {
      window.localStorage.removeItem(GUEST_MESSAGES_STORAGE_KEY)
      return []
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (isSignedIn) {
      window.localStorage.removeItem(GUEST_MESSAGES_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      GUEST_MESSAGES_STORAGE_KEY,
      JSON.stringify(guestMessages)
    )
  }, [guestMessages, isSignedIn])

  const messagesQuery = useQuery({
    queryKey: ["messages", activeChatId],
    queryFn: async (): Promise<IMessageRecord[]> => {
      const response = await fetch(`/api/messages?chatId=${activeChatId}`, {
        headers: createAuthorizedHeaders(accessToken),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to load messages")
      }

      return data.messages ?? []
    },
    enabled: Boolean(activeChatId && activeChatId !== "draft" && accessToken),
    refetchInterval: (query) => {
      const messages = (query.state.data ?? []) as IMessageRecord[]
      const hasImageAttachments = messages.some((message) =>
        (message.attachments ?? []).some(
          (attachment) => attachment.type === "image"
        )
      )

      return hasImageAttachments ? ATTACHMENT_URL_REFRESH_INTERVAL_MS : false
    },
  })

  useEffect(() => {
    if (!activeChatId || activeChatId === "draft" || !accessToken) {
      return
    }

    let isActive = true
    let channel: ReturnType<typeof supabaseRealtime.channel> | null = null

    void supabaseRealtime.realtime.setAuth(accessToken).then(() => {
      if (!isActive) {
        return
      }

      channel = supabaseRealtime
        .channel(`messages:${activeChatId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `chat_id=eq.${activeChatId}`,
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: ["messages", activeChatId],
            })
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "message_attachments",
            filter: `chat_id=eq.${activeChatId}`,
          },
          () => {
            void queryClient.invalidateQueries({
              queryKey: ["messages", activeChatId],
            })
          }
        )
        .subscribe()
    })

    return () => {
      isActive = false

      if (channel) {
        void supabaseRealtime.removeChannel(channel)
      }
    }
  }, [accessToken, activeChatId, queryClient])

  const messages: IChatMessage[] = (messagesQuery.data ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    attachments: m.attachments,
  }))

  const baseMessages = isSignedIn ? messages : guestMessages
  const lastBaseMessage = baseMessages.at(-1)
  const normalizedStreamingMessage = normalizeMessageForComparison(
    activeStreamingMessage
  )
  const normalizedLastAssistantMessage =
    lastBaseMessage?.role === "assistant"
      ? normalizeMessageForComparison(lastBaseMessage.content)
      : ""
  const shouldShowStreamingMessage =
    Boolean(normalizedStreamingMessage) &&
    !(
      lastBaseMessage?.role === "assistant" &&
      normalizedLastAssistantMessage === normalizedStreamingMessage
    )

  const displayMessages = shouldShowStreamingMessage
    ? [
        ...baseMessages,
        {
          id: "streaming-assistant-message",
          role: "assistant" as const,
          content: activeStreamingMessage,
        },
      ]
    : baseMessages

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files") || !externalFileHandler) {
      return
    }

    event.preventDefault()
    setIsDraggingFiles(true)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes("Files") || !externalFileHandler) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    setIsDraggingFiles(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }

    setIsDraggingFiles(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.files.length || !externalFileHandler) {
      return
    }

    event.preventDefault()
    setIsDraggingFiles(false)
    externalFileHandler?.(event.dataTransfer.files)
  }

  const registerExternalFileHandler = useCallback(
    (handler: ((files: FileList | File[]) => void) | null) => {
      setExternalFileHandler(() => handler)
    },
    []
  )

  return (
    <Container
      size={isSignedIn ? "large" : undefined}
      className="relative flex h-full min-h-0 flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDraggingFiles && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[28px] border-2 border-dashed border-primary/60 bg-background/90 px-6 text-center text-base font-medium text-foreground">
          Drop files anywhere in chat to attach
        </div>
      )}

      <MessageList
        messages={displayMessages}
        isLoading={Boolean(
          activeChatId && activeChatId !== "draft" && messagesQuery.isLoading
        )}
      />
      <MessageField
        activeChatId={activeChatId}
        onSelectChat={onSelectChat}
        guestMessages={guestMessages}
        setGuestMessages={setGuestMessages}
        registerExternalFileHandler={registerExternalFileHandler}
        startStreamingForChat={startStreamingForChat}
        updateStreamingMessageForChat={updateStreamingMessageForChat}
        finishStreamingForChat={finishStreamingForChat}
      />
    </Container>
  )
}
