  import { prisma } from "../lib/prisma";
  import type { Prisma } from "../../generated/prisma/client.js";
  import { isValidPhone, isWhatsAppNumber } from "./phone.services";

  interface CreateContactInput {
    name: string;
    Phone: string;
    contactListId: number;
    userId: number;
  }

  export const createContactService = async (data: CreateContactInput) => {
    const { name, Phone, contactListId, userId } = data;

    // Vérifier utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("Utilisateur introuvable.");
    }

    // 1. BLOQUER si numéro invalide
    const validPhone = isValidPhone(Phone);

    if (!validPhone) {
      throw new Error("Numéro invalide (format incorrect).");
    }

    //  2. Vérifier WhatsApp (NON BLOQUANT)
    let is_valid = false;

    try {
      is_valid = await isWhatsAppNumber(Phone);
    } catch (error) {
      console.error("Erreur vérification WhatsApp:", error);
      is_valid = false;
    }

    // 3. Enregistrer dans tous les cas (si format OK)
    const contact = await prisma.contact.create({
      data: {
        name,
        Phone,
        is_valid, // true ou false selon WhatsApp
        contactListId,
        userId,
      },
    });

    return {
      contact,
      validation: {
        validPhone: true,
        isWhatsApp: is_valid,
      },
    };
  };

  // src/services/contact.services.ts



  export async function filterContacts(
    userId: number,
    is_valid: boolean | undefined,
    date_from: string | undefined,
    date_to: string | undefined,
  ) {

    const where: Prisma.ContactWhereInput = {
      // Sécurité — uniquement les contacts de cet utilisateur
      userId: userId,

      // Filtre par validité WhatsApp
      ...(is_valid !== undefined && { is_valid }),

      // Filtre par date de création
      ...((date_from || date_to) && {
        created_at: {
          ...(date_from && { gte: new Date(date_from) }),
          ...(date_to   && { lte: new Date(new Date(date_to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };


    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        id:         true,
        name:       true,
        Phone:      true,
        is_valid:   true,
        created_at: true,
        contactList: {
          select: {
            id:   true,
            name: true,
          },
        },
      },
    });

    return contacts;
  }