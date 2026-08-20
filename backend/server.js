import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import authMiddleware from "./middleware/authMiddleware.js"

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth",authMiddleware, authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
