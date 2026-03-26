"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconLogin2, IconSend2, IconUserPlus } from "@tabler/icons-react"
import { useForm } from "react-hook-form"
import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import InputLabel from "./ui/input-label"
import { Label } from "./ui/label"
import * as z from "zod/v3"
import { Spinner } from "./ui/spinner"
import Result from "./ui/result"
import { useAuth } from "./auth-provider"

interface IAuthProps {
  className?: string
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const registerSchema = loginSchema
  .extend({
    displayName: z.string().min(1, "What is your name?"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type AuthMode = "login" | "register"

type LoginFormValues = z.infer<typeof loginSchema>
type RegisterFormValues = z.infer<typeof registerSchema>

interface IModeChangeProps {
  onModeChange: (mode: AuthMode) => void
  onSuccess: () => void
}

function LoginForm({ onModeChange, onSuccess }: IModeChangeProps) {
  const [error, setError] = useState<string | null>(null)

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setError(result?.error ?? "Failed to sign in")
      return
    }

    onSuccess()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="animate-in space-y-2 duration-500 fade-in-0 slide-in-from-bottom-1"
    >
      <Result type="error" message={error} />
      <InputLabel
        placeholder="example@gmail.com"
        error={errors.email?.message}
        {...register("email")}
      >
        Email
      </InputLabel>

      <InputLabel
        placeholder="Enter your password"
        type="password"
        error={errors.password?.message}
        {...register("password")}
      >
        Password
      </InputLabel>

      <Label
        className="cursor-pointer justify-end text-right text-muted-foreground underline transition-all duration-500 hover:text-foreground"
        onClick={() => onModeChange("register")}
      >
        Have no account?
      </Label>
      <Button
        className="mt-1 w-full transition-all duration-500"
        size="lg"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Spinner /> Submitting...
          </>
        ) : (
          <>
            <IconSend2 />
            Submit authorization
          </>
        )}
      </Button>
    </form>
  )
}

function RegisterForm({ onModeChange, onSuccess }: IModeChangeProps) {
  const [error, setError] = useState<string | null>(null)

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null)

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        displayName: data.displayName,
        email: data.email,
        password: data.password,
      }),
    })
    const result = await response.json().catch(() => null)

    if (!response.ok) {
      setError(result?.error ?? "Failed to create account")
      return
    }

    onSuccess()
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="animate-in space-y-2 duration-500 fade-in-0 slide-in-from-bottom-1"
    >
      <Result type="error" message={error} />
      <InputLabel
        placeholder="How should we call you?"
        error={errors.displayName?.message}
        {...register("displayName")}
      >
        Your name
      </InputLabel>
      <InputLabel
        placeholder="example@gmail.com"
        error={errors.email?.message}
        {...register("email")}
      >
        Email
      </InputLabel>
      <InputLabel
        placeholder="Enter your password"
        type="password"
        error={errors.password?.message}
        {...register("password")}
      >
        Password
      </InputLabel>
      <InputLabel
        placeholder="Repeat password"
        type="password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      >
        Confirm password
      </InputLabel>
      <Label
        className="cursor-pointer justify-end text-right text-muted-foreground underline transition-all duration-500 hover:text-foreground"
        onClick={() => onModeChange("login")}
      >
        Already have an account?
      </Label>
      <Button
        className="mt-1 w-full transition-all duration-500"
        size="lg"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Spinner /> Creating...
          </>
        ) : (
          <>
            <IconUserPlus />
            Create account
          </>
        )}
      </Button>
    </form>
  )
}

export default function Auth({ className }: IAuthProps) {
  const [open, setOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const { isLoading, isSignedIn, refreshSession } = useAuth()

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
  }

  if (isLoading || isSignedIn) {
    return null
  }

  return (
    <div className={className}>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)

          if (nextOpen) {
            handleModeChange("login")
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2 rounded-xl px-4 py-6">
            <IconLogin2 className="size-6" />
            <p className="text-lg">Sign In</p>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {authMode === "register" ? "Register" : "Login"}
            </DialogTitle>
          </DialogHeader>
          {authMode === "register" ? (
            <RegisterForm
              onModeChange={handleModeChange}
              onSuccess={() => {
                void refreshSession()
                setOpen(false)
              }}
            />
          ) : (
            <LoginForm
              onModeChange={handleModeChange}
              onSuccess={() => {
                void refreshSession()
                setOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
