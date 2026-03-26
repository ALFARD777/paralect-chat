import { NextRequest, NextResponse } from "next/server"

import { supabaseServer } from "@/lib/supabase-server"
import { getUserFromRequest } from "@/lib/supabase-auth"

interface RouteContext {
  params: Promise<{
    chatId: string
  }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { chatId } = await context.params

  const { user, error: authError } = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { title } = body ?? {}

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 })
  }

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const trimmedTitle = title.trim()

  if (!trimmedTitle) {
    return NextResponse.json(
      { error: "title cannot be empty" },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseServer
    .from("chats")
    .update({
      title: trimmedTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update chat" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    chat: data,
  })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { chatId } = await context.params

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

  const { error } = await supabaseServer
    .from("chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete chat" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
