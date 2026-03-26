import { Dispatch, SetStateAction } from "react"

import { IChatMessage } from "@/lib/chat"

export interface IMessageFieldProps {
  activeChatId: string | "draft" | null
  onSelectChat: (chatId: string | "draft") => void
  guestMessages: IChatMessage[]
  setGuestMessages: Dispatch<SetStateAction<IChatMessage[]>>
  registerExternalFileHandler?: (
    handler: ((files: FileList | File[]) => void) | null
  ) => void
  startStreamingForChat: (chatId: string) => void
  updateStreamingMessageForChat: (chatId: string, content: string) => void
  finishStreamingForChat: (chatId: string) => void
}

export interface IPendingAttachment {
  file: File
  id: string
  kind: "image" | "document"
  dataUrl?: string
}

export const AUTHENTICATED_FILE_INPUT_ACCEPT = [
  "image/*",
  "application/pdf",
  "text/plain",
].join(",")

export const GUEST_FILE_INPUT_ACCEPT = "image/*"

export const GUEST_STREAMING_KEY = "__guest__"
