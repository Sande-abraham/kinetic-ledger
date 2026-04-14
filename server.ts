import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Initiate Mobile Money Payment (STK Push)
  app.post("/api/payments/initiate", async (req, res) => {
    const { amount, phoneNumber, email, customerName, tx_ref } = req.body;

    try {
      // This is where you'd call Flutterwave's Mobile Money API
      // Documentation: https://developer.flutterwave.com/reference/charge-uganda-mobile-money
      
      /* 
      const response = await axios.post('https://api.flutterwave.com/v3/charges?type=mobile_money_uganda', {
        tx_ref,
        amount,
        currency: "UGX",
        network: "MTN", // or AIRTEL
        email,
        phone_number: phoneNumber,
        fullname: customerName,
      }, {
        headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
      });
      */

      // SIMULATION: Returning a success response that triggers the PIN prompt logic
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
      res.status(500).json({ status: "error", message: "Failed to initiate payment" });
    }
  });

  // Process Wallet Actions (Airtime, Data, Utilities, Send)
  app.post("/api/wallet/process", async (req, res) => {
    const { userId, action, amount, phone, packageId, packageName } = req.body;

    try {
      console.log(`Processing ${action} for user ${userId}: ${amount} UGX to ${phone}`);
      
      if (action === 'topup') {
        // REAL INTEGRATION LOGIC (e.g. Flutterwave)
        // In a real app, you would call:
        /*
        const response = await axios.post('https://api.flutterwave.com/v3/charges?type=mobile_money_uganda', {
          tx_ref: `TOPUP-${Date.now()}`,
          amount,
          currency: "UGX",
          network: phone.startsWith('077') || phone.startsWith('078') ? "MTN" : "AIRTEL",
          email: "customer@example.com",
          phone_number: phone,
          fullname: "Kinetic User",
        }, {
          headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
        });
        return res.json({ status: 'pending', tx_ref: response.data.data.tx_ref, message: 'Please enter PIN on your phone' });
        */

        // SIMULATION for the user request:
        const txRef = `KINETIC-MM-${Math.floor(Math.random() * 1000000)}`;
        res.json({
          status: "pending",
          txRef: txRef,
          message: "STK Push Sent! Please check your phone for the 'Enter PIN' prompt.",
          network: phone.startsWith('077') || phone.startsWith('078') ? "MTN" : "AIRTEL"
        });
      } else {
        // Other actions (Send, Airtime, etc) are processed instantly from wallet balance
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
      res.status(500).json({ status: "error", message: "Failed to process transaction" });
    }
  });

  // Check Transaction Status (Polling)
  app.get("/api/wallet/status/:txRef", async (req, res) => {
    const { txRef } = req.params;
    
    // SIMULATION: In a real app, you'd check Flutterwave/Beyonic API
    // We'll simulate a "Success" after 10 seconds of polling
    const startTime = parseInt(txRef.split('-').pop() || '0'); // Not really useful here but for logic
    
    // For demo: 70% chance it's still pending, 30% chance it's successful
    const isSuccess = Math.random() > 0.7;

    if (isSuccess) {
      res.json({ status: "success", message: "Payment confirmed!" });
    } else {
      res.json({ status: "pending", message: "Waiting for user to enter PIN..." });
    }
  });

  // Webhook for payment confirmation
  app.post("/api/payments/webhook", (req, res) => {
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    const signature = req.headers["verif-hash"];

    // In production, verify the signature
    // if (!signature || signature !== secretHash) return res.status(401).end();

    const payload = req.body;
    console.log("Payment Webhook Received:", payload);

    // Here you would update your Firestore database based on payload.status
    // if (payload.status === 'successful') { ... }

    res.status(200).end();
  });

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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
