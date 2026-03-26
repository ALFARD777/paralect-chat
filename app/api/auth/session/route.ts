import { NextRequest, NextResponse } from "next/server"

import {
  applyAuthCookies,
  buildAuthSessionPayload,
  clearAuthCookies,
  readAuthTokens,
} from "@/lib/auth-session"
import { createSupabaseServerAuthClient } from "@/lib/supabase-server"

async function buildSessionResponse(request: NextRequest) {
  const { accessToken, refreshToken } = readAuthTokens(request)

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ session: null })
  }

  if (accessToken) {
    const {
      data: { user },
      error,
    } = await createSupabaseServerAuthClient().auth.getUser(accessToken)

    if (!error && user) {
      return NextResponse.json({
        session: buildAuthSessionPayload(user, accessToken, null),
      })
    }
  }

  if (!refreshToken) {
    const response = NextResponse.json({ session: null })
    clearAuthCookies(response)
    return response
  }

  const { data, error } =
    await createSupabaseServerAuthClient().auth.refreshSession({
      refresh_token: refreshToken,
    })

  if (error || !data.session || !data.user) {
    const response = NextResponse.json({ session: null })
    clearAuthCookies(response)
    return response
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

export async function GET(request: NextRequest) {
  return buildSessionResponse(request)
}
