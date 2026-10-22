import jwt from "jsonwebtoken"
import prisma from "../utils/prisma.js"
import type { NextFunction, Request, Response } from "express"
import { config } from "../utils/config.js"

export async function pending2FaMiddleware(req: Request, res: Response, next: NextFunction) {
    try {

        const token = req.cookies.pendingToken

        if (!token) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        const jwtToken = jwt.verify(token, config.jwtPendingSecret)

        if(typeof jwtToken === "string" || !jwtToken.sub){
            return res.status(401).json({ message: "A valid token is required" })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: jwtToken.sub
            }
        })

        if (!user || user.tokenVersion !== jwtToken.tokenVersion) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        req.userId = jwtToken.sub
        next()

    } catch (error) {
        return res.status(401).json({ message: "A valid token is required" })
    }

}