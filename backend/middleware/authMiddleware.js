import jwt from "jsonwebtoken"
import prisma from "../utils/prisma.js"

export async function authMiddleware(req, res, next) {
    try {

        const token = req.cookies.accessToken
        if (!token) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        const jwtToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

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