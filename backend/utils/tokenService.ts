import jwt from "jsonwebtoken"
import prisma from "./prisma.js"
import { hashOtp } from "./otpService.js"
import type { Request, Response } from "express";
import type { Prisma, User } from "@prisma/client";
import { config } from "./config.js";


export const FAKE_PASSWORD_HASH = "$2b$12$8u8Yp7qfV9mHq3yTg2a0uO1aCjV8qf8iYp8xFfV3ZrYgE.4m7t1gVx0t"

export function generateAccessToken(user: User) {

    const token = jwt.sign(
        { sub: user.id, tokenVersion: user.tokenVersion },
        config.jwtAccessSecret,
        { expiresIn: "15m" }
    )
    return token
}

export function generatePendingToken(user: User) {
    const token = jwt.sign(
        { sub: user.id, tokenVersion: user.tokenVersion },
        config.jwtPendingSecret,
        { expiresIn: "5m" }
    )
    return token
}


export function generateRefreshToken(user: User) {
    const token = jwt.sign(
        { sub: user.id },
        config.jwtRefreshSecret,
        { expiresIn: "7d" }
    )
    return token
}


export async function createSession(user: User, refreshToken: string, req: Request, tx?: Prisma.TransactionClient) {
    const hashedRefreshToken = hashOtp(refreshToken)
    const ip = req.ip
    const userAgent = req.headers["user-agent"]
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const db = tx || prisma

    const session = await db.session.create({
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


export function setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
}


export function setPendingTokenCookie(res: Response, pendingToken: string) {
    res.cookie("pendingToken", pendingToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 5 * 60 * 1000
    })
}


export function setAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60 * 1000
    })
}


export function deleteTokensCookie(res: Response) {
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

    res.clearCookie("pendingToken", {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    })
}


export function deletePendingToken(res: Response) {
    res.clearCookie("pendingToken", {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
    })
}