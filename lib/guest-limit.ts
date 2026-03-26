import { createHash } from "node:crypto"

import type { NextRequest } from "next/server"

import { supabaseServer } from "@/lib/supabase-server"

const GUEST_MESSAGE_LIMIT = 3

function getGuestIdentifierSource(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const vercelForwardedFor = request.headers.get("x-vercel-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const connectingIp = request.headers.get("cf-connecting-ip")

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    vercelForwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    connectingIp ||
    null

  if (ip) {
    return `ip:${ip}`
  }

  // In local development there may be no proxy IP headers at all.
  // A fixed fallback is stricter than a browser fingerprint and prevents
  // bypassing the guest limit by clearing browser storage or switching browsers.
  return "ip:local-development-fallback"
}

function hashGuestIdentifier(identifier: string) {
  const salt =
    process.env.GUEST_LIMIT_SALT ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "guest-limit-default-salt"

  return createHash("sha256").update(`${salt}:${identifier}`).digest("hex")
}

export async function consumeGuestMessageQuota(request: NextRequest) {
  const identifier = hashGuestIdentifier(getGuestIdentifierSource(request))

  const { data, error } = await supabaseServer.rpc(
    "consume_guest_message_quota",
    {
      p_identifier_hash: identifier,
      p_limit: GUEST_MESSAGE_LIMIT,
    }
  )

  if (error) {
    if (
      error.message.includes("Could not find the function") ||
      error.message.includes("does not exist")
    ) {
      throw new Error(
        "Guest limit storage is not set up. Apply the Supabase migration for guest_message_limits."
      )
    }

    throw new Error(error.message || "Failed to check guest limit")
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result) {
    throw new Error("Failed to check guest limit")
  }

  return {
    allowed: Boolean(result.allowed),
    used: Number(result.used_count ?? 0),
    remaining: Number(result.remaining_count ?? 0),
    limit: GUEST_MESSAGE_LIMIT,
  }
}
