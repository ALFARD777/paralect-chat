import type { NextRequest, NextResponse } from "next/server"
import type { Session, User } from "@supabase/supabase-js"

export const AUTH_ACCESS_COOKIE = "pc_access_token"
export const AUTH_REFRESH_COOKIE = "pc_refresh_token"

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30

function getCookieBaseOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }
}

export interface IAuthSessionPayload {
  accessToken: string
  expiresAt: number | null
  user: User
}

export function readAuthTokens(request: NextRequest) {
  return {
    accessToken: request.cookies.get(AUTH_ACCESS_COOKIE)?.value ?? null,
    refreshToken: request.cookies.get(AUTH_REFRESH_COOKIE)?.value ?? null,
  }
}

export function applyAuthCookies(response: NextResponse, session: Session) {
  response.cookies.set(
    AUTH_ACCESS_COOKIE,
    session.access_token,
    getCookieBaseOptions(session.expires_in ?? 60 * 60)
  )
  response.cookies.set(
    AUTH_REFRESH_COOKIE,
    session.refresh_token,
    getCookieBaseOptions(THIRTY_DAYS_IN_SECONDS)
  )
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_ACCESS_COOKIE, "", getCookieBaseOptions(0))
  response.cookies.set(AUTH_REFRESH_COOKIE, "", getCookieBaseOptions(0))
}

export function buildAuthSessionPayload(
  user: User,
  accessToken: string,
  expiresAt: number | null
): IAuthSessionPayload {
  return {
    accessToken,
    expiresAt,
    user,
  }
}
