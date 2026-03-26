export type AttachmentType = "image" | "document"

export interface IMessageAttachmentRecord {
  id: string
  message_id: string
  chat_id: string
  user_id: string
  name: string
  mime_type: string
  storage_path: string
  type: AttachmentType
  created_at: string
}

export const CHAT_ATTACHMENTS_BUCKET = "chat-attachments"

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

export const SUPPORTED_DOCUMENT_MIME_TYPES = ["application/pdf", "text/plain"]

export const SUPPORTED_ATTACHMENT_MIME_TYPES = [
  ...SUPPORTED_IMAGE_MIME_TYPES,
  ...SUPPORTED_DOCUMENT_MIME_TYPES,
]

export function getAttachmentTypeFromMimeType(
  mimeType: string
): AttachmentType | null {
  if (SUPPORTED_IMAGE_MIME_TYPES.includes(mimeType)) {
    return "image"
  }

  if (SUPPORTED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
    return "document"
  }

  return null
}

export function sanitizeAttachmentFileName(fileName: string) {
  const trimmed = fileName.trim() || "attachment"

  return trimmed
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
}
