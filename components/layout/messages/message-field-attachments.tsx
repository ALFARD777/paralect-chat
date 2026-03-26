import Image from "next/image"
import { IconFileText, IconX } from "@tabler/icons-react"

import { IPendingAttachment } from "./message-field.types"

interface IMessageFieldAttachmentsProps {
  attachments: IPendingAttachment[]
  onRemove: (index: number) => void
}

export function MessageFieldAttachments({
  attachments,
  onRemove,
}: IMessageFieldAttachmentsProps) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="mb-2 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id}
            className="group relative flex w-28 shrink-0 flex-col rounded-2xl border border-border/70 bg-background p-2 text-xs text-foreground/70"
          >
            <button
              type="button"
              className="absolute top-2 right-2 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background/90 text-foreground/50 shadow-sm transition-colors hover:text-red-500"
              onClick={() => onRemove(index)}
            >
              <IconX className="size-3.5" />
            </button>

            {attachment.kind === "image" && attachment.dataUrl ? (
              <div className="relative mb-2 aspect-square overflow-hidden rounded-xl bg-muted">
                <Image
                  src={attachment.dataUrl}
                  alt={attachment.file.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="mb-2 flex aspect-square items-center justify-center rounded-xl bg-muted text-foreground/50">
                <IconFileText className="size-8" />
              </div>
            )}

            <p className="truncate pr-5 text-xs font-medium text-foreground">
              {attachment.file.name}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground/50">
              {attachment.kind === "image" ? "Image" : "Document"}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
