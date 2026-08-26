import rateLimit from "express-rate-limit"


export function generalRateLimiter(seconds) {
    return rateLimit({
        windowMs: seconds * 1000,
        max: 100,
        message: "Too many requests. Please try again later",
    })
}


export function loginRateLimitPerIp() {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 15,
        message: "Too many login attempts. Please try again in a few minutes",
    })
}


export function loginRateLimitPerEmail() {
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        message: "Too many login attempts. Please try again in a few minutes",
        keyGenerator: (req, res) => {
            return req.body.email
        }
    })
}


export function sendCodeRateLimitPerIp() {
    return rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 5,
        message: "Too many requests. Please try again in an hour",
    })
}


export function sendCodeRateLimitPerEmail() {
    return rateLimit({
        windowMs: 60 * 60 * 1000,
        max: 3,
        message: "Too many requests. Please try again in an hour",
        keyGenerator: (req, res) => {
            return req.body.email
        }
    })
}


export function sendCodeCooldownLimitPerEmail() {
    return rateLimit({
        windowMs: 30 * 1000,
        max: 1,
        message: "Please wait 30 seconds before requesting a new code",
        keyGenerator: (req, res) => {
            return req.body.email
        }
    })
}