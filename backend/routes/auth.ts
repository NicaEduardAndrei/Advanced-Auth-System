import { Router } from "express";
import prisma from "../utils/prisma.js";
import { generateOtp, hashOtp, verifyOtp } from "../utils/otpService.js";
import { sendOtpEmail } from "../utils/emailService.js";
import bcrypt from "bcryptjs"
import { createSession, deletePendingToken, deleteTokensCookie, FAKE_PASSWORD_HASH, generateAccessToken, generatePendingToken, generateRefreshToken, setAccessTokenCookie, setPendingTokenCookie, setRefreshTokenCookie } from "../utils/tokenService.js";
import { loginRateLimitPerEmail, loginRateLimitPerIp, sendCodeRateLimitPerIp, sendCodeRateLimitPerEmail, sendCodeCooldownLimitPerEmail, twoFactorRateLimitPerIp, twoFactorRateLimitPerId } from "../middleware/rateLimiter.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { pending2FaMiddleware } from "../middleware/pending2FaMiddleware.js";
import { refreshTokenMiddleware } from "../middleware/refreshTokenMiddleware.js";
import { generateSecret, verify, generateURI } from "otplib";
import CryptoJS from "crypto-js";
import { config } from "../utils/config.js";

const router = Router();

router.post("/register/send-code",
    sendCodeRateLimitPerIp(),
    sendCodeRateLimitPerEmail(),
    sendCodeCooldownLimitPerEmail(),
    async (req, res) => {
        const { email }: { email: string } = req.body

        if (!email) {
            return res.status(400).json({ message: "Email required!" })
        }
        const user = await prisma.user.findUnique({
            where: { email: email }
        })

        if (user) {
            return res.status(200).json({ message: "If this email is available, a verification code has been sent" })
        }

        const code = generateOtp()
        const hash = hashOtp(code)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        const { data, error: emailError } = await sendOtpEmail(email, code, "EMAIL_REGISTER_VERIFY");

        if (emailError) {
            return res.status(500).json({ message: "Email not sent. Try again!" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.otp.updateMany({
                where: {
                    email: email,
                    purpose: "EMAIL_REGISTER_VERIFY",
                    used: false
                },
                data: {
                    used: true
                }
            })

            await tx.otp.create({
                data: {
                    email: email,
                    purpose: "EMAIL_REGISTER_VERIFY",
                    tokenHash: hash,
                    expiresAt: expiresAt
                }
            })
        })

        return res.status(200).json({ message: "If this email is available, a verification code has been sent" })
    })


router.post("/register", async (req, res) => {
    const { email, password, code }: { email: string, password: string, code: string } = req.body
    let refreshToken = ""

    if (!email || !password || !code) {
        return res.status(400).json({ message: "Must provide email, password and code" })
    }

    const otp = await prisma.otp.findFirst({
        where: {
            email: email,
            purpose: "EMAIL_REGISTER_VERIFY",
            used: false,
            expiresAt: {
                gt: new Date()
            },
            attempts: {
                lt: 5
            }
        }
    })

    if (!otp) {
        return res.status(400).json({ message: "Invalid or expired code" })
    }

    if (!verifyOtp(code, otp.tokenHash)) {
        await prisma.otp.update({
            where: {
                id: otp.id
            },
            data: {
                attempts: {
                    increment: 1
                }
            }
        })

        return res.status(400).json({ message: "Invalid code" })
    }

    const alreadyRegistered = await prisma.user.findUnique({
        where: {
            email: email
        }
    })

    if (alreadyRegistered) {
        return res.status(409).json({ message: "Email already registered" })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await prisma.$transaction(async (tx) => {
        await tx.otp.update({
            where: {
                id: otp.id
            },
            data: {
                used: true
            }
        })

        const user = await tx.user.create({
            data: {
                email: email,
                password: hashedPassword,
            }
        })

        refreshToken = generateRefreshToken(user)
        await createSession(user, refreshToken, req, tx)
        return { user }
    })

    const accessToken = generateAccessToken(result.user)
    setAccessTokenCookie(res, accessToken)
    setRefreshTokenCookie(res, refreshToken)


    return res.status(200).json({
        message: "Registration successful",
        user: {
            id: result.user.id,
            email: result.user.email
        }
    })
})


router.post("/login",
    loginRateLimitPerIp(),
    loginRateLimitPerEmail(), async (req, res) => {

        const { email, password }: { email: string, password: string } = req.body

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" })
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        const passwordToCompare = user ? user.password : FAKE_PASSWORD_HASH
        const isValid = await bcrypt.compare(password, passwordToCompare)

        if (!user || !isValid) {
            return res.status(400).json({ message: "Invalid email or password" })
        }

        if (user.twoFactorMethod === "NONE") {
            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken(user)
            await createSession(user, refreshToken, req)
            setRefreshTokenCookie(res, refreshToken)
            setAccessTokenCookie(res, accessToken)

            return res.status(200).json({ message: "Login successfully" })
        }

        if (user.twoFactorMethod === "EMAIL") {
            const emailCode = generateOtp()

            const { data, error: emailError } = await sendOtpEmail(user.email, emailCode, "EMAIL_LOGIN_2FA");

            if (emailError) {
                return res.status(500).json({ message: "Email not sent. Try again!" });
            }

            await prisma.$transaction(async (tx) => {
                await tx.otp.updateMany({
                    where: {
                        userId: user.id,
                        purpose: "EMAIL_LOGIN_2FA"
                    },
                    data: {
                        used: true
                    }
                })

                await tx.otp.create({
                    data: {
                        email: user.email,
                        userId: user.id,
                        purpose: "EMAIL_LOGIN_2FA",
                        tokenHash: hashOtp(emailCode),
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                    }
                })
            })

            const pendingToken = generatePendingToken(user)
            setPendingTokenCookie(res, pendingToken)
            return res.status(200).json({ message: "2FA required", method: "email" })
        }

        if (user.twoFactorMethod === "TOTP") {

            const pendingToken = generatePendingToken(user)
            setPendingTokenCookie(res, pendingToken)

            return res.status(200).json({ message: "2FA required", method: "totp" })
        }

        const pendingToken = generatePendingToken(user)
        setPendingTokenCookie(res, pendingToken)
        return res.status(200).json({ message: "2FA required", method: "both" })
    })


router.post("/2fa/verify",
    pending2FaMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        const { method, code }: { method: "totp" | "email", code: string } = req.body

        if (!method || !code) {
            return res.status(400).json({ message: "Provide a valid method and a valid code" })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: req.userId
            }
        })

        if (!user) {
            return res.status(400).json({ message: "A valid token is required" })
        }

        if (method === "email" && (user.twoFactorMethod === "BOTH" || user.twoFactorMethod === "EMAIL")) {
            const otp = await prisma.otp.findFirst({
                where: {
                    userId: user.id,
                    purpose: "EMAIL_LOGIN_2FA",
                    used: false,
                    expiresAt: {
                        gt: new Date()
                    },
                    attempts: {
                        lt: 5
                    }
                }
            })

            if (!otp) {
                return res.status(400).json({ message: "Invalid code" })
            }

            if (!verifyOtp(code, otp.tokenHash)) {
                await prisma.otp.update({
                    where: {
                        id: otp.id
                    },
                    data: {
                        attempts: {
                            increment: 1
                        }
                    }
                })
                return res.status(400).json({ message: "Invalid code" })
            }

            await prisma.otp.updateMany({
                where: {
                    userId: user.id,
                    purpose: "EMAIL_LOGIN_2FA"
                },
                data: {
                    used: true
                }
            })

            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken(user)
            await createSession(user, refreshToken, req)
            setRefreshTokenCookie(res, refreshToken)
            setAccessTokenCookie(res, accessToken)
            deletePendingToken(res)

            return res.status(200).json({ message: "Login successfully" })
        }

        if (method === "totp" && (user.twoFactorMethod === "BOTH" || user.twoFactorMethod === "TOTP")) {
            if (!user.totpSecret) {
                return res.status(400).json({ message: "Invalid code" })
            }

            const decryptedSecret = CryptoJS.AES.decrypt(user.totpSecret, config.totpSecret).toString(CryptoJS.enc.Utf8)

            const result = await verify({ token: code, secret: decryptedSecret, epochTolerance: 30 })

            if (!result.valid) {
                return res.status(400).json({ message: "Invalid code" })
            }

            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken(user)
            await createSession(user, refreshToken, req)
            setRefreshTokenCookie(res, refreshToken)
            setAccessTokenCookie(res, accessToken)
            deletePendingToken(res)

            return res.status(200).json({ message: "Login successfully" })
        }

        return res.status(400).json({ message: "Invalid method" })
    })


