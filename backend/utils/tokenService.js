import jwt from "jsonwebtoken"
import crypto from "crypto"
import prisma from "./prisma"
import { hashOtp } from "./otpService"

export function generateAccessToken(user) {

    const token = jwt.sign(
        { sub: user.id },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "15m" }
    )
    return token
}


export function generateRefreshToken() {
    const refreshToken = crypto.randomBytes(40).toString("hex")
    return refreshToken
}


export async function createSession(userId, refreshToken, req) {
    const hashedRefreshToken = hashOtp(refreshToken)
    const ip = req.ip
    const userAgent = req.headers["user-agent"]
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const session = await prisma.session.create({
        data: {
            userId: userId,
            refreshToken: hashedRefreshToken,
            userAgent: userAgent,
            ip: ip,
            expiresAt: expiresAt
        }
    })

    return session
}


export function setRefreshTokenCookie(res, refreshToken){
    res.cookie("refreshToken" , refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
}