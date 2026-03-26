import { NextResponse } from "next/server"

import { applyAuthCookies, buildAuthSessionPayload } from "@/lib/auth-session"
import {
  createSupabaseServerAuthClient,
  supabaseServer,
} from "@/lib/supabase-server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const displayName =
    typeof body?.displayName === "string" ? body.displayName.trim() : ""
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!displayName || !email || password.length < 6) {
    return NextResponse.json(
      { error: "Display name, email, and password are required" },
      { status: 400 }
    )
  }

  const { error: createError } = await supabaseServer.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
    user_metadata: {
      display_name: displayName,
    },
  })

  if (createError) {
    return NextResponse.json(
      { error: createError.message ?? "Failed to create account" },
      { status: 400 }
    )
  }

  const { data, error: signInError } =
    await createSupabaseServerAuthClient().auth.signInWithPassword({
      email,
      password,
    })

  if (signInError || !data.session || !data.user) {
    return NextResponse.json(
      { error: signInError?.message ?? "Failed to create session" },
      { status: 500 }
    )
  }

  const response = NextResponse.json({
    session: buildAuthSessionPayload(
      data.user,
      data.session.access_token,
      data.session.expires_at ?? null
    ),
  })

  applyAuthCookies(response, data.session)

  return response
}
