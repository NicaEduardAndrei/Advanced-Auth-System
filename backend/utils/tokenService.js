import jwt from "jsonwebtoken"
import crypto from "crypto"
import prisma from "./prisma.js"
import { hashOtp } from "./otpService.js"

export const FAKE_PASSWORD_HASH = "$2b$12$8u8Yp7qfV9mHq3yTg2a0uO1aCjV8qf8iYp8xFfV3ZrYgE.4m7t1gVx0t"

export function generateAccessToken(user) {

    const token = jwt.sign(
        { sub: user.id , tokenVersion: user.tokenVersion},
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    )
    return token
}


export function generateRefreshToken() {
    const refreshToken = crypto.randomBytes(40).toString("hex")
    return refreshToken
}


export async function createSession(user, refreshToken, req) {
    const hashedRefreshToken = hashOtp(refreshToken)
    const ip = req.ip
    const userAgent = req.headers["user-agent"]
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const session = await prisma.session.create({
        data: {
            userId: user.id,
            refreshToken: hashedRefreshToken,
            userAgent: userAgent,
            ip: ip,
            expiresAt: expiresAt
        }
    })

    return session
}


export function setRefreshTokenCookie(res, refreshToken) {
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
}


export function setAccessTokenCookie(res, accessToken) {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60 * 1000
    })
}


export function deleteTokensCookie(res) {
    res.clearCookie("accessToken", {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    })

    res.clearCookie("refreshToken", {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    })
}