import { Router } from "express";
import prisma from "../utils/prisma.js";
import { generateOtp, hashOtp, verifyOtp } from "../utils/otpService.js";
import { sendOtpEmail } from "../utils/emailService.js";
import bcrypt from "bcryptjs"
import { createSession, deleteTokensCookie, FAKE_PASSWORD_HASH, generateAccessToken, generateRefreshToken, setAccessTokenCookie, setRefreshTokenCookie } from "../utils/tokenService.js";
import { loginRateLimitPerEmail, loginRateLimitPerIp, sendCodeRateLimitPerIp, sendCodeRateLimitPerEmail, sendCodeCooldownLimitPerEmail, twoFactorRateLimitPerIp, twoFactorRateLimitPerId } from "../middleware/rateLimiter.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { generateSecret, verify, generateURI } from "otplib";
import CryptoJS from "crypto-js";

const router = Router();

router.post("/register/send-code",
    sendCodeRateLimitPerIp(),
    sendCodeRateLimitPerEmail(),
    sendCodeCooldownLimitPerEmail(),
    async (req, res) => {
        try {
            const { email } = req.body

            if (!email) {
                return res.status(400).json({ message: "Email required!" })
            }
            const user = await prisma.user.findUnique({
                where: { email: email }
            })

            if (user) {
                return res.status(400).json({ message: "This email is already registered!" })
            }

            const code = generateOtp()
            const hash = hashOtp(code)
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

            const { data, error: emailError } = await sendOtpEmail(email, code, "EMAIL_VERIFY");

            if (emailError) {
                return res.status(500).json({ message: "Email not sent. Try again!" });
            }

            await prisma.$transaction(async (tx) => {
                await tx.otp.updateMany({
                    where: {
                        email: email,
                        purpose: "EMAIL_VERIFY",
                        used: false
                    },
                    data: {
                        used: true
                    }
                })

                await tx.otp.create({
                    data: {
                        email: email,
                        purpose: "EMAIL_VERIFY",
                        tokenHash: hash,
                        expiresAt: expiresAt
                    }
                })
            })

            return res.status(200).json({ message: "Code sent succesfully" })

        } catch (error) {
            return res.status(500).json({ error })
        }
    })


router.post("/register", async (req, res) => {
    try {
        const { email, password, code } = req.body

        if (!email || !password || !code) {
            return res.status(400).json({ message: "Must provide email, password and code" })
        }

        const alreadyRegistered = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (alreadyRegistered) {
            return res.status(400).json({ message: "Already registered" })
        }

        const otp = await prisma.otp.findFirst({
            where: {
                email: email,
                purpose: "EMAIL_VERIFY",
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

        const hashedPassword = await bcrypt.hash(password, 12)
        const refreshToken = generateRefreshToken()

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
    } catch (error) {
        return res.status(500).json({ error })
    }
})


router.post("/login",
    loginRateLimitPerIp(),
    loginRateLimitPerEmail(), async (req, res) => {

        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ message: "Email and password is required" })
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

            const accessToken = generateAccessToken(user)
            const refreshToken = generateRefreshToken()
            await createSession(user, refreshToken, req)
            setRefreshTokenCookie(res, refreshToken)
            setAccessTokenCookie(res, accessToken)

            return res.status(200).json({ message: "Login succesfully" })

        } catch (error) {
            return res.status(500).json({ error })
        }
    })


router.post("/refresh", async (req, res) => {

    try {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) {
            return res.status(401).json({ message: "Must provide a refreshToken" })
        }

        const session = await prisma.session.findFirst({
            where: {
                refreshToken: hashOtp(refreshToken),
                revoked: false,
                expiresAt: {
                    gt: new Date()
                }
            }
        })

        if (!session) {
            return res.status(401).json({ message: "Must provide a refreshToken" })
        }

        const user = await prisma.user.findUnique({
            where: {
                id: session.userId
            }
        })

        const accessToken = generateAccessToken(user)
        const newRefreshToken = generateRefreshToken()

        await prisma.session.update({
            where: {
                refreshToken: hashOtp(refreshToken)
            },
            data: {
                refreshToken: hashOtp(newRefreshToken),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

        setAccessTokenCookie(res, accessToken)
        setRefreshTokenCookie(res, newRefreshToken)

        return res.status(200).json({ message: "Token refreshed" })
    } catch (error) {
        return res.status(500).json({ error })
    }

})


router.post("/logout", async (req, res) => {
    try {

        const refreshToken = req.cookies.refreshToken

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


    } catch (error) {
        return res.status(500).json({ error })
    }
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
        try {
            const { email } = req.body

            if (!email) {
                return res.status(400).json({ message: "Email required!" })
            }

            const code = generateOtp()
            const hash = hashOtp(code)
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

            const { data, error: emailError } = await sendOtpEmail(email, code, "PASSWORD_RESET");

            if (emailError) {
                return res.status(500).json({ message: "Email not sent. Try again!" });
            }

            await prisma.$transaction(async (tx) => {
                await tx.otp.updateMany({
                    where: {
                        email: email,
                        purpose: "PASSWORD_RESET",
                        used: false
                    },
                    data: {
                        used: true
                    }
                })

                await tx.otp.create({
                    data: {
                        email: email,
                        purpose: "PASSWORD_RESET",
                        tokenHash: hash,
                        expiresAt: expiresAt
                    }
                })
            })

            return res.status(200).json({ message: "If this email exists, you will receive a reset code" })

        } catch (error) {
            return res.status(500).json({ error })
        }
    })


router.post("/password-reset", async (req, res) => {
    try {
        const { email, code, newPassword, destroySessions } = req.body
        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: "Must provide a valid email, code and password" })
        }

        const otp = await prisma.otp.findFirst({
            where: {
                email: email,
                purpose: "PASSWORD_RESET",
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

    } catch (error) {
        console.error("Password reset error:", error)
        return res.status(500).json({ error })
    }
})


router.post("/2fa/enable",
    authMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        try {
            const userId = req.userId
            const { method } = req.body

            if (!method || (method != "email" && method != "totp")) {
                return res.status(400).json({ message: "Must provide a valid method" })
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (method === "email") {
                if (user.twoFactorMethod === "email" || user.twoFactorMethod === "both") {
                    return res.status(400).json({ message: "Email 2FA already enabled" })
                }

                const emailCode = generateOtp()

                const { data, error: emailError } = await sendOtpEmail(user.email, emailCode, "EMAIL_2FA");

                if (emailError) {
                    return res.status(500).json({ message: "Email not sent. Try again!" });
                }

                await prisma.$transaction(async (tx) => {
                    await tx.otp.updateMany({
                        where: {
                            userId: user.id,
                            purpose: "EMAIL_2FA"
                        },
                        data: {
                            used: true
                        }
                    })

                    await tx.otp.create({
                        data: {
                            email: user.email,
                            userId: user.id,
                            purpose: "EMAIL_2FA",
                            tokenHash: hashOtp(emailCode),
                            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                        }
                    })
                })

                return res.status(200).json({ message: "Email code in order to verify 2fa was sent to your email" })
            }

            if (method === "totp") {
                if (user.twoFactorMethod === "totp" || user.twoFactorMethod === "both") {
                    return res.status(400).json({ message: "Totp 2FA already enabled" })
                }

                const secret = generateSecret()
                const encryptedSecret = CryptoJS.AES.encrypt(secret, process.env.TOTP_SECRET).toString()
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
        } catch (error) {
            return res.status(500).json({ error })
        }
    })


router.post("/2fa/confirm-2fa-totp-enable",
    authMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        try {
            const userId = req.userId
            const { code } = req.body

            if (!code) {
                return res.status(400).json({ message: "Invalid code" })
            }
            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user.totpSecret) {
                return res.status(400).json({ message: "Missing totp key, must request totp enable first" })
            }
            if (user.twoFactorMethod === "both") {
                return res.status(400).json({ message: "Both 2FA methods already enabled" })
            }
            if (user.twoFactorMethod === "totp") {
                return res.status(400).json({ message: "Totp 2FA already enabled" })
            }

            const decryptedSecret = CryptoJS.AES.decrypt(user.totpSecret, process.env.TOTP_SECRET).toString(CryptoJS.enc.Utf8)

            const result = await verify({ token: code, secret: decryptedSecret, epochTolerance: 1 })

            if (!result.valid) {
                return res.status(400).json({ message: "Invalid code" })
            }

            if (user.twoFactorMethod === null) {
                await prisma.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        is2FAEnabled: true,
                        twoFactorMethod: "totp"
                    }
                })
                return res.status(200).json({ message: "Totp 2FA enabled" })
            }

            if (user.twoFactorMethod === "email") {
                await prisma.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        is2FAEnabled: true,
                        twoFactorMethod: "both"
                    }
                })
                return res.status(200).json({ message: "Totp 2FA enabled" })
            }

        } catch (error) {
            return res.status(500).json({ error })
        }
    })


router.post("/2fa/confirm-2fa-email-enable",
    authMiddleware,
    twoFactorRateLimitPerId(),
    twoFactorRateLimitPerIp(),
    async (req, res) => {
        try {

            const { userId } = req
            const { code } = req.body

            if (!code) {
                return res.status(400).json({ message: "Invalid code" })
            }
            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (user.twoFactorMethod === "both") {
                return res.status(400).json({ message: "Both 2FA methods already enabled" })
            }
            if (user.twoFactorMethod === "email") {
                return res.status(400).json({ message: "Email 2FA already enabled" })
            }

            const otp = await prisma.otp.findFirst({
                where: {
                    userId: user.id,
                    purpose: "EMAIL_2FA",
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

            if (otp.tokenHash !== hashOtp(code)) {
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

            if (user.twoFactorMethod === null) {

                await prisma.$transaction(async (tx) => {
                    await tx.otp.updateMany({
                        where: {
                            id: otp.id,
                            purpose: "EMAIL_2FA"
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
                            is2FAEnabled: true,
                            twoFactorMethod: "email"
                        }
                    })
                })

            }

            if (user.twoFactorMethod === "totp") {
                await prisma.$transaction(async (tx) => {
                    await tx.otp.updateMany({
                        where: {
                            id: otp.id,
                            purpose: "EMAIL_2FA"
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
                            is2FAEnabled: true,
                            twoFactorMethod: "both"
                        }
                    })
                })
            }

            return res.status(200).json({ message: "Email 2FA enabled" })

        } catch (error) {
            return res.status(500).json({ error })
        }
    }
)

export default router;