import { useState } from "react"
import "./LoginPage.css"
import { getMe, login, loginViaEmail, sendLoginEmailCode } from "../../../api/auth"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"

export default function LoginPage({ setOption }) {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [message, setMessage] = useState("")
    const [need2FA, setNeed2FA] = useState(null)
    const [code, setCode] = useState("")

    const { setUser } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await login(email, password)

            if (res.method) {
                setNeed2FA(res.method)
            } else {
                setError("")
                setMessage(res.message)

                const me = await getMe()
                setUser(me.user)
                navigate("/home")
            }
        }
        catch (err) {
            setMessage("")
            setError(err.message)
        }
    }

    const emailMethods = {
        handleEmail2FALogin: async (e) => {
            e.preventDefault()
            try {
                const res = await loginViaEmail(need2FA, code)
                const me = await getMe()
                setUser(me.user)
                setMessage(res.message)
                setError("")
                navigate("/home")
            }
            catch (err) {
                setMessage("")
                setError(err.message)
            }
        },

        sendCode: async () => {
            try {
                const res = await sendLoginEmailCode()
                setMessage(res.message)
                setError("")
            } catch (err) {
                setMessage("")
                setError(err.message)
            }
        }
    }



    return (
        <>
            {!need2FA && <>
                <form onSubmit={handleSubmit} className="login-container">
                    <span>Log in</span>
                    <input type="email" placeholder="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)} />
                    <input type="password" placeholder="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <span style={{ color: "rgb(255, 0, 0)" }}>{error}</span>
                    <span style={{ color: "rgb(0, 112, 0)" }}>{message}</span>
                    <button type="submit">
                        Log in
                    </button>
                    <span className="go-to-signup">
                        You dont have an account?
                        <span onClick={() => setOption("signup")}>
                            Sign up!
                        </span>
                    </span>
                </form>
            </>}




            {need2FA === "email" && <>
                <form onSubmit={emailMethods.handleEmail2FALogin} className="login-container">
                    <span>
                        Enter the code received on your email address
                    </span>
                    <input
                        placeholder="CODE"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                    <span style={{ color: "rgb(255, 0, 0)" }}>{error}</span>
                    <span style={{ color: "rgb(0, 112, 0)" }}>{message}</span>
                    <div>
                        <button type="button" onClick={emailMethods.sendCode}>
                            Resend Code
                        </button>
                        <button type="submit">
                            Login
                        </button>
                    </div>
                </form>
            </>}





        </>
    )
}