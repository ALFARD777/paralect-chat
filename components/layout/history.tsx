"use client"

import { IconLogout2, IconMessage2, IconPlus } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { createAuthorizedHeaders } from "@/lib/client-api"
import type { IChat } from "@/lib/chat"
import { cn, getInitials } from "@/lib/utils"
import { supabaseRealtime } from "@/lib/supabase"
import OtherButton from "../other-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { toast } from "sonner"

interface HistoryProps {
  activeChatId: string | "draft" | null
  onSelectChat: (chatId: string | "draft") => void
  streamingChatIds: string[]
}

export default function History({
  activeChatId,
  onSelectChat,
  streamingChatIds,
}: HistoryProps) {
  const { accessToken, displayName, isLoading, signOut, user } = useAuth()
  const queryClient = useQueryClient()

  const [renameChatId, setRenameChatId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  const [deleteChatId, setDeleteChatId] = useState<string | null>(null)

  const chatsQuery = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: async (): Promise<IChat[]> => {
      const response = await fetch("/api/chats", {
        headers: createAuthorizedHeaders(accessToken),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to load chats")
      }

      return data.chats ?? []
    },
    enabled: Boolean(user?.id && accessToken),
  })

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const channel = supabaseRealtime
      .channel(`chats:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newChat = payload.new as IChat

          queryClient.setQueryData<IChat[]>(["chats", user.id], (current) => {
            const items = current ?? []

            const alreadyExists = items.some((chat) => chat.id === newChat.id)

            if (alreadyExists) {
              return items
            }

            return [newChat, ...items].sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            )
          })
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedChat = payload.new as IChat

          queryClient.setQueryData<IChat[]>(["chats", user.id], (current) => {
            const items = current ?? []

            return items
              .map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime()
              )
          })
        }
      )
      .subscribe()

    return () => {
      void supabaseRealtime.removeChannel(channel)
    }
  }, [queryClient, user?.id])

  useEffect(() => {
    if (activeChatId) {
      return
    }

    const firstChatId = chatsQuery.data?.[0]?.id

    if (firstChatId) {
      onSelectChat(firstChatId)
    }
  }, [activeChatId, chatsQuery.data, onSelectChat])

  if (isLoading || !displayName) {
    return null
  }

  const handleRenameChat = async () => {
    const trimmed = renameValue.trim()

    if (!renameChatId || !trimmed || !user?.id) {
      return
    }

    const response = await fetch(`/api/chats/${renameChatId}`, {
      method: "PATCH",
      headers: createAuthorizedHeaders(accessToken, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        title: trimmed,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      toast.error(data?.error || "Failed to rename chat")
      return
    }

    await queryClient.invalidateQueries({
      queryKey: ["chats", user.id],
    })

    setRenameChatId(null)
    setRenameValue("")

    toast.success("Chat renamed")
  }

  const handleDeleteChat = async () => {
    if (!deleteChatId || !user?.id) {
      return
    }

    const response = await fetch(`/api/chats/${deleteChatId}`, {
      method: "DELETE",
      headers: createAuthorizedHeaders(accessToken),
    })

    const data = await response.json()

    if (!response.ok) {
      toast.error(data?.error || "Failed to delete chat")
      return
    }

    await queryClient.invalidateQueries({
      queryKey: ["chats", user.id],
    })

    if (activeChatId === deleteChatId) {
      onSelectChat("draft")
    }

    setDeleteChatId(null)

    toast.success("Chat deleted")
  }

  const currentUserName = displayName
  const initials = getInitials(currentUserName)
  const chats = chatsQuery.data ?? []

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-[28px] border border-sidebar-border/70 bg-sidebar p-layout text-sidebar-foreground shadow-md backdrop-blur">
      <Button
        className="w-full justify-start gap-3 rounded-2xl px-4 py-6 text-left"
        onClick={() => onSelectChat("draft")}
      >
        <IconPlus className="size-4 shrink-0" />

        <span className="relative flex min-w-0 flex-1 flex-col whitespace-normal">
          <span
            className={cn(
              "text-sm font-medium transition-all duration-300 ease-out",
              activeChatId === "draft"
                ? "-translate-y-1/2 opacity-0"
                : "translate-y-0 opacity-100"
            )}
          >
            New Chat
          </span>

          <span
            className={cn(
              "absolute top-1/2 left-0 text-xs text-primary-foreground/70 transition-all duration-300 ease-out",
              activeChatId === "draft"
                ? "-translate-y-1/2 opacity-100"
                : "translate-y-2 opacity-0"
            )}
          >
            Chat will be created after first message
          </span>
        </span>
      </Button>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="px-2 text-xs font-medium tracking-[0.18em] text-sidebar-foreground/45 uppercase">
          History
        </p>

        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {chatsQuery.isLoading ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-2xl bg-sidebar-accent/60 px-3 py-2"
                >
                  <Skeleton className="size-8 rounded-xl bg-sidebar-foreground/10" />
                  <Skeleton className="h-4 flex-1 rounded-md bg-sidebar-foreground/10" />
                </div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="px-3 py-2 text-sm text-sidebar-accent-foreground/60">
              No chats yet
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === activeChatId
              const isStreaming = streamingChatIds.includes(chat.id)

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={cn(
                    "group relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors",
                    isActive
                      ? "border-sidebar-foreground/10 bg-sidebar-foreground text-sidebar"
                      : "border-transparent bg-sidebar-accent/60 hover:border-sidebar-border hover:bg-sidebar-accent"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
                      isActive
                        ? "bg-sidebar text-sidebar-foreground"
                        : "bg-sidebar-foreground/6 text-sidebar-foreground/70"
                    )}
                  >
                    <IconMessage2 className="size-4" />
                  </span>

                  <span className="block min-w-0 flex-1 truncate text-sm font-medium">
                    {chat.title}
                  </span>

                  <OtherButton
                    onRename={() => {
                      setRenameChatId(chat.id)
                      setRenameValue(chat.title)
                    }}
                    onDelete={() => {
                      if (isStreaming) {
                        return
                      }

                      setDeleteChatId(chat.id)
                    }}
                    isDeleteDisabled={isStreaming}
                  />
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/70 p-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sidebar-foreground text-sm font-semibold text-sidebar">
          {initials}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{currentUserName}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0 rounded-2xl hover:scale-110 hover:text-red-500"
          onClick={() => void signOut()}
          disabled={isLoading}
          aria-label="Sign out"
          title="Sign out"
        >
          <IconLogout2 className="size-4" />
        </Button>
      </div>

      <Dialog
        open={Boolean(renameChatId)}
        onOpenChange={(o) => {
          if (!o) {
            setRenameChatId(null)
            setRenameValue("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter new name</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new name"
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setRenameChatId(null)
                  setRenameValue("")
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={() => void handleRenameChat()}
                disabled={!renameValue.trim()}
              >
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteChatId)}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteChatId(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The chat and all messages inside it
              will be permanently deleted.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setDeleteChatId(null)
                }}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={() => void handleDeleteChat()}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
