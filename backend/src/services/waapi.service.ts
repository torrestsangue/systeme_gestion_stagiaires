  import axios from "axios";
  import env from "../config/env";

  // Vérification au démarrage
  if (!env.WAAPI_INSTANCE_ID || env.WAAPI_INSTANCE_ID === "ton_instance_id") {
    console.warn("⚠️  WAAPI_INSTANCE_ID non configuré — les routes WhatsApp ne fonctionneront pas.");
  }
  // Client Axios WaAPI
  const waapiClient = axios.create({
    baseURL: env.WAAPI_BASE_URL,
    headers: {
      Authorization: `Bearer ${env.WAAPI_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  // Interceptor logs
  waapiClient.interceptors.response.use(
    (res) => res,
    (err) => {
      console.error("WaAPI ERROR:", err.response?.data || err.message);
      return Promise.reject(err);
    }
  );

  // ─── Message texte ──────────────────────────────────────────────────────────
  export const sendTextMessage = async (phone: string, message: string) => {
    const res = await waapiClient.post(
      `/instances/${env.WAAPI_INSTANCE_ID}/client/action/send-message`,
      {
        chatId: `${phone}@c.us`,
        message,
      }
    );
    return res.data;
  };

  // ─── Message média ──────────────────────────────────────────────────────────
  export const sendMediaMessage = async (
    phone: string,
    mediaUrl: string,
    caption: string,
    type: "image" | "video" | "audio" | "document"
  ) => {
    const res = await waapiClient.post(
      `/instances/${env.WAAPI_INSTANCE_ID}/client/action/send-media`,
      {
        chatId: `${phone}@c.us`,
        mediaUrl,
        caption,
        type,
      }
    );
    return res.data;
  };