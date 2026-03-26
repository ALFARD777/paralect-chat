import { NextRequest, NextResponse } from "next/server"

import { consumeGuestMessageQuota } from "@/lib/guest-limit"
import { ChatCompletionMessage } from "@/lib/chat"
import { injectDocumentsIntoMessages } from "@/lib/documents"
import {
  buildCompletionMessages,
  getChatMessagesWithAttachments,
} from "@/lib/messages"
import { getUserFromRequest } from "@/lib/supabase-auth"
import { supabaseServer } from "@/lib/supabase-server"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "openrouter/auto"
const SYSTEM_PROMPT = `
  You are a helpful AI assistant.
  Reply in the same language as the user's latest message.
  Be concise, practical, and clear.
  If you provide code, use fenced code blocks with a language tag.
  If you are unsure about a fact, say so directly instead of making it up.
  `.trim()

function normalizeMessages(messages: unknown[]): ChatCompletionMessage[] {
  return messages.filter((message): message is ChatCompletionMessage => {
    if (!message || typeof message !== "object") {
      return false
    }

    if (
      !("role" in message) ||
      !["user", "assistant", "system"].includes(message.role as string)
    ) {
      return false
    }

    if (!("content" in message)) {
      return false
    }

    if (typeof message.content === "string") {
      return true
    }

    if (!Array.isArray(message.content)) {
      return false
    }

    return message.content.every((part: unknown) => {
      if (!part || typeof part !== "object") {
        return false
      }

      const contentPart = part as Record<string, unknown>

      if (typeof contentPart.type !== "string") {
        return false
      }

      if (contentPart.type === "text") {
        return typeof contentPart.text === "string"
      }

      if (contentPart.type === "image_url") {
        const imageUrl = contentPart.image_url as { url?: unknown } | undefined

        return typeof imageUrl?.url === "string"
      }

      return false
    })
  })
}

async function buildAuthenticatedMessages(chatId: string, userId: string) {
  const messages = await getChatMessagesWithAttachments(chatId, userId)
  const completionMessages = buildCompletionMessages(messages)

  const { data: documents, error } = await supabaseServer
    .from("documents")
    .select("name, content")
    .eq("user_id", userId)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message || "Failed to load documents")
  }

  return injectDocumentsIntoMessages(completionMessages, documents ?? [])
}

export async function POST(request: NextRequest) {
  try {
    const authorizationHeader = request.headers.get("authorization")
    const hasBearerToken = authorizationHeader?.startsWith("Bearer ")
    let authenticatedUserId: string | null = null

    if (hasBearerToken) {
      const { user, error } = await getUserFromRequest(request)

      if (!user) {
        return NextResponse.json(
          { error: error || "Unauthorized" },
          { status: 401 }
        )
      }

      authenticatedUserId = user.id
    }

    const body = await request.json().catch(() => null)
    const chatId =
      typeof body?.chatId === "string" && body.chatId.trim()
        ? body.chatId.trim()
        : null

    let normalizedMessages: ChatCompletionMessage[] = []

    if (authenticatedUserId) {
      if (!chatId) {
        return NextResponse.json(
          { error: "chatId is required" },
          { status: 400 }
        )
      }

      normalizedMessages = await buildAuthenticatedMessages(
        chatId,
        authenticatedUserId
      )
    } else {
      if (!Array.isArray(body?.messages) || body.messages.length === 0) {
        return NextResponse.json(
          { error: "Messages are required" },
          { status: 400 }
        )
      }

      normalizedMessages = normalizeMessages(body.messages)

      if (normalizedMessages.length === 0) {
        return NextResponse.json(
          { error: "Valid messages are required" },
          { status: 400 }
        )
      }
    }

    if (!hasBearerToken) {
      const quota = await consumeGuestMessageQuota(request)

      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: `You have reached the free limit of ${quota.limit} messages. Sign in to continue chatting`,
          },
          { status: 403 }
        )
      }
    }

    if (normalizedMessages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter key not found" },
        { status: 500 }
      )
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        stream: true,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          ...normalizedMessages,
        ],
      }),
    })

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => null)

      return NextResponse.json(
        {
          error: data?.error?.message ?? "OpenRouter request failed",
          providerError: data,
        },
        { status: response.status || 500 }
      )
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
