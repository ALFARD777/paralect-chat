import { Buffer } from "node:buffer"

import { NextRequest, NextResponse } from "next/server"

import {
  CHAT_ATTACHMENTS_BUCKET,
  getAttachmentTypeFromMimeType,
  sanitizeAttachmentFileName,
} from "@/lib/attachments"
import { extractDocumentContentFromBuffer } from "@/lib/documents"
import { getUserFromRequest } from "@/lib/supabase-auth"
import { supabaseServer } from "@/lib/supabase-server"

interface RouteContext {
  params: Promise<{
    messageId: string
  }>
}

async function cleanupUploadedAttachment(
  storagePath: string,
  attachmentId: string
) {
  await Promise.all([
    supabaseServer.storage.from(CHAT_ATTACHMENTS_BUCKET).remove([storagePath]),
    supabaseServer.from("message_attachments").delete().eq("id", attachmentId),
  ])
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { messageId } = await context.params
  const { user, error: authError } = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      { error: authError || "Unauthorized" },
      { status: 401 }
    )
  }

  if (!messageId) {
    return NextResponse.json(
      { error: "messageId is required" },
      { status: 400 }
    )
  }

  const { data: message, error: messageError } = await supabaseServer
    .from("messages")
    .select("id, chat_id")
    .eq("id", messageId)
    .eq("user_id", user.id)
    .single()

  if (messageError || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  const formData = await request.formData()
  const fileEntry = formData.get("file")

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 })
  }

  const mimeType = fileEntry.type || "application/octet-stream"
  const attachmentType = getAttachmentTypeFromMimeType(mimeType)

  if (!attachmentType) {
    return NextResponse.json(
      { error: "Unsupported attachment type" },
      { status: 400 }
    )
  }

  const attachmentId = crypto.randomUUID()
  const safeFileName = sanitizeAttachmentFileName(fileEntry.name)
  const storagePath = [
    user.id,
    message.chat_id,
    messageId,
    `${attachmentId}-${safeFileName || "attachment"}`,
  ].join("/")

  const buffer = Buffer.from(await fileEntry.arrayBuffer())

  const { error: uploadError } = await supabaseServer.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message || "Failed to upload attachment" },
      { status: 500 }
    )
  }

  const { data: attachment, error: attachmentError } = await supabaseServer
    .from("message_attachments")
    .insert({
      id: attachmentId,
      message_id: messageId,
      chat_id: message.chat_id,
      user_id: user.id,
      name: fileEntry.name.trim() || "Attachment",
      mime_type: mimeType,
      storage_path: storagePath,
      type: attachmentType,
    })
    .select()
    .single()

  if (attachmentError || !attachment) {
    await supabaseServer.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .remove([storagePath])

    return NextResponse.json(
      { error: attachmentError?.message || "Failed to save attachment" },
      { status: 500 }
    )
  }

  if (attachmentType === "document") {
    try {
      const extractedContent = await extractDocumentContentFromBuffer({
        buffer,
        mimeType,
      })

      if (!extractedContent) {
        throw new Error("content cannot be empty")
      }

      const { error: documentError } = await supabaseServer
        .from("documents")
        .insert({
          user_id: user.id,
          chat_id: message.chat_id,
          message_id: messageId,
          attachment_id: attachmentId,
          name: fileEntry.name.trim() || "Document",
          mime_type: mimeType,
          content: extractedContent,
        })

      if (documentError) {
        throw new Error(documentError.message || "Failed to save document")
      }
    } catch (error) {
      await cleanupUploadedAttachment(storagePath, attachmentId)

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to process document",
        },
        { status: 400 }
      )
    }
  }

  const { data: signedUrlData, error: signedUrlError } =
    await supabaseServer.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 60)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { error: signedUrlError?.message || "Failed to prepare attachment" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    attachment: {
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mime_type,
      type: attachment.type,
      url: signedUrlData.signedUrl,
    },
  })
}
