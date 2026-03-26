export interface IChat {
  id: string
  title: string
  user_id: string
  created_at: string
  updated_at: string
}

export type ChatCompletionContentPart =
  | {
      type: "text"
      text: string
    }
  | {
      type: "image_url"
      image_url: {
        url: string
      }
    }

export interface ChatCompletionMessage {
  role: "user" | "assistant" | "system"
  content: string | ChatCompletionContentPart[]
}

export interface IChatAttachment {
  id: string
  name: string
  mimeType: string
  url: string
  type: "image" | "document"
}

export interface DocumentRecord {
  id: string
  user_id: string
  chat_id: string | null
  message_id?: string | null
  attachment_id?: string | null
  name: string
  mime_type: string
  content: string
  created_at: string
}

export interface IChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  kind?: "default" | "error"
  attachments?: IChatAttachment[]
}

export interface IMessageRecord extends IChatMessage {
  chat_id: string
  user_id: string
  created_at: string
}
