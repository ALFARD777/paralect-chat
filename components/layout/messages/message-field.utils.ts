import { toast } from "sonner"

import {
  SUPPORTED_DOCUMENT_MIME_TYPES,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "@/lib/attachments"
import { IChatAttachment, IChatMessage } from "@/lib/chat"
import { IPendingAttachment } from "./message-field.types"

export function createErrorMessage(error: unknown): IChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      error instanceof Error
        ? error.message
        : "Something went wrong while generating the response",
    kind: "error",
  }
}

export function buildPendingAttachments(
  attachments: IPendingAttachment[]
): IChatAttachment[] {
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.file.name,
    mimeType: attachment.file.type,
    url: attachment.dataUrl ?? "",
    type: attachment.kind,
  }))
}

export async function readStreamedResponse(
  response: Response,
  onDelta: (value: string) => void
) {
  if (!response.body) {
    throw new Error("Request failed")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let assistantContent = ""
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine.startsWith("data:")) {
        continue
      }

      const data = trimmedLine.slice(5).trim()

      if (data === "[DONE]") {
        continue
      }

      try {
        const parsed = JSON.parse(data)
        const delta = parsed?.choices?.[0]?.delta?.content

        if (typeof delta === "string") {
          assistantContent += delta
          onDelta(assistantContent)
        }
      } catch {
        continue
      }
    }
  }

  return assistantContent
}

export function buildGuestRequestMessages(
  messages: IChatMessage[],
  attachments: IPendingAttachment[]
) {
  return messages.map((message, index) => {
    const isLastUserMessage =
      index === messages.length - 1 && message.role === "user"

    if (!isLastUserMessage) {
      return {
        role: message.role,
        content: message.content,
      }
    }

    const imageAttachments = attachments.filter(
      (attachment) => attachment.kind === "image" && attachment.dataUrl
    )

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
          type: "text" as const,
          text: message.content,
        },
        ...imageAttachments.map((attachment) => ({
          type: "image_url" as const,
          image_url: {
            url: attachment.dataUrl!,
          },
        })),
      ],
    }
  })
}

export function filterSupportedFiles(
  files: FileList | File[] | null,
  isSignedIn: boolean
) {
  if (!files?.length) {
    return []
  }

  const selectedFiles = Array.from(files)

  const hasUnsupportedFiles = selectedFiles.some(
    (file) =>
      !SUPPORTED_IMAGE_MIME_TYPES.includes(file.type) &&
      !SUPPORTED_DOCUMENT_MIME_TYPES.includes(file.type)
  )

  const hasGuestDocuments =
    !isSignedIn &&
    selectedFiles.some((file) =>
      SUPPORTED_DOCUMENT_MIME_TYPES.includes(file.type)
    )

  if (hasGuestDocuments) {
    toast.error("Sign in to upload PDF and TXT documents")
  }

  if (hasUnsupportedFiles) {
    toast.error(
      isSignedIn
        ? "Supported files: PNG, JPG, WEBP, GIF, PDF, TXT"
        : "Supported files: PNG, JPG, WEBP, GIF"
    )
  }

  return selectedFiles.filter((file) => {
    if (SUPPORTED_IMAGE_MIME_TYPES.includes(file.type)) {
      return true
    }

    if (!isSignedIn) {
      return false
    }

    return SUPPORTED_DOCUMENT_MIME_TYPES.includes(file.type)
  })
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("Failed to read file as data URL"))
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })
}

export async function preparePendingAttachments(
  files: FileList | File[] | null,
  isSignedIn: boolean
) {
  const supportedFiles = filterSupportedFiles(files, isSignedIn)

  if (supportedFiles.length === 0) {
    return []
  }

  return Promise.all(
    supportedFiles.map(async (file) => {
      const isImage = file.type.startsWith("image/")

      return {
        file,
        id: crypto.randomUUID(),
        kind: isImage ? "image" : "document",
        dataUrl: isImage ? await fileToDataUrl(file) : undefined,
      } satisfies IPendingAttachment
    })
  )
}
