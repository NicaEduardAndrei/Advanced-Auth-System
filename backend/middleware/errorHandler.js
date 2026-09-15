export function errorHandler(err, req, res, next) {
    console.error(err)

    if (res.headersSent === true) {
        return next(err)
    }

    const status = err.status || err.statusCode || 500
    const message = err.expose ? err.message : "Internal server error"
    res.status(status).json({ message })
}