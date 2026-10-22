import type { NextFunction, Request, Response } from "express"

interface HttpError extends Error {
    status?: number
    statusCode?: number
    expose?: boolean
}

export function errorHandler(err: HttpError, req: Request, res: Response, next: NextFunction) {
    console.error(err)

    if (res.headersSent === true) {
        return next(err)
    }

    const status = err.status || err.statusCode || 500
    const message = err.expose ? err.message : "Internal server error"
    res.status(status).json({ message })
}