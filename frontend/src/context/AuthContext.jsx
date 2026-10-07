import { createContext, useContext, useEffect, useState } from "react"
import { getMe } from "../api/auth"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const getUser = async () => {
            try {
                const res = await getMe()
                setUser(res.user)
            }
            catch (err) {
                setUser(null)
            }
            finally {
                setIsLoading(false)
            }
        }
        getUser()
    }, [])

    return (
        <AuthContext.Provider value={{ user, isLoading, setUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}