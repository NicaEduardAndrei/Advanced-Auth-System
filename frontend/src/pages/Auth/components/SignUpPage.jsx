import "./SignUpPage.css"

export default function SignUpPage({ setOption }) {
    return (
        <>
            <div className="signup-container">
                <span>Sign up</span>
                <div>
                    <input className="email-input" type="email" placeholder="email"></input>
                    <button className="send-button">
                        Send
                    </button>
                </div>
                <input placeholder="code"/>
                <input type="password" placeholder="password"/>
                <div></div>
                <button>
                    Sign Up
                </button>
                <span className="go-to-login">
                    Already have an account? 
                    <span onClick={() => setOption("login")}>
                    Log in!
                </span>
                </span>
            </div>
        </>
    )
} 