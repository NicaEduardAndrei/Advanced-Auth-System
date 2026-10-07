import { useAuth } from "../../context/AuthContext"

export default function MainPage() {
  const { user } = useAuth()

  return (
    <div>
      <p>Email: {user?.email}</p>
      <p>ID: {user?.id}</p>
    </div>
  )
}