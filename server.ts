import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Read Firebase Config file safely from workspace root
  let firebaseConfig = {};
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (err) {
    console.error("Failed to read firebase config file in server.ts:", err);
  }

  // Initialize Firebase App in server-side
  let db: any = null;
  try {
    if (Object.keys(firebaseConfig).length > 0) {
      const firebaseApp = initializeApp(firebaseConfig);
      db = getFirestore(firebaseApp);
      console.log("Firebase initialized successfully on server-side.");
    }
  } catch (err) {
    console.error("Failed to initialize Firebase on server-side:", err);
  }

  // Allow JSON requests
  app.use(express.json());

  // Manually enable CORS for API endpoints
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // API Endpoint: Expose live assets for external website integration
  app.get("/api/assets", async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ 
          error: "Firebase database not initialized on server-side.",
          solution: "Please check your firebase-applet-config.json setup."
        });
      }

      const assetsCol = collection(db, "assets");
      const snapshot = await getDocs(assetsCol);
      
      const assetsList: any[] = [];
      snapshot.forEach((doc) => {
        assetsList.push({ id: doc.id, ...doc.data() });
      });

      // Sort assets by createdAt (newest first)
      assetsList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      res.status(200).json({
        success: true,
        projectName: "PS SUSTAIN PRODUCTS",
        total: assetsList.length,
        assets: assetsList
      });
    } catch (error: any) {
      console.error("Error fetching assets on server-side API:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Internal server error" 
      });
    }
  });

  // Vite development vs production asset serving middleware
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
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`CORS-enabled assets API available at http://0.0.0.0:${PORT}/api/assets`);
  });
}

startServer();
