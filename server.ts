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
    return res
      .status(400)
      .json({ status: "error", message: "Phone number is required" });
  }

  try {
    console.log(`Initiating payment of ${amount} for ${phoneNumber}`);

    res.json({
      status: "success",
      message: "Charge initiated",
      data: {
        status: "pending",
        processor_response:
          "Transaction initiated. Please check your phone.",
        id: Math.floor(Math.random() * 1000000),
      },
    });
  } catch (error: any) {
    console.error("Payment initiation failed:", error.message);
    res
      .status(500)
      .json({ status: "error", message: "Failed to initiate payment" });
  }
});

// Wallet processing
app.post("/api/wallet/process", async (req, res) => {
  const { userId, action, amount, phone } = req.body;

  if (!userId) {
    return res
      .status(400)
      .json({ status: "error", message: "User ID is required" });
  }

  try {
    if (action === "topup") {
      if (!phone) {
        return res
          .status(400)
          .json({ status: "error", message: "Phone required" });
      }

      const txRef = `KINETIC-MM-${Math.floor(Math.random() * 1000000)}`;

      return res.json({
        status: "pending",
        txRef,
        message: "Check your phone for PIN prompt",
      });
    }

    await new Promise((r) => setTimeout(r, 1000));

    res.json({
      status: "success",
      message: "Processed successfully",
      data: {
        transactionId: `TXN-${Math.floor(Math.random() * 10000000)}`,
      },
    });
  } catch (error: any) {
    console.error("Wallet error:", error.message);
    res
      .status(500)
      .json({ status: "error", message: "Transaction failed" });
  }
});

// Status check
app.get("/api/wallet/status/:txRef", (req, res) => {
  const success = Math.random() > 0.7;

  if (success) {
    res.json({ status: "success", message: "Payment confirmed!" });
  } else {
    res.json({ status: "pending", message: "Waiting for PIN..." });
  }
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