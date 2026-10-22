import jwt from "jsonwebtoken"
import type { NextFunction, Request, Response } from "express"
import { config } from "../utils/config.js"

export function refreshTokenMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies.refreshToken

        if (!token) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        const jwtToken = jwt.verify(token, config.jwtRefreshSecret)

        if (typeof jwtToken === "string" || !jwtToken.sub) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        req.userId = jwtToken.sub
        req.refreshToken = token
        next()

    } catch (error) {
        return res.status(401).json({ message: "A valid token is required" })
    }
}