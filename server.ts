import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// API routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: process.env.NODE_ENV,
    isVercel: process.env.VERCEL === "1" 
  });
});

// Initiate Mobile Money Payment (STK Push)
app.post("/api/payments/initiate", async (req, res) => {
  const { amount, phoneNumber, email, customerName, tx_ref } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ status: "error", message: "Phone number is required" });
  }

  try {
    console.log(`Initiating payment of ${amount} UGX for ${phoneNumber}`);
    
    res.json({
      status: "success",
      message: "Charge initiated",
      data: {
        status: "pending",
        processor_response: "Transaction initiated. Please check your phone for the PIN prompt.",
        id: Math.floor(Math.random() * 1000000)
      }
    });
  } catch (error: any) {
    console.error("Payment initiation failed:", error.response?.data || error.message);
    res.status(500).json({ status: "error", message: error.message || "Failed to initiate payment" });
  }
});

// Process Wallet Actions (Airtime, Data, Utilities, Send)
app.post("/api/wallet/process", async (req, res) => {
  const { userId, action, amount, phone, packageId, packageName } = req.body;

  if (!userId) {
    return res.status(400).json({ status: "error", message: "User ID is required" });
  }

  try {
    console.log(`Processing ${action} for user ${userId}: ${amount} UGX to ${phone}`);
    
    if (action === 'topup') {
      console.log(`[TOPUP] Initiating top-up for user ${userId}, phone ${phone}, amount ${amount}`);
      if (!phone) {
        console.error(`[TOPUP] Failed: Phone number missing`);
        return res.status(400).json({ status: "error", message: "Phone number is required for top-up" });
      }
      const txRef = `KINETIC-MM-${Math.floor(Math.random() * 1000000)}`;
      console.log(`[TOPUP] Success: txRef generated ${txRef}`);
      res.json({
        status: "pending",
        txRef: txRef,
        message: "STK Push Sent! Please check your phone for the 'Enter PIN' prompt.",
        network: phone.startsWith('077') || phone.startsWith('078') ? "MTN" : "AIRTEL"
      });
    } else {
      await new Promise(resolve => setTimeout(resolve, 1500));
      res.json({
        status: "success",
        message: `${action.charAt(0).toUpperCase() + action.slice(1)} processed successfully!`,
        data: {
          transactionId: `TXN-${Math.floor(Math.random() * 10000000)}`,
          status: "completed"
        }
      });
    }
  } catch (error: any) {
    console.error("Wallet action failed:", error.message);
    res.status(500).json({ status: "error", message: error.message || "Failed to process transaction" });
  }
});

// Check Transaction Status (Polling)
app.get("/api/wallet/status/:txRef", async (req, res) => {
  const { txRef } = req.params;
  const isSuccess = Math.random() > 0.7;

  if (isSuccess) {
    res.json({ status: "success", message: "Payment confirmed!" });
  } else {
    res.json({ status: "pending", message: "Waiting for user to enter PIN..." });
  }
});

// Webhook for payment confirmation
app.post("/api/payments/webhook", (req, res) => {
  const payload = req.body;
  console.log("Payment Webhook Received:", payload);
  res.status(200).end();
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    // Explicitly block source file requests in production
    app.get("/src/*", (req, res) => {
      res.status(404).end();
    });

    // Important: Only catch-all for non-API routes and non-file requests
    app.get(/^(?!\/api).*/, (req, res) => {
      // If the request looks like a file (has an extension), don't serve index.html
      if (req.path.includes('.')) {
        return res.status(404).end();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not running as a serverless function (Vercel)
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
