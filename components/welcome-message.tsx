"use client"
import { useEffect, useState } from "react"

const messages = [
  "What's new with you?",
  "What would you like to talk about today?",
  "Where should we start?",
  "How can I help right now?",
  "Do you have an idea you'd like to discuss?",
  "How can I help?",
]

export default function WelcomeMessage() {
  const [fullMessage] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * messages.length)
    return messages[randomIndex]
  })
  const [typedLength, setTypedLength] = useState(0)

  useEffect(() => {
    let index = 0
    const chars = Array.from(fullMessage)
    const interval = window.setInterval(() => {
      setTypedLength(index + 1)
      index += 1

      if (index >= chars.length) {
        window.clearInterval(interval)
      }
    }, 60)

    return () => {
      window.clearInterval(interval)
    }
  }, [fullMessage])

  return (
    <h2 className="text-center text-4xl">
      {Array.from(fullMessage).slice(0, typedLength).join("")}
    </h2>
  )
}
