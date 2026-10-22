import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"

import authRoutes from "./routes/auth.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { config } from "./utils/config.js"

const app = express();


app.use(cors({
  origin: config.domain,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())
app.use(generalRateLimiter(60))

app.use("/api/auth", authRoutes)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
})
