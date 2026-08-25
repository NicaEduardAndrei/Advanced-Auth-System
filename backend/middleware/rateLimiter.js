import rateLimit from "express-rate-limit"


export function loginRateLimitPerIp(){
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        max : 15,
        message: "Too many login attempts. Please try again in a few minutes",
    })
}


export function loginRateLimitPerEmail(){
    return rateLimit({
        windowMs: 15 * 60 * 1000,
        max : 5,
        message: "Too many login attempts. Please try again in a few minutes",
        keyGenerator: (req, res)=>{
            return req.body.email
        }
    })
}