import backendAPI from "./client";

type MessageResponse = {
    message: string
}

type LoginResponse = {
    message: string
    method?: "email" | "totp" | "both"
}

type RegisterResponse = {
    message: string
    user?: {
        id: string
        email: string
    }
}

type GetMeResponse = {
    user: {
        id: string
        email: string
    }
}

type RequestEnable2FAResponse = {
    URI: string
    message?: string
}


export const login = (email: string, password: string): Promise<LoginResponse> => {
    return backendAPI.post('/api/auth/login', { email, password }) as Promise<LoginResponse>
}

export const registerEmailCode = (email: string): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/register/send-code", { email }) as Promise<MessageResponse>
}

export const register = (email: string, password: string, code: string): Promise<RegisterResponse> => {
    return backendAPI.post("/api/auth/register", { email, password, code }) as Promise<RegisterResponse>
}

export const logout = (): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/logout") as Promise<MessageResponse>
}

export const getMe = (): Promise<GetMeResponse> => {
    return backendAPI.get('/api/auth/me') as Promise<GetMeResponse>
}

export const sendLoginEmailCode = (): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/2fa/send-login-email-code") as Promise<MessageResponse>
}

export const loginVia2FA = (method: "email" | "totp", code: string): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/2fa/verify", { method, code }) as Promise<MessageResponse>
}

export const requestEnable2FA = (method: "email" | "totp"): Promise<RequestEnable2FAResponse> => {
    return backendAPI.post("/api/auth/2fa/enable", { method }) as Promise<RequestEnable2FAResponse>
}

export const enableEmail2FA = (code: string): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/2fa/confirm-2fa-email-enable", { code }) as Promise<MessageResponse>
}

export const enableTotp2FA = (code: string): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/2fa/confirm-2fa-totp-enable", { code }) as Promise<MessageResponse>
}

export const sendPasswordResetCode = (email: string, loggedIn: boolean): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/password-reset/send-code", { email, loggedIn }) as Promise<MessageResponse>
}

export const resetPassword = (email: string, code: string, newPassword: string, destroySessions: boolean, loggedIn: boolean): Promise<MessageResponse> => {
    return backendAPI.post("/api/auth/password-reset", { email, code, newPassword, destroySessions, loggedIn }) as Promise<MessageResponse>
}