router.post("/2fa/send-login-email-code",
    pending2FaMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        const userId = req.userId

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) {
            return res.status(400).json({ message: "A valid token is required" })
        }

        if (user.twoFactorMethod !== "EMAIL" && user.twoFactorMethod !== "BOTH") {
            return res.status(400).json({ message: "Email 2FA is not enabled for this account" })
        }

        const emailCode = generateOtp()
        const { data, error: emailError } = await sendOtpEmail(user.email, emailCode, "EMAIL_LOGIN_2FA");

        if (emailError) {
            return res.status(500).json({ message: "Email not sent. Try again!" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.otp.updateMany({
                where: {
                    userId: user.id,
                    purpose: "EMAIL_LOGIN_2FA"
                },
                data: {
                    used: true
                }
            })

            await tx.otp.create({
                data: {
                    email: user.email,
                    userId: user.id,
                    purpose: "EMAIL_LOGIN_2FA",
                    tokenHash: hashOtp(emailCode),
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                }
            })
        })

        return res.status(200).json({ message: "Code sent" })
    })


router.post("/refresh", refreshTokenMiddleware, async (req, res) => {

    const refreshToken = req.refreshToken
    const userId = req.userId

    if (!refreshToken) {
        return res.status(401).json({ message: "A valid refresh token is required" })
    }

    const session = await prisma.session.findFirst({
        where: {
            refreshToken: hashOtp(refreshToken),
        }
    })

    if (!session) {

        await prisma.session.updateMany({
            where: {
                userId: userId
            },
            data: {
                revoked: true
            }
        })

        return res.status(401).json({ message: "Invalid or expired refresh token" })
    }

    if (session.revoked || session.expiresAt < new Date()) {
        return res.status(401).json({ message: "Invalid or expired refresh token" })
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId
        }
    })

    if (!user) {
        return res.status(400).json({ message: "A valid token is required" })
    }

    const accessToken = generateAccessToken(user)
    const newRefreshToken = generateRefreshToken(user)

    const result = await prisma.session.updateMany({
        where: {
            refreshToken: hashOtp(refreshToken),
            revoked: false,
            expiresAt: { gt: new Date() }
        },
        data: {
            refreshToken: hashOtp(newRefreshToken),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
    })

    if (result.count === 0) {
        return res.status(401).json({ message: "Invalid or expired refresh token" })
    }


    setAccessTokenCookie(res, accessToken)
    setRefreshTokenCookie(res, newRefreshToken)

    return res.status(200).json({ message: "Token refreshed" })
})


