import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
  children: ReactNode
  size?: "large"
}

export default function Container({
  className,
  children,
  size,
  ...props
}: ContainerProps) {
  return (
    <div
      {...props}
      className={cn(
        "mx-auto w-full max-w-4xl",
        size === "large" && "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  )
}
