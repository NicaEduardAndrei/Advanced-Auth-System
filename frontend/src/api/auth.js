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