router.post("/logout", async (req, res) => {
    const refreshToken: string = req.cookies.refreshToken

    if (!refreshToken) {
        return res.status(200).json({ message: "Logged out successfully" })
    }

    await prisma.session.updateMany({
        where: {
            refreshToken: hashOtp(refreshToken)
        },
        data: {
            revoked: true
        }
    })

    deleteTokensCookie(res)
    return res.status(200).json({ message: "Logged out successfully" })
})


router.get("/me", authMiddleware, async (req, res) => {
    const userId = req.userId
    const user = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            id: true,
            email: true
        }
    })
    return res.status(200).json({ user })
})


router.post("/password-reset/send-code",
    sendCodeRateLimitPerIp(),
    sendCodeRateLimitPerEmail(),
    sendCodeCooldownLimitPerEmail(),
    async (req, res) => {
        const { email, loggedIn }: { email: string, loggedIn: boolean } = req.body

        if (!email) {
            return res.status(400).json({ message: "Email required!" })
        }

        if (loggedIn === undefined) {
            return res.status(400).json({ message: "Log in state required!" })
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        const code = generateOtp()
        const hash = hashOtp(code)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        if (!user) {
            return res.status(200).json({ message: "If this email exists, you will receive a reset code" })
        }

        const { data, error: emailError } = await sendOtpEmail(email, code, "EMAIL_PASSWORD_RESET");

        if (emailError) {
            return res.status(500).json({ message: "Email not sent. Try again!" });
        }

        await prisma.$transaction(async (tx) => {
            await tx.otp.updateMany({
                where: {
                    email: email,
                    purpose: "EMAIL_PASSWORD_RESET",
                    used: false
                },
                data: {
                    used: true
                }
            })

            await tx.otp.create({
                data: {
                    email: email,
                    userId: user.id,
                    purpose: "EMAIL_PASSWORD_RESET",
                    tokenHash: hash,
                    expiresAt: expiresAt
                }
            })
        })

        if (loggedIn === true) {
            return res.status(200).json({ message: "Code sent!" })
        }

        return res.status(200).json({ message: "If this email exists, you will receive a reset code" })
    })


router.post("/password-reset", async (req, res) => {
    const { email, code, newPassword, destroySessions, loggedIn }: { email: string, code: string, newPassword: string, destroySessions: boolean, loggedIn: boolean } = req.body

    if (loggedIn === undefined) {
        return res.status(400).json({ message: "Must provide the log in state" })
    }

    if ((!email || !code || !newPassword) && loggedIn === false) {
        return res.status(400).json({ message: "Must provide a valid email, code and password" })
    }

    if ((!email || !code || !newPassword) && loggedIn === true) {
        return res.status(400).json({ message: "Must provide a valid code and password" })
    }

    const otp = await prisma.otp.findFirst({
        where: {
            email: email,
            purpose: "EMAIL_PASSWORD_RESET",
            used: false,
            expiresAt: {
                gt: new Date()
            },
            attempts: {
                lt: 5
            }
        }
    })
    if (!otp || !otp.userId) {
        return res.status(400).json({ message: "Invalid or expired code" })
    }

    if (!verifyOtp(code, otp.tokenHash)) {
        await prisma.otp.update({
            where: {
                id: otp.id
            },
            data: {
                attempts: {
                    increment: 1
                }
            }
        })
        return res.status(400).json({ message: "Invalid or expired code" })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.$transaction(async (tx) => {

        await tx.otp.update({
            where: {
                id: otp.id
            },
            data: {
                used: true
            }
        })

        const user = await tx.user.update({
            where: {
                email: email
            },
            data: {
                password: hashedPassword
            }
        })

        if (destroySessions === true) {
            await tx.session.updateMany({
                where: {
                    userId: user.id,
                    revoked: false
                },
                data: {
                    revoked: true
                }
            })

            await tx.user.update({
                where: {
                    id: user.id
                },
                data: {
                    tokenVersion: {
                        increment: 1
                    }
                }
            })
        }
    })


    return res.status(200).json({ message: "Password reset successfully" })
})


router.post("/2fa/enable",
    authMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        const userId = req.userId
        const { method }: { method: "totp" | "email" } = req.body

        if (!method || (method != "email" && method != "totp")) {
            return res.status(400).json({ message: "Must provide a valid method" })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) {
            return res.status(400).json({ message: "A valid token is required" })
        }


        if (method === "email") {
            if (user.twoFactorMethod === "EMAIL" || user.twoFactorMethod === "BOTH") {
                return res.status(409).json({ message: "Email 2FA already enabled" })
            }

            const emailCode = generateOtp()

            const { data, error: emailError } = await sendOtpEmail(user.email, emailCode, "EMAIL_ENABLE_2FA");

            if (emailError) {
                return res.status(500).json({ message: "Email not sent. Try again!" });
            }

            await prisma.$transaction(async (tx) => {
                await tx.otp.updateMany({
                    where: {
                        userId: user.id,
                        purpose: "EMAIL_ENABLE_2FA"
                    },
                    data: {
                        used: true
                    }
                })

                await tx.otp.create({
                    data: {
                        email: user.email,
                        userId: user.id,
                        purpose: "EMAIL_ENABLE_2FA",
                        tokenHash: hashOtp(emailCode),
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                    }
                })
            })

            return res.status(200).json({ message: "Verification code sent to your email" })
        }

        if (method === "totp") {
            if (user.twoFactorMethod === "TOTP" || user.twoFactorMethod === "BOTH") {
                return res.status(409).json({ message: "Totp 2FA already enabled" })
            }

            const secret = generateSecret()
            const encryptedSecret = CryptoJS.AES.encrypt(secret, config.totpSecret).toString()
            const URI = generateURI({
                secret,
                label: user.email,
                issuer: "Nica Andrei - Auth Project"
            })

            await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    totpSecret: encryptedSecret
                }
            })
            return res.status(200).json({ URI })
        }
    })


