import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import orderRoutes from "./routes/orderRoutes";
import customerRoutes from "./routes/customerRoutes";
import segmentRoutes from "./routes/segmentRoutes";


dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));


app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/segments", segmentRoutes);



export default app;