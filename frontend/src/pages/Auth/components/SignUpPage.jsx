import { useState } from "react"
import { register, registerEmailCode, getMe } from "../../../api/auth"
import { useAuth } from "../../../context/AuthContext"
import { useNavigate } from "react-router-dom"

import "./SignUpPage.css"

export default function SignUpPage({ setOption }) {

    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [message, setMessage] = useState("")
    const [codeSent, setCodeSent] = useState(false)

    const navigate = useNavigate()
    const {setUser} = useAuth()

    const handleSendCode = async (e) => {
        e.preventDefault()
        try {
            const res = await registerEmailCode(email)
            setError("")
            setMessage(res.message)
            setCodeSent(true)
        }
        catch (err) {
            setMessage("")
            setError(err.message)
        }

    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await register(email, password, code)
            setError("")
            setMessage(res.message)
            const me = await getMe()
            setUser(me.user)
            navigate("/home")
        }
        catch (err) {
            setMessage("")
            setError(err.message)
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="signup-container">
                <span>Sign up</span>
                <div>
                    <input className="email-input" type="email" placeholder="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="button" className="send-button" onClick={handleSendCode}>
                        Send
                    </button>
                </div>



                {!codeSent && <span>First, enter your email. After you press “Send code”, we’ll send you a verification code.</span>}

                {error && <span style={{ color: "rgb(255, 0, 0)" }}>{error}</span>}
                {message && <span style={{ color: "rgb(0, 112, 0)" }}>{message}</span>}

                {codeSent &&
                    <>
                        <input placeholder="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                        <input type="password" placeholder="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        <button type="submit">
                            Sign Up
                        </button>
                    </>
                }

                <span className="go-to-login">
                    Already have an account?
                    <span onClick={() => setOption("login")}>
                        Log in!
                    </span>
                </span>
            </form>
        </>
    )
} 