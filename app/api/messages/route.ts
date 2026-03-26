import { NextRequest, NextResponse } from "next/server"

import { getChatMessagesWithAttachments } from "@/lib/messages"
import { supabaseServer } from "@/lib/supabase-server"
import { getUserFromRequest } from "@/lib/supabase-auth"

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chatId")

  const countOnly = request.nextUrl.searchParams.get("countOnly") === "true"

  const { user, error: authError } = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 }
    )
  }

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 })
  }

  if (countOnly) {
    const { count, error } = await supabaseServer
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to count messages" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: count ?? 0,
    })
  }

  try {
    const messages = await getChatMessagesWithAttachments(chatId, user.id)

    return NextResponse.json({
      messages,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load messages",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { chatId, role, content } = body ?? {}

  if (!chatId || typeof chatId !== "string") {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 })
  }

  if (!role || !["user", "assistant"].includes(role)) {
    return NextResponse.json({ error: "role is invalid" }, { status: 400 })
  }

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }

  const trimmedContent = content.trim()

  if (!trimmedContent) {
    return NextResponse.json(
      { error: "content cannot be empty" },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseServer
    .from("messages")
    .insert({
      chat_id: chatId,
      user_id: user.id,
      role,
      content: trimmedContent,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create message" },
      { status: 500 }
    )
  }

  await supabaseServer
    .from("chats")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId)
    .eq("user_id", user.id)

  return NextResponse.json({
    message: data,
  })
}
