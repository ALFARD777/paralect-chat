import type { NextRequest } from "next/server"

import { createSupabaseServerAuthClient } from "@/lib/supabase-server"

export async function getUserFromRequest(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization")

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { user: null, error: "Missing bearer token" }
  }

  const accessToken = authorizationHeader.slice("Bearer ".length).trim()

  if (!accessToken) {
    return { user: null, error: "Missing access token" }
  }

  const {
    data: { user },
    error,
  } = await createSupabaseServerAuthClient().auth.getUser(accessToken)

  if (error || !user) {
    return { user: null, error: error?.message || "Unauthorized" }
  }

  return { user, error: null }
}
