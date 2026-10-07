import { useState } from "react"
import "./LoginPage.css"
import { getMe, login } from "../../../api/auth"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"

export default function LoginPage({ setOption }) {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [message, setMessage] = useState("")

    const {setUser} = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await login(email, password)

            if(res.method){
                setMessage("")
                setError(`requires ${res.method} 2fa`)
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

    return (
        <>
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
        </>
    )
}