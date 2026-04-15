import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === "POST") {
    console.log("Body:", JSON.stringify(req.body));
  }
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === "1",
  });
});

// Initiate Payment
app.post("/api/payments/initiate", async (req, res) => {
  const { amount, phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({
      status: "error",
      message: "Phone number is required",
    });
  }

  const txRef = `DEMO-${Date.now()}`;

  console.log(`Demo STK started: ${txRef}`);

  res.json({
    status: "pending",
    txRef,
    message: "STK Push sent. Please enter your PIN on your phone.",
  });
});

// Status check
const transactionStore: Record<string, number> = {};

app.get("/api/wallet/status/:txRef", (req, res) => {
  const { txRef } = req.params;

  if (!transactionStore[txRef]) {
    transactionStore[txRef] = Date.now();
  }

  const elapsed = Date.now() - transactionStore[txRef];

  if (elapsed < 5000) {
    return res.json({
      status: "pending",
      message: "Waiting for user to enter PIN...",
    });
  }

  return res.json({
    status: "success",
    message: "Payment confirmed successfully!",
  });
});

// Webhook
app.post("/api/payments/webhook", (req, res) => {
  console.log("Webhook:", req.body);
  res.status(200).end();
});

// Serve frontend (production)
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

export default app;