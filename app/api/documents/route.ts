import { NextRequest, NextResponse } from "next/server"

import { extractDocumentContent } from "@/lib/documents"
import { getUserFromRequest } from "@/lib/supabase-auth"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const { user, error: authError } = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 }
    )
  }

  const chatId = request.nextUrl.searchParams.get("chatId")

  let query = supabaseServer
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (chatId) {
    query = query.eq("chat_id", chatId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load documents" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    documents: data ?? [],
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
  const { chatId, content, dataUrl, mimeType, name } = body ?? {}

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  if (!mimeType || typeof mimeType !== "string") {
    return NextResponse.json({ error: "mimeType is required" }, { status: 400 })
  }

  let extractedContent = ""

  try {
    extractedContent = await extractDocumentContent({
      content,
      dataUrl,
      mimeType,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract document text",
      },
      { status: 400 }
    )
  }

  if (!extractedContent) {
    return NextResponse.json(
      { error: "content cannot be empty" },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseServer
    .from("documents")
    .insert({
      user_id: user.id,
      chat_id: typeof chatId === "string" ? chatId : null,
      name: name.trim(),
      mime_type: mimeType,
      content: extractedContent,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save document" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    document: data,
  })
}
