import backendAPI from "./client";

export const login = (email, password) => {
    return backendAPI.post('/api/auth/login', { email, password })
}

export const registerEmailCode = (email) => {
    return backendAPI.post("/api/auth/register/send-code", { email })
}

export const register = (email, password, code) => {
    return backendAPI.post("/api/auth/register", { email, password, code })
}

export const logout = () => {
    return backendAPI.post("/api/auth/logout")
}

export const getMe = () => {
    return backendAPI.get('/api/auth/me')
}

export const sendLoginEmailCode = () => {
    return backendAPI.post("/api/auth/2fa/send-login-email-code")
}

export const loginVia2FA = (method, code) => {
    return backendAPI.post("/api/auth/2fa/verify", { method, code })
}