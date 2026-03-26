import { cn } from "@/lib/utils"
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"

interface IOtherButtonProps {
  onRename: () => void
  onDelete: () => void
  isDeleteDisabled?: boolean
}

export default function OtherButton({
  onRename,
  onDelete,
  isDeleteDisabled = false,
}: IOtherButtonProps) {
  return (
    <div className="relative z-10 shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 hover:scale-120 hover:bg-sidebar-foreground/8"
            )}
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <IconDots className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-44 gap-1 rounded-2xl p-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverItem onClick={onRename}>
            <IconPencil className="size-4" /> Rename
          </PopoverItem>
          <PopoverItem
            className="text-red-500 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={onDelete}
            disabled={isDeleteDisabled}
          >
            <IconTrash className="size-4" /> Delete
          </PopoverItem>
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface IPopoverItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

function PopoverItem({
  children,
  className,
  onClick,
  disabled = false,
}: IPopoverItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
