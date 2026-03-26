"use client"

import * as React from "react"
import { Input } from "./input"
import { Label } from "./label"
import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { IconEye, IconEyeOff } from "@tabler/icons-react"

type LabelInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  children: React.ReactNode
  value?: string | undefined
  error?: string
}

const InputLabel = React.forwardRef<HTMLInputElement, LabelInputProps>(
  ({ children, className, error, type, ...props }, inputRef) => {
    const ref = useRef<HTMLDivElement>(null)

    const [showPassword, setShowPassword] = useState(false)

    const isPassword = type === "password"
    const inputType = isPassword ? (showPassword ? "text" : "password") : type

    return (
      <div>
        <Label className={cn("mb-2", className)}>{children}</Label>

        <div className="relative">
          <Input ref={inputRef} type={inputType} {...props} />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
            </button>
          )}
        </div>

        {error && (
          <div key="field-error" className="text-sm text-red-400">
            <div ref={ref}>{error}</div>
          </div>
        )}
      </div>
    )
  }
)

InputLabel.displayName = "InputLabel"

export default InputLabel
