import jwt from "jsonwebtoken"
import prisma from "../utils/prisma.js"
import type { NextFunction, Request, Response } from "express"
import { config } from "../utils/config.js"

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {

        const token = req.cookies.accessToken
        if (!token) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        const jwtToken = jwt.verify(token, config.jwtAccessSecret)

        if (typeof jwtToken === "string" || !jwtToken.sub) {
            return res.status(401).json({ message: "A valid token is required" })
        }
        
        const user = await prisma.user.findUnique({
            where: {
                id: jwtToken.sub
            }
        })

        if (!user || jwtToken.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({ message: "A valid token is required" })
        }
        req.userId = jwtToken.sub
        next()

    } catch (error) {
        return res.status(401).json({ message: "A valid token is required" })
    }
}