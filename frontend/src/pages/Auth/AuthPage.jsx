import { useState } from "react"


import LoginPage from "./components/LoginPage"
import SignUpPage from "./components/SignUpPage"
import "./AuthPage.css"

export default function AuthPage() {

    const [option, setOption] = useState("login")

    return (
        <div className="auth-container">
            <div className="auth-slider" style={{ transform: option === "login" ? "translateX(0)" : "translateX(-50%)" }}>
                <LoginPage option={option} setOption={setOption} />
                <SignUpPage option={option} setOption={setOption} />
            </div>
        </div>
    )
}

