import { AuthProvider } from "@/components/auth-provider"
import QueryProvider from "@/components/query-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
