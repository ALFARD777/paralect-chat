import { Buffer } from "node:buffer"

import { PDFParse } from "pdf-parse"

import type { ChatCompletionMessage } from "@/lib/chat"

export interface DocumentContextItem {
  name: string
  content: string
}

const MAX_DOCUMENTS_IN_PROMPT = 3
const MAX_DOCUMENT_CHARS = 6000
const DOCUMENT_CONTEXT_INSTRUCTION =
  "Use the uploaded documents below when answering. If the answer is based on them, mention the document name."

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)

  if (!match) {
    throw new Error("Invalid file format")
  }

  const [, mimeType, base64] = match

  return {
    buffer: Buffer.from(base64, "base64"),
    mimeType,
  }
}

export async function extractDocumentContentFromBuffer({
  buffer,
  mimeType,
}: {
  buffer: Buffer
  mimeType: string
}) {
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8").trim()
  }

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    return result.text.trim()
  }

  throw new Error("Document type is not supported for text extraction")
}

export async function extractDocumentContent({
  content,
  dataUrl,
  mimeType,
}: {
  content?: unknown
  dataUrl?: unknown
  mimeType: string
}) {
  if (typeof content === "string" && content.trim()) {
    return content.trim()
  }

  if (typeof dataUrl !== "string" || !dataUrl) {
    throw new Error("content is required")
  }

  const { buffer, mimeType: actualMimeType } = parseDataUrl(dataUrl)

  return extractDocumentContentFromBuffer({
    buffer,
    mimeType: mimeType || actualMimeType,
  })
}

export function injectDocumentsIntoMessages(
  messages: ChatCompletionMessage[],
  documents: DocumentContextItem[]
) {
  if (documents.length === 0) {
    return messages
  }

  const normalizedDocuments = documents
    .filter(
      (document) =>
        typeof document.name === "string" &&
        document.name.trim() &&
        typeof document.content === "string" &&
        document.content.trim()
    )
    .slice(0, MAX_DOCUMENTS_IN_PROMPT)
    .map(
      (document) =>
        `Document: ${document.name.trim()}\n${document.content
          .trim()
          .slice(0, MAX_DOCUMENT_CHARS)}`
    )

  if (normalizedDocuments.length === 0) {
    return messages
  }

  const targetIndex = messages
    .map((message) => message.role)
    .lastIndexOf("user")

  if (targetIndex === -1) {
    return messages
  }

  const documentsPrompt = [
    DOCUMENT_CONTEXT_INSTRUCTION,
    normalizedDocuments.join("\n\n---\n\n"),
  ].join("\n\n")

  return messages.map((message, index) => {
    if (index !== targetIndex) {
      return message
    }

    if (typeof message.content === "string") {
      return {
        ...message,
        content: [message.content, documentsPrompt].join("\n\n"),
      }
    }

    return {
      ...message,
      content: [
        ...message.content,
        {
          type: "text" as const,
          text: `\n\n${documentsPrompt}`,
        },
      ],
    }
  })
}
