import { useAuth } from "../../context/AuthContext"
import { logout } from "../../api/auth"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function MainPage() {

  const [error, setError] = useState("")
  const { user , setUser } = useAuth()

  const navigate = useNavigate()

  const doLogout = async () =>{
    try{
      await logout()
      setError("")
      setUser(null)
      navigate("/")
    }
    catch {
      setError("Something went wrong. Try again!")
    }
  }

  return (
    <>
    <div>
      <p>Email: {user?.email}</p>
      <p>ID: {user?.id}</p>
    </div>

    <div>
      <button onClick={doLogout}>
        LOGOUT
      </button>
      <span>
        {error}
      </span>
    </div>
    </>
  )
}