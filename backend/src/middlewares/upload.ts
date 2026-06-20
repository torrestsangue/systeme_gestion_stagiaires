import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import path from "path";

// stockage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // On garde le nom original (nettoyé) ou un unique name avec l'extension
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// filtre CSV et IMAGES
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // On autorise le CSV (existant) ET les types mime d'images courants
  const allowedMimetypes = ["text/csv", "image/jpeg", "image/png", "image/webp", "image/gif"];

  if (allowedMimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers CSV et les images (JPG, PNG, WebP) sont autorisés"));
  }
};

// export
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite à 5Mo par fichier pour éviter de saturer le serveur
  },
});