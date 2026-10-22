import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthContext"
import { ReactNode } from "react"

export default function ProtectedRoute({ children } : {children: ReactNode}) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <p>Loading...</p>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}