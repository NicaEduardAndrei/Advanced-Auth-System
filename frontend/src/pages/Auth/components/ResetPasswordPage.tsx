import { SetStateAction, useState, Dispatch, SyntheticEvent } from "react"
import "./ResetPasswordPage.css"
import { resetPassword, sendPasswordResetCode } from "../../../api/auth"

type ResetPasswordPageProps = {
    setOption : Dispatch<SetStateAction<"login" | "signup" | "resetPassword">> 
}

export default function ResetPasswordPage({ setOption }: ResetPasswordPageProps) {

    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [done, setDone] = useState(false)

    const [error, setError] = useState("")
    const [message, setMessage] = useState("")

    const sendCode = async () => {
        try {
            const res = await sendPasswordResetCode(email, false)
            setError("")
            setMessage(res.message)
        } catch (err) {
            setMessage("")
            setError(err instanceof Error ? err.message : "Unknown error")
        }
    }

    const handleSubmit = async (e : SyntheticEvent) => {
        e.preventDefault()
        try {
            const res = await resetPassword(email, code, newPassword, true, false)
            setDone(true)
            setError("")
            setMessage(res.message)
        } catch (err) {
            setMessage("")
            setError(err instanceof Error ? err.message : "Unknown error")
        }
    }

    return (
        <>
            {done ? <>
                <div className="reset-password-container">
                    <p>{message}</p>
                    <button onClick={()=>{setOption("login")}}>Back to log in</button>
                </div>
            </> : <>

                <form onSubmit={handleSubmit} className="reset-password-container">
                    <span>Reset password</span>
                    <div>
                        <input type="email" placeholder="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                            required
                        />
                        <button type="button" onClick={sendCode}>send code</button>
                    </div>
                    <input placeholder="code" required
                        value={code}
                        onChange={(e) => { setCode(e.target.value) }}
                    />
                    <input placeholder="new password" type="password" required
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value) }}
                    />
                    <span style={{ color: "rgb(255, 0, 0)" }}>{error}</span>
                    <span style={{ color: "rgb(0, 112, 0)" }}>{message}</span>
                    <button type="submit">
                        Reset password
                    </button>
                    <span className="go-to-login">
                        Go back to
                        <span onClick={() => setOption("login")}>
                            Log in
                        </span>
                    </span>
                </form>
            </>}


        </>
    )
}