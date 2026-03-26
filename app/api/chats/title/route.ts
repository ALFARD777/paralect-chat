import { NextRequest, NextResponse } from "next/server"

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "openrouter/auto"
const SYSTEM_PROMPT = `
Generate exactly one short title for chat conversation.
Rules:
- return only one title
- do not provide alternatives
- do not add explanations
- do not add labels
- be 3 to 6 words
- match the user's language
- not use quotes
- not use punctuation at the end
- be concise and descriptive
- only one answer
- without any quotes
Return only the title text.
`.trim()

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter key not found" },
        { status: 500 }
      )
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          { role: "user", content: message },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "OpenRouter request failed" },
        { status: response.status }
      )
    }

    const rawTitle = data?.choices?.[0]?.message?.content?.trim() ?? ""

    const normalizedTitle = rawTitle.trim()

    const firstQuote = normalizedTitle[0]
    const hasOpeningQuote = [`"`, `'`, "`"].includes(firstQuote)

    const truncatedByQuote = hasOpeningQuote
      ? normalizedTitle.slice(1).split(firstQuote)[0]
      : normalizedTitle

    const title = truncatedByQuote
      .split(/\s+or\s+|\n|\/| \| /i)[0]
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.!?,;:]+$/g, "")
      .trim()

    return NextResponse.json({
      title: title || "New chat",
    })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
