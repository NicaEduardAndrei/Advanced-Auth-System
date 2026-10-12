import { useAuth } from "../../context/AuthContext"
import { logout, resetPassword, sendPasswordResetCode } from "../../api/auth"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { QRCodeSVG } from 'qrcode.react'
import { requestEnable2FA, enableEmail2FA, enableTotp2FA } from "../../api/auth"

export default function MainPage() {

  const [URI, setURI] = useState("")
  const [secret, setSecret] = useState("")

  const [emailCode, setEmailCode] = useState("")
  const [totpCode, setTotpCode] = useState("")

  const [passwordCode, setPasswordCode] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const [destroySessions, setDestroySessions] = useState(false)

  const [errorEmail2FA, setErrorEmail2FA] = useState("")
  const [messageEmail2FA, setMessageEmail2FA] = useState("")
  const [errorTotp2FA, setErrorTotp2FA] = useState("")
  const [messageTotp2FA, setMessageTotp2FA] = useState("")
  const [errorLogout, setErrorLogout] = useState("")
  const [messageResetPassword, setMessageResetPassword] = useState("")
  const [errorResetPassword, setErrorResetPassword] = useState("")

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

  const enable2FA = async (method) => {
    try {
      const res = await requestEnable2FA(method)
      if (method === "email") {
        setErrorEmail2FA("")
        setMessageEmail2FA(res.message)
      } else {
        setErrorTotp2FA("")
        setMessageTotp2FA("Scan the code below or put the code in your auth app")
        setURI(res.URI)
        setSecret(new URLSearchParams(res.URI.split('?')[1]).get('secret'))
      }
    }
    catch (err) {
      if (method === "email") {
        setMessageEmail2FA("")
        setErrorEmail2FA(err.message)
      } else {
        setMessageTotp2FA("")
        setErrorTotp2FA(err.message)
      }

    }
  }

  const confirm2FA = async (method, code) => {
    try {
      if (method === "email") {
        const res = await enableEmail2FA(code)
        setErrorEmail2FA("")
        setMessageEmail2FA(res.message)
      } else if (method === "totp") {
        const res = await enableTotp2FA(code)
        setErrorTotp2FA("")
        setMessageTotp2FA(res.message)
      }
    } catch (err) {
      if (method === "email") {
        setMessageEmail2FA("")
        setErrorEmail2FA(err.message)
      } else if (method === "totp") {
        setMessageTotp2FA("")
        setErrorTotp2FA(err.message)
      }
    }
  }

  const sendResetCode = async () => {
    try {
      const res = await sendPasswordResetCode(user.email, "true")
      setErrorResetPassword("")
      setMessageResetPassword(res.message)
    } catch (err) {
      setMessageResetPassword("")
      setErrorResetPassword(err.message)
    }

  }

  const passwordReset = async () => {
    try {
      const res = await resetPassword(user.email, passwordCode, newPassword, destroySessions, "true")
      setErrorResetPassword("")
      setMessageResetPassword(res.message)
      if (destroySessions === true) {
        setUser(null)
        navigate("/")
      }
    } catch (err) {
      setMessageResetPassword("")
      setErrorResetPassword(err.message)
    }
  }

  return (
    <>
      <div>
        <p>Email: {user?.email}</p>
        <p>ID: {user?.id}</p>
      </div>






      <div style={{ backgroundColor: "lightskyblue", width: "300px", padding: "30px" }}>
        <div>
          <span>
            Enable 2FA:
          </span>
          <p>
            Enable email 2FA
            <button style={{ marginLeft: "10px" }} onClick={() => { enable2FA("email") }}>Enable</button>
          </p>
          <p style={{ color: "rgb(255, 0, 0)" }}>{errorEmail2FA}</p>
          <p style={{ color: "rgb(0, 112, 0)" }}>{messageEmail2FA}</p>
          <input placeholder="EMAIL - CODE"
            value={emailCode}
            onChange={(e) => { setEmailCode(e.target.value) }}
          />
          <button onClick={() => { confirm2FA("email", emailCode) }}>Confirm</button>
        </div>





        <div style={{ marginTop: "50px" }}>
          <p>
            Enable authentification app 2FA
            <button style={{ marginLeft: "10px" }} onClick={() => { enable2FA("totp") }}>Enable</button>
          </p>
          <p style={{ color: "rgb(255, 0, 0)" }}>{errorTotp2FA}</p>
          <p style={{ color: "rgb(0, 112, 0)", fontSize: "14px" }}>{messageTotp2FA}</p>
          <input placeholder="TOTP - CODE"
            value={totpCode}
            onChange={(e) => { setTotpCode(e.target.value) }}
          />
          <button onClick={() => { confirm2FA("totp", totpCode) }}>Confirm</button>
          {URI ? <>
            <QRCodeSVG value={URI} size={100} style={{ marginLeft: "90px", marginTop: "15px" }} />
            <p style={{ fontSize: "15px" }}>{secret}</p>
          </> :
            <>
              <QRCodeSVG size={100} style={{ marginLeft: "90px", marginTop: "15px", filter: "blur(4px)" }} />
            </>}
        </div>
      </div>






      <div>
        <p>Password reset: </p>
        <div style={{ marginBottom: "10px" }}>
          <button onClick={sendResetCode}>Send code</button>
          <input placeholder="enter the code from email"
            value={passwordCode}
            onChange={(e) => { setPasswordCode(e.target.value) }}
          />
        </div>
        <div>

          <span>Logout everywhere?</span>
          <input type="checkbox" checked={destroySessions}
            value={destroySessions}
            onChange={() => { setDestroySessions(!destroySessions) }}
          />
        </div>
        <input placeholder="new password" type="password"
          value={newPassword}
          onChange={(e) => { setNewPassword(e.target.value) }}
        />
        <button onClick={passwordReset}>Confirm password change</button>
        <p style={{ color: "rgb(255, 0, 0)" }}>{errorResetPassword}</p>
        <p style={{ color: "rgb(0, 112, 0)", fontSize: "14px" }}>{messageResetPassword}</p>
      </div>





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