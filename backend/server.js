import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"

import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
