import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_CONFIG = {
  appName: process.env.APP_NAME || "ChoyJiez DELIVERY",
  tagline: process.env.APP_TAGLINE || "All What You Want",
  region: process.env.DEFAULT_REGION || "Cebu City, Philippines",
  deliveryRadiusKm: Number(process.env.DELIVERY_RADIUS_KM || 3),
  deliveryFees: {
    tier1: Number(process.env.DELIVERY_FEE_TIER_1 || 25),
    tier2: Number(process.env.DELIVERY_FEE_TIER_2 || 35),
    tier3: Number(process.env.DELIVERY_FEE_TIER_3 || 50),
  },
  firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0125944006",
  firestoreDatabaseId:
    process.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-choyjiez-fdb2715d-1f62-41f8-bdf4-44891517ae6a",
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const PUBLIC_URL =
    process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

  app.set("trust proxy", 1);
  app.use(express.json());

  // Render Health Check Endpoint
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: APP_CONFIG.appName,
      environment: process.env.NODE_ENV || "development",
      host: process.env.RENDER ? "render" : "local",
      publicUrl: PUBLIC_URL,
      firestoreDatabaseId: APP_CONFIG.firestoreDatabaseId,
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
      ),
      timestamp: new Date().toISOString(),
    });
  });

  // Safe Public Runtime Configuration Endpoint
  app.get("/api/config", (_req, res) => {
    res.json({
      ...APP_CONFIG,
      publicUrl: PUBLIC_URL,
    });
  });

  // API endpoint for Ask Choy AI assistant
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(503).json({
          error: "GEMINI_API_KEY is not configured in environment variables.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `You are "Choy AI", the friendly, helpful AI assistant for ${APP_CONFIG.appName} in ${APP_CONFIG.region}. You help customers discover delicious food, groceries, pharmacy, and mall items, explain vouchers, guide riders within the ${APP_CONFIG.deliveryRadiusKm}km delivery zone, and answer store questions warmly in English and Cebuano/Bisaya.`;

      const chatSession = ai.chats.create({
        model: "gemini-4-hydrogen",
        config: {
          systemInstruction,
        },
      });

      const response = await chatSession.sendMessage({ message });
      res.json({
        text: response.text || "Salamat sa pagpangutana! Unsay atong matabang karon?",
      });
    } catch (error: unknown) {
      console.error("Gemini API error:", error);
      const errMessage = error instanceof Error ? error.message : "Internal server error";
      res.status(500).json({ error: errMessage });
    }
  });

  // Setup Vite middleware for development or static serving for production (Render)
  const distPath = path.resolve(__dirname, "dist");
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    app.get("*", (_req, res) => {
      res.status(503).send("Build directory 'dist' not found. Run 'npm run build' first.");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`${APP_CONFIG.appName} server listening on 0.0.0.0:${PORT} (${PUBLIC_URL})`);
  });
}

startServer();
