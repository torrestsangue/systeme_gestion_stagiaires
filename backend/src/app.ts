import express from "express";
import cors from "cors";
import messageRoutes from "./routes/auth.routes";

const ap = express();

// Configuration de CORS
ap.use(cors());

// --- MODIFICATIONS ICI ---
// On augmente la limite à 50mb pour accepter les images en Base64
ap.use(express.json({ limit: "50mb" }));
ap.use(express.urlencoded({ limit: "50mb", extended: true }));
// --------------------------

ap.use("/api/messages", messageRoutes);

export default ap;