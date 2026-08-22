import { Router } from "express";
import prisma from "../utils/prisma.js";
import { generateOtp, hashOtp } from "../utils/otpService.js";
import { sendOtpEmail } from "../utils/emailService.js";

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
            where:{
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



export default router;