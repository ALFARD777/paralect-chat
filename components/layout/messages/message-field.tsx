import { IconPaperclip, IconSend2 } from "@tabler/icons-react"

import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Spinner } from "../../ui/spinner"
import { MessageFieldAttachments } from "./message-field-attachments"
import { IMessageFieldProps } from "./message-field.types"
import { useMessageField } from "./use-message-field"

export default function MessageField({
  activeChatId,
  onSelectChat,
  guestMessages,
  setGuestMessages,
  registerExternalFileHandler,
  startStreamingForChat,
  updateStreamingMessageForChat,
  finishStreamingForChat,
}: IMessageFieldProps) {
  const {
    fileInputAccept,
    fileInputRef,
    handlePaste,
    handlePickFiles,
    handleRemoveAttachment,
    handleSubmit,
    isLoading,
    pendingAttachments,
    setValue,
    value,
  } = useMessageField({
    activeChatId,
    onSelectChat,
    guestMessages,
    setGuestMessages,
    registerExternalFileHandler,
    startStreamingForChat,
    updateStreamingMessageForChat,
    finishStreamingForChat,
  })

  return (
    <div className="rounded-[28px] border border-border/70 bg-card/80 p-2 shadow-md backdrop-blur">
      <input
        ref={fileInputRef}
        type="file"
        accept={fileInputAccept}
        multiple
        className="hidden"
        onChange={(event) => {
          void handlePickFiles(event.target.files)
          event.target.value = ""
        }}
      />

      <MessageFieldAttachments
        attachments={pendingAttachments}
        onRemove={handleRemoveAttachment}
      />

      <div className="relative">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !isLoading) {
              event.preventDefault()
              void handleSubmit()
            }
          }}
          className="h-16 rounded-2xl border-0 bg-transparent pr-16 pl-12 text-base! shadow-none placeholder:text-lg placeholder:text-foreground/35 focus-visible:ring-0"
          placeholder="Ask anything"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 left-3 -translate-y-1/2 rounded-xl hover:scale-110"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <IconPaperclip className="size-4" />
        </Button>

        <Button
          size="icon-lg"
          className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-4 hover:scale-110 disabled:cursor-not-allowed"
          onClick={() => void handleSubmit()}
          disabled={isLoading || !value.trim()}
        >
          {isLoading ? <Spinner /> : <IconSend2 className="size-5" />}
        </Button>
      </div>
    </div>
  )
}
