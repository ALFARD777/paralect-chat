"use client"

import Auth from "@/components/auth"
import { useAuth } from "@/components/auth-provider"
import History from "@/components/layout/history"
import { cn } from "@/lib/utils"
import Chat from "../components/layout/chat"
import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { IconLayoutSidebarLeftCollapse } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

const GUEST_STREAM_KEY = "__guest__"

interface IStreamingState {
  content: string
  isStreaming: boolean
}

export default function Page() {
  const { isLoading, isSignedIn } = useAuth()
  const [activeChatId, setActiveChatId] = useState<string | "draft" | null>(
    null
  )
  const [streamingByChat, setStreamingByChat] = useState<
    Record<string, IStreamingState>
  >({})

  const [mobileHistoryOpen, setMobileHistoryOpen] = useState<boolean>(false)

  const showHistory = !isLoading && isSignedIn

  const visibleActiveChatId = isSignedIn ? activeChatId : null
  const activeStreamingKey =
    visibleActiveChatId && visibleActiveChatId !== "draft"
      ? visibleActiveChatId
      : GUEST_STREAM_KEY
  const activeStreamingState = streamingByChat[activeStreamingKey] ?? null
  const streamingChatIds = Object.entries(streamingByChat)
    .filter(
      ([chatId, state]) => chatId !== GUEST_STREAM_KEY && state.isStreaming
    )
    .map(([chatId]) => chatId)

  const startStreamingForChat = useCallback((chatId: string) => {
    setStreamingByChat((current) => ({
      ...current,
      [chatId]: {
        content: current[chatId]?.content ?? "",
        isStreaming: true,
      },
    }))
  }, [])

  const updateStreamingMessageForChat = useCallback(
    (chatId: string, content: string) => {
      setStreamingByChat((current) => ({
        ...current,
        [chatId]: {
          content,
          isStreaming: true,
        },
      }))
    },
    []
  )

  const finishStreamingForChat = useCallback((chatId: string) => {
    setStreamingByChat((current) => {
      if (!current[chatId]) {
        return current
      }

      const next = { ...current }
      delete next[chatId]
      return next
    })
  }, [])

  return (
    <div className="relative flex h-svh gap-4 p-layout">
      <div className="absolute top-2 left-2 z-20 md:hidden">
        {showHistory && (
          <Button
            size="icon-lg"
            className="size-12 rounded-2xl"
            onClick={() => setMobileHistoryOpen(true)}
          >
            <IconLayoutSidebarLeftCollapse className="size-6" />
          </Button>
        )}
      </div>
      <div
        className={cn(
          "hidden overflow-hidden transition-[width,opacity,transform] duration-300 ease-out md:block",
          showHistory
            ? "w-70 translate-x-0 opacity-100"
            : "pointer-events-none w-0 -translate-x-4 opacity-0"
        )}
        aria-hidden={!showHistory}
      >
        <div className="h-full w-70">
          <History
            activeChatId={visibleActiveChatId}
            onSelectChat={setActiveChatId}
            streamingChatIds={streamingChatIds}
          />
        </div>
      </div>

      <Dialog open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 h-svh w-[min(88vw,22rem)] max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-transparent p-2 shadow-none ring-0 duration-300 data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left-4 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-left-4"
        >
          <DialogTitle className="sr-only">Chat history</DialogTitle>

          <History
            activeChatId={visibleActiveChatId}
            onSelectChat={(chatId) => {
              setActiveChatId(chatId)
              setMobileHistoryOpen(false)
            }}
            streamingChatIds={streamingChatIds}
          />
        </DialogContent>
      </Dialog>

      <div className="min-w-0 flex-1">
        <Chat
          activeChatId={visibleActiveChatId}
          onSelectChat={setActiveChatId}
          activeStreamingMessage={activeStreamingState?.content ?? ""}
          startStreamingForChat={startStreamingForChat}
          updateStreamingMessageForChat={updateStreamingMessageForChat}
          finishStreamingForChat={finishStreamingForChat}
        />
      </div>

      <Auth className="absolute top-2 right-2" />
    </div>
  )
}
