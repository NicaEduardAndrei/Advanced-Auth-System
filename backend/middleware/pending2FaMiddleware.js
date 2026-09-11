import jwt from "jsonwebtoken"
import prisma from "../utils/prisma.js"

export async function pending2FaMiddleware(req, res, next) {
    try {

        const token = req.cookies.pendingToken

        if (!token) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        const jwtToken = jwt.verify(token, process.env.JWT_PENDING_SECRET)

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