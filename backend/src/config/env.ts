import dotenv from "dotenv";
dotenv.config();

const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),

  DB_HOST: process.env.DATABASE_HOST || "localhost",
  DB_PORT: parseInt(process.env.DATABASE_PORT || "3306", 10),
  DB_NAME: process.env.DATABASE_NAME || "",
  DB_USER: process.env.DATABASE_USER || "",
  DB_PASSWORD: process.env.DATABASE_PASSWORD || "",

  JWT_SECRET: process.env.JWT_SECRET || "",

  //  WAAPI
  WAAPI_TOKEN: process.env.WAAPI_TOKEN || "",
  WAAPI_BASE_URL: process.env.WAAPI_BASE_URL || "",
  WAAPI_INSTANCE_ID: process.env.WAAPI_INSTANCE_ID || "",
};

if (!env.JWT_SECRET) throw new Error("JWT_SECRET manquant");
if (!env.WAAPI_TOKEN) throw new Error("WAAPI_TOKEN manquant");

export default env;