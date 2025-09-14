import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import orderRoutes from "./routes/orderRoutes";
import customerRoutes from "./routes/customerRoutes";
import segmentRoutes from "./routes/segmentRoutes";
import campaignRoutes from "./routes/campaignRoutes"
import aiRoute from "./routes/aiRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import { MessageConsumer } from "./services/consumer";


dotenv.config();
connectDB();

const app = express();

const consumer = new MessageConsumer();
consumer.start();

process.on('SIGINT', () => {
  console.log('Shutting down consumer...');
  consumer.stop();
  process.exit(0);
});

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));


app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/segments", segmentRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/ai", aiRoute);
app.use("/api/dashboard", dashboardRoutes)


app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});



export default app;