router.post("/2fa/confirm-2fa-totp-enable",
    authMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        const userId = req.userId
        const { code }: { code: string } = req.body

        if (!code) {
            return res.status(400).json({ message: "Invalid code" })
        }
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) {
            return res.status(400).json({ message: "A valid token is required" })
        }

        if (!user.totpSecret) {
            return res.status(400).json({ message: "Missing totp key, must request totp enable first" })
        }
        if (user.twoFactorMethod === "BOTH") {
            return res.status(409).json({ message: "Both 2FA methods already enabled" })
        }
        if (user.twoFactorMethod === "TOTP") {
            return res.status(409).json({ message: "Totp 2FA already enabled" })
        }

        const decryptedSecret = CryptoJS.AES.decrypt(user.totpSecret, config.totpSecret).toString(CryptoJS.enc.Utf8)

        const result = await verify({ token: code, secret: decryptedSecret, epochTolerance: 30 })

        if (!result.valid) {
            return res.status(400).json({ message: "Invalid code" })
        }

        if (user.twoFactorMethod === "NONE") {
            await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    twoFactorMethod: "TOTP"
                }
            })
            return res.status(200).json({ message: "Totp 2FA enabled" })
        }

        if (user.twoFactorMethod === "EMAIL") {
            await prisma.user.update({
                where: {
                    id: userId
                },
                data: {
                    twoFactorMethod: "BOTH"
                }
            })
            return res.status(200).json({ message: "Totp 2FA enabled" })
        }
    })


router.post("/2fa/confirm-2fa-email-enable",
    authMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        const { userId } = req
        const { code }: { code: string } = req.body

        if (!code) {
            return res.status(400).json({ message: "Invalid code" })
        }
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })

        if (!user) {
            return res.status(400).json({ message: "A valid token is required" })
        }


        if (user.twoFactorMethod === "BOTH") {
            return res.status(409).json({ message: "Both 2FA methods already enabled" })
        }
        if (user.twoFactorMethod === "EMAIL") {
            return res.status(409).json({ message: "Email 2FA already enabled" })
        }

        const otp = await prisma.otp.findFirst({
            where: {
                userId: user.id,
                purpose: "EMAIL_ENABLE_2FA",
                used: false,
                expiresAt: {
                    gt: new Date()
                },
                attempts: {
                    lt: 5
                }
            }
        })

        if (!otp) {
            return res.status(400).json({ message: "Invalid code" })
        }

        if (!verifyOtp(code, otp.tokenHash)) {
            await prisma.otp.update({
                where: {
                    id: otp.id
                },
                data: {
                    attempts: {
                        increment: 1
                    }
                }
            })

            return res.status(400).json({ message: "Invalid code" })
        }

        if (user.twoFactorMethod === "NONE") {

            await prisma.$transaction(async (tx) => {
                await tx.otp.updateMany({
                    where: {
                        id: otp.id,
                        purpose: "EMAIL_ENABLE_2FA"
                    },
                    data: {
                        used: true
                    }
                })

                await tx.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        twoFactorMethod: "EMAIL"
                    }
                })
            })

        }

        if (user.twoFactorMethod === "TOTP") {
            await prisma.$transaction(async (tx) => {
                await tx.otp.updateMany({
                    where: {
                        id: otp.id,
                        purpose: "EMAIL_ENABLE_2FA"
                    },
                    data: {
                        used: true
                    }
                })

                await tx.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        twoFactorMethod: "BOTH"
                    }
                })
            })
        }

        return res.status(200).json({ message: "Email 2FA enabled" })
    }
)

export default router;