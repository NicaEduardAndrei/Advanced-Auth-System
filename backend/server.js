import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"

import authRoutes from "./routes/auth.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.DOMAIN,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())
app.use(generalRateLimiter(60))

app.use("/api/auth", authRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
