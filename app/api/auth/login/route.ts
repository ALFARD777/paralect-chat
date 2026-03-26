import { NextResponse } from "next/server"

import { applyAuthCookies, buildAuthSessionPayload } from "@/lib/auth-session"
import { createSupabaseServerAuthClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    )
  }

  const { data, error } =
    await createSupabaseServerAuthClient().auth.signInWithPassword({
      email,
      password,
    })

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid credentials" },
      { status: 401 }
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
