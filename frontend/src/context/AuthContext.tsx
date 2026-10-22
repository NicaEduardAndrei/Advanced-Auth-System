import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useEffect, useState } from "react"
import { getMe } from "../api/auth"

type User = {
    id: string
    email: string
} | null

const AuthContext = createContext<
    {
        user: User
        isLoading: boolean
        setUser: Dispatch<SetStateAction<User>>
    } | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        const getUser = async () => {
            try {
                const res = await getMe()
                setUser(res.user)
            }
            catch {
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
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider")
    }

    return context
}