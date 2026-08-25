import { Router } from "express";
import prisma from "../utils/prisma.js";
import { generateOtp, hashOtp, verifyOtp } from "../utils/otpService.js";
import { sendOtpEmail } from "../utils/emailService.js";
import bcrypt from "bcryptjs"
import { createSession, FAKE_PASSWORD_HASH, generateAccessToken, generateRefreshToken, setAccessTokenCookie, setRefreshTokenCookie } from "../utils/tokenService.js";
import { loginRateLimitPerEmail, loginRateLimitPerIp } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register/send-code", async (req, res) => {
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

        await prisma.otp.updateMany({
            where: {
                email: email,
                purpose: "EMAIL_VERIFY",
                used: false
            },
            data: {
                used: true
            }
        })

        await prisma.otp.create({
            data: {
                email: email,
                purpose: "EMAIL_VERIFY",
                tokenHash: hash,
                expiresAt: expiresAt
            }
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

        await prisma.otp.update({
            where: {
                id: otp.id
            },
            data: {
                used: true
            }
        })

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
            }
        })


        const accessToken = generateAccessToken(user)
        const refreshToken = generateRefreshToken()
        await createSession(user, refreshToken, req)
        setAccessTokenCookie(res, accessToken)
        setRefreshTokenCookie(res, refreshToken)


        return res.status(200).json({
            message: "Registration successful",
            user: {
                id: user.id,
                email: user.email
            }
        })
    } catch (error) {
        return res.status(500).json({ error })
    }
})


router.post("/login", loginRateLimitPerIp(), loginRateLimitPerEmail(), async (req, res) => {

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



export default router;