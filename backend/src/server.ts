import express    from "express";
import cors       from "cors";
import path       from "path";
import fs         from "fs";
import swaggerUi  from "swagger-ui-express";

import authRouter        from "./routes/auth.routes";
import env               from "./config/env";
import { swaggerSpec }   from "./config/swagger";

const app = express();

/* ══════════════════════════════════════════════════════════════════════════
   DOSSIER UPLOADS — créé au démarrage si absent
══════════════════════════════════════════════════════════════════════════ */
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ══════════════════════════════════════════════════════════════════════════
   CORS
══════════════════════════════════════════════════════════════════════════ */
app.use(
  cors({
    origin: ["https://ton-site-frontend.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ══════════════════════════════════════════════════════════════════════════
   BODY PARSERS
   ⚠️  Un seul appel à express.json() avec la limite souhaitée.
       (deux appels successifs provoquent des conflits de parsing)
══════════════════════════════════════════════════════════════════════════ */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

/* ══════════════════════════════════════════════════════════════════════════
   FICHIERS STATIQUES — uploads accessibles via /uploads
   ⚠️  Un seul montage (éviter les doublons qui créent des interférences)
══════════════════════════════════════════════════════════════════════════ */
app.use("/uploads", express.static(uploadDir));

/* ══════════════════════════════════════════════════════════════════════════
   SWAGGER
══════════════════════════════════════════════════════════════════════════ */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ══════════════════════════════════════════════════════════════════════════
   ROUTES API
══════════════════════════════════════════════════════════════════════════ */
app.use("/api/auth", authRouter);

/* ══════════════════════════════════════════════════════════════════════════
   ROUTE DE SANTÉ (health check)
══════════════════════════════════════════════════════════════════════════ */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ══════════════════════════════════════════════════════════════════════════
   DÉMARRAGE
══════════════════════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅  Serveur lancé    → http://localhost:${PORT}`);
  console.log(`📁  Uploads          → http://localhost:${PORT}/uploads`);
  console.log(`📖  Documentation    → http://localhost:${PORT}/api-docs`);
});

export default app;