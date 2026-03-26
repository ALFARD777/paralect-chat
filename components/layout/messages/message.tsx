import { IconFileText } from "@tabler/icons-react"
import { IChatMessage } from "@/lib/chat"
import { cn } from "@/lib/utils"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MessageProps {
  message: IChatMessage
}
export default function Message({ message }: MessageProps) {
  const isUserMessage = message.role === "user"

  return (
    <div
      className={cn(
        "max-w-[65%] rounded-2xl border px-4 py-3 text-base leading-6",
        message.role === "user"
          ? "ml-auto border-primary bg-primary text-primary-foreground"
          : message.kind === "error"
            ? "border-red-500 bg-red-500/30 text-red-500"
            : "border-border bg-card text-card-foreground"
      )}
    >
      {isUserMessage ? (
        <div className="space-y-3">
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2">
              {message.attachments.map((attachment) =>
                attachment.type === "image" ? (
                  <button
                    key={attachment.id}
                    type="button"
                    className="relative block h-40 w-full overflow-hidden rounded-xl border border-white/10 bg-black/10"
                  >
                    <Image
                      src={attachment.url}
                      alt={attachment.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ) : (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/10">
                      <IconFileText className="size-4" />
                    </span>
                    <span className="min-w-0 truncate">{attachment.name}</span>
                  </div>
                )
              )}
            </div>
          )}

          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mt-4 mb-2 text-2xl font-semibold first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-4 mb-2 text-xl font-semibold first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-3 mb-2 text-lg font-semibold first:mt-0">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-3 whitespace-pre-wrap last:mb-0">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            a: ({ children, href }) => (
              <a
                href={href}
                className="underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                {children}
              </a>
            ),
            code: ({ children, className }) => {
              const isBlock = Boolean(className)

              if (!isBlock) {
                return (
                  <code className="rounded-md bg-foreground/10 px-1.5 py-0.5 font-mono text-[0.9em]">
                    {children}
                  </code>
                )
              }

              return (
                <code className="font-mono text-sm leading-6">{children}</code>
              )
            },
            pre: ({ children }) => (
              <pre className="mb-3 overflow-x-auto rounded-xl bg-black/80 p-3 text-white last:mb-0">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="mb-3 border-l-2 border-border pl-4 italic last:mb-0">
                {children}
              </blockquote>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}
    </div>
  )
}
