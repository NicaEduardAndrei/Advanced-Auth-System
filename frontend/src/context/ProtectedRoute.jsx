import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthContext"

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <p>Loading...</p>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}