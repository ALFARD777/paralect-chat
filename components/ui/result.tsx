import { cn } from "@/lib/utils"

interface MessageProps {
  type: "success" | "error"
  message: string | null
}

export default function Result({ type, message }: MessageProps) {
  const styles: Record<MessageProps["type"], string> = {
    success: "border-green-500 bg-green-500/20 text-green-500",
    error: "border-red-500 bg-red-500/20 text-red-500",
  }

  if (!message) return null

  return (
    <div
      className={cn(
        "animate-in rounded-md border p-2 text-sm duration-300 fade-in-0 slide-in-from-top-1",
        styles[type]
      )}
    >
      {message}
    </div>
  )
}
