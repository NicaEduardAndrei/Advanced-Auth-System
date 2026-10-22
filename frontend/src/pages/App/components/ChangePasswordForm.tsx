import { resetPassword, sendPasswordResetCode } from "../../../api/auth"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"


export default function ChangePasswordForm() {

    const { user, setUser } = useAuth()

    const navigate = useNavigate()

    const [passwordCode, setPasswordCode] = useState("")
    const [newPassword, setNewPassword] = useState("")

    const [destroySessions, setDestroySessions] = useState(false)

    const [messageResetPassword, setMessageResetPassword] = useState("")
    const [errorResetPassword, setErrorResetPassword] = useState("")


    const sendResetCode = async () => {
        try {
            if (user) {
                const res = await sendPasswordResetCode(user.email, true)
                setErrorResetPassword("")
                setMessageResetPassword(res.message)
            }
        } catch (err) {
            setMessageResetPassword("")
            setErrorResetPassword(err instanceof Error ? err.message : "Unknown error")
        }

    }

    const passwordReset = async () => {
        try {
            if (user) {
                const res = await resetPassword(user.email, passwordCode, newPassword, destroySessions, true)
                setErrorResetPassword("")
                setMessageResetPassword(res.message)
                if (destroySessions === true) {
                    setUser(null)
                    navigate("/")
                }
            }
        } catch (err) {
            setMessageResetPassword("")
            setErrorResetPassword(err instanceof Error ? err.message : "Unknown error")
        }
    }

    return (
        <>
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
        </>
    )
}