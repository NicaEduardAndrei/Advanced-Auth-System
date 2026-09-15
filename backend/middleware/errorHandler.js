export function errorHandler(err, req, res, next) {
    console.error(err)

    if(res.headersSent === true){
        return next(err)
    }

    const status = err.status || err.statusCode || 500
    res.status(status).json({ message: "Internal server error" })
 }
