  import { parsePhoneNumberFromString } from "libphonenumber-js";
  import axios from "axios";

  //  1. Vérifier format numéro
  export const isValidPhone = (phone: string): boolean => {
    try {
      const phoneNumber = parsePhoneNumberFromString(phone);
      return phoneNumber ? phoneNumber.isValid() : false;
    } catch {
      return false;
    }
  };

  //  Nettoyer numéro (important pour Meta API)
  const formatPhoneForWhatsApp = (phone: string): string => {
    return phone.replace("+", "").replace(/\s/g, "");
  };

  //  2. Vérifier WhatsApp (VERSION PROPRE)
  export const isWhatsAppNumber = async (phone: string): Promise<boolean> => {
    try {
      //  Vérifier variables d’environnement
      if (!process.env.PHONE_NUMBER_ID || !process.env.WHATSAPP_TOKEN) {
        console.error(" Variables WhatsApp manquantes dans .env");
        return false;
      }

      const formattedPhone = formatPhoneForWhatsApp(phone);

      //  Appel API Meta
      await axios.post(
        `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: formattedPhone,
          type: "text",

          //  message neutre (évite spam visible)
          text: { body: "." },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      return true; // numéro WhatsApp valide
    } catch (error: any) {
      const err = error.response?.data;

      console.error(" WhatsApp check:", err || error.message);

      // 🔍 Gestion intelligente des erreurs Meta
      if (err?.error?.code === 131047) {
        // numéro pas sur WhatsApp
        return false;
      }

      if (err?.error?.code === 131051) {
        // numéro invalide
        return false;
      }

      // ⚠️ autre erreur (token, réseau, etc.)
      return false;
    }
  };