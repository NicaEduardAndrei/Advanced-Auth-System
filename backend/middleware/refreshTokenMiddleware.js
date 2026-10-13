import jwt from "jsonwebtoken"


export function refreshTokenMiddleware(req, res, next) {
    try {
        const token = req.cookies.refreshToken

        if (!token) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        const jwtToken = jwt.verify(token, process.env.JWT_REFRESH_SECRET)

        if (!jwtToken.sub) {
            return res.status(401).json({ message: "A valid token is required" })
        }

        req.userId = jwtToken.sub
        req.refreshToken = token
        next()

    } catch (error) {
        return res.status(401).json({ message: "A valid token is required" })
    }
}