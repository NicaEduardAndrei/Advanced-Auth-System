import { useState } from "react"
import "./LoginPage.css"
import { getMe, login, loginVia2FA, sendLoginEmailCode } from "../../../api/auth"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"

export default function LoginPage({ setOption }) {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [message, setMessage] = useState("")
    const [need2FA, setNeed2FA] = useState(null)
    const [fullBack, setFullBack] = useState(true)
    const [code, setCode] = useState("")

    const { setUser } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await login(email, password)

            if (res.method) {
                if(res.method === "both"){
                    setFullBack(false)
                } else {
                    setFullBack(true)
                }
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
                const res = await loginVia2FA("email", code)
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

    const handleTotpLogin = async (e) => {
        e.preventDefault()
        try {
            const res = await loginVia2FA("totp", code)
            const me = await getMe()
            setError("")
            setMessage(res.message)
            setUser(me.user)
            navigate("/home")

        } catch (err) {
            setMessage("")
            setError(err.message)
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


            {need2FA === "both" && <>
                <div className="login-container">
                    <span>
                        Choose 2FA option
                    </span>
                    <button onClick={() => {
                        setNeed2FA("email")
                        emailMethods.sendCode()
                    }}>
                        Email
                    </button>
                    <button onClick={() => {
                        setNeed2FA("totp")
                    }}>
                        Authentification app
                    </button>
                    <button style={{ width: "50px" }} type="button" onClick={() => { setNeed2FA(null), setFullBack(true), setError(""), setMessage("") }}>BACK</button>
                </div>
            </>}


            {need2FA === "email" && <>
                <form onSubmit={emailMethods.handleEmail2FALogin} className="login-container">
                    <span style={{ fontSize: "15px" }}>
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
                    <button style={{ width: "50px" }} type="button" onClick={() => { 
                        if(fullBack=== true){
                            setNeed2FA(null)
                        } else{
                            setNeed2FA("both")
                        }
                        setError("")
                        setMessage("") 
                        
                        }}>BACK</button>
                </form>
            </>}




            {need2FA === "totp" && <>
                <form onSubmit={handleTotpLogin} className="login-container">
                    <span style={{ fontSize: "15px" }}>
                        Enter the code from your Authentificator app
                    </span>
                    <input placeholder="CODE"
                        value={code}
                        onChange={(e) => { setCode(e.target.value) }}
                    />
                    <span style={{ color: "rgb(255, 0, 0)" }}>{error}</span>
                    <span style={{ color: "rgb(0, 112, 0)" }}>{message}</span>
                    <button type="submit">
                        Login
                    </button>
                    <button style={{ width: "50px" }} type="button" onClick={() => { 
                        if(fullBack=== true){
                            setNeed2FA(null)
                        } else{
                            setNeed2FA("both")
                        }
                        setError("")
                        setMessage("") 
                        
                        }}>BACK</button>
                </form>

            </>}





        </>
    )
}