import { useEffect, useState } from "react"


import LoginPage from "./components/LoginPage"
import SignUpPage from "./components/SignUpPage"
import "./AuthPage.css"
import { useAuth } from "../../context/AuthContext"
import { useNavigate } from "react-router-dom"

export default function AuthPage() {

    const [option, setOption] = useState("login")
    const { user, isLoading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!isLoading && user) {
            navigate("/home")
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, user])

    if(isLoading){
        return <div>Loading...</div>
    }

    return (
        <div className="auth-container">
            <div className="auth-slider" style={{ transform: option === "login" ? "translateX(0)" : "translateX(-50%)" }}>
                <LoginPage option={option} setOption={setOption} />
                <SignUpPage option={option} setOption={setOption} />
            </div>
        </div>
    )
}

