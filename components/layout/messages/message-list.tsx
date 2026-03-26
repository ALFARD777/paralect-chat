"use client"

import { IChatMessage } from "@/lib/chat"
import Message from "./message"
import WelcomeMessage from "@/components/welcome-message"
import { useEffect, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface MessageListProps {
  messages: IChatMessage[]
  isLoading: boolean
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-6">
        <Skeleton className="ml-auto h-10 w-[38%] rounded-2xl" />
        <Skeleton className="h-16 w-[46%] rounded-2xl" />
        <Skeleton className="ml-auto h-20 w-[64%] rounded-2xl" />
        <Skeleton className="h-64 w-[58%] rounded-2xl" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <WelcomeMessage />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-6"
    >
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  )
}
