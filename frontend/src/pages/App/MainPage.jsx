import { useAuth } from "../../context/AuthContext"
import { logout } from "../../api/auth"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Enable2FAForm from "./components/Enable2FAForm"
import ChangePasswordForm from "./components/ChangePasswordForm"

export default function MainPage() {

  const [errorLogout, setErrorLogout] = useState("")

  const { user, setUser } = useAuth()

  const navigate = useNavigate()

  const doLogout = async () => {
    try {
      await logout()
      setErrorLogout("")
      setUser(null)
      navigate("/")
    }
    catch {
      setErrorLogout("Something went wrong. Try again!")
    }
  }


  return (
    <>
      <div>
        <p>Email: {user?.email}</p>
        <p>ID: {user?.id}</p>
      </div>

      <Enable2FAForm />
      <ChangePasswordForm />

      <div style={{ marginTop: "50px" }}>
        <button onClick={doLogout}>
          LOGOUT
        </button>
        <span>
          {errorLogout}
        </span>
      </div>
    </>
  )
}