import { ClipboardEvent, useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "../../auth-provider"
import { submitAuthenticatedMessage } from "./message-field.auth-actions"
import { submitGuestMessage } from "./message-field.guest-actions"
import {
  AUTHENTICATED_FILE_INPUT_ACCEPT,
  GUEST_FILE_INPUT_ACCEPT,
  IMessageFieldProps,
  IPendingAttachment,
} from "./message-field.types"
import {
  buildPendingAttachments,
  createErrorMessage,
  preparePendingAttachments,
} from "./message-field.utils"

export function useMessageField({
  activeChatId,
  onSelectChat,
  guestMessages,
  setGuestMessages,
  registerExternalFileHandler,
  startStreamingForChat,
  updateStreamingMessageForChat,
  finishStreamingForChat,
}: IMessageFieldProps) {
  const { accessToken, user } = useAuth()
  const queryClient = useQueryClient()

  const [value, setValue] = useState("")
  const [pendingAttachments, setPendingAttachments] = useState<
    IPendingAttachment[]
  >([])

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const fileInputAccept = user
    ? AUTHENTICATED_FILE_INPUT_ACCEPT
    : GUEST_FILE_INPUT_ACCEPT

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments([])
  }, [])

  const handlePickFiles = useCallback(
    async (files: FileList | File[] | null) => {
      const nextAttachments = await preparePendingAttachments(
        files,
        Boolean(user)
      )
      setPendingAttachments((current) => [...current, ...nextAttachments])
    },
    [user]
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      const files = Array.from(event.clipboardData.items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file))

      if (files.length === 0) {
        return
      }

      event.preventDefault()
      void handlePickFiles(files)
    },
    [handlePickFiles]
  )

  useEffect(() => {
    registerExternalFileHandler?.((files) => {
      void handlePickFiles(files)
    })

    return () => {
      registerExternalFileHandler?.(null)
    }
  }, [handlePickFiles, registerExternalFileHandler])

  const handleRemoveAttachment = useCallback((indexToRemove: number) => {
    setPendingAttachments((current) =>
      current.filter((_, index) => index !== indexToRemove)
    )
  }, [])

  const guestSubmitMutation = useMutation({
    mutationFn: async ({
      nextGuestMessages,
      nextPendingAttachments,
      trimmed,
    }: {
      nextGuestMessages: typeof guestMessages
      nextPendingAttachments: IPendingAttachment[]
      trimmed: string
    }) =>
      submitGuestMessage({
        guestMessages: nextGuestMessages,
        pendingAttachments: nextPendingAttachments,
        setGuestMessages,
        trimmed,
        buildPendingAttachments,
        createErrorMessage,
        clearPendingAttachments,
        finishStreamingForChat,
        startStreamingForChat,
        updateStreamingMessageForChat,
        setValue,
      }),
  })

  const authenticatedSubmitMutation = useMutation({
    mutationFn: async ({
      nextPendingAttachments,
      trimmed,
    }: {
      nextPendingAttachments: IPendingAttachment[]
      trimmed: string
    }) => {
      if (!user) {
        throw new Error("Unauthorized")
      }

      return submitAuthenticatedMessage({
        accessToken,
        activeChatId,
        buildPendingAttachments,
        clearPendingAttachments,
        finishStreamingForChat,
        onSelectChat,
        pendingAttachments: nextPendingAttachments,
        queryClient,
        setValue,
        startStreamingForChat,
        trimmed,
        updateStreamingMessageForChat,
        user,
      })
    },
  })

  const isLoading =
    guestSubmitMutation.isPending || authenticatedSubmitMutation.isPending

  const handleSubmit = useCallback(async () => {
    const trimmed = value.trim()

    if (!trimmed || isLoading) {
      return
    }
    const nextPendingAttachments = [...pendingAttachments]

    if (!user) {
      try {
        await guestSubmitMutation.mutateAsync({
          nextGuestMessages: guestMessages,
          nextPendingAttachments,
          trimmed,
        })
      } catch (error) {
        console.error(error)
      }

      return
    }

    try {
      await authenticatedSubmitMutation.mutateAsync({
        nextPendingAttachments,
        trimmed,
      })
    } catch (error) {
      console.error(error)
    }
  }, [
    authenticatedSubmitMutation,
    guestSubmitMutation,
    guestMessages,
    isLoading,
    pendingAttachments,
    user,
    value,
  ])

  return {
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
  }
}
