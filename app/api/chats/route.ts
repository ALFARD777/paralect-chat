import { NextRequest, NextResponse } from "next/server"

import { supabaseServer } from "@/lib/supabase-server"
import { getUserFromRequest } from "@/lib/supabase-auth"

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 }
    )
  }

  const { data, error } = await supabaseServer
    .from("chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load chats" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    chats: data ?? [],
  })
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
  const { title } = body ?? {}

  const normalizedTitle =
    typeof title === "string" && title.trim() ? title.trim() : "New chat"

  const { data, error } = await supabaseServer
    .from("chats")
    .insert({
      title: normalizedTitle,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create chat" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    chat: data,
  })
}
