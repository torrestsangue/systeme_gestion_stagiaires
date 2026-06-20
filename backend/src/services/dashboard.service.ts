import { prisma } from "../lib/prisma.js";

export async function getDashboardStats(userId: number) {

  const now           = new Date();
  const debutCeMois   = new Date(now.getFullYear(), now.getMonth(), 1);
  const debutMoisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const finMoisPrec   = new Date(now.getFullYear(), now.getMonth(), 0);
  const il7Jours      = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── 1. Messages envoyés ce mois ──────────────────────────────────────────
  const [messagesCeMois, messagesMoisPrec] = await Promise.all([
    prisma.message.count({
      where: { userId, sent_at: { gte: debutCeMois } }
    }),
    prisma.message.count({
      where: { userId, sent_at: { gte: debutMoisPrec, lte: finMoisPrec } }
    }),
  ]);

  // ── 2. Messages livrés ce mois ───────────────────────────────────────────
  const [livresCeMois, livresMoisPrec] = await Promise.all([
    prisma.message.count({
      where: { userId, status: "DELIVERED", sent_at: { gte: debutCeMois } }
    }),
    prisma.message.count({
      where: { userId, status: "DELIVERED", sent_at: { gte: debutMoisPrec, lte: finMoisPrec } }
    }),
  ]);

  // ── 3. Contacts actifs — TOUS les contacts valides pas seulement ce mois ─
  const [contactsActifs, contactsMoisPrec] = await Promise.all([
    prisma.contact.count({
      where: { userId } // ← sans filtre de date pour le total
    }),
    prisma.contact.count({
      where: { userId, created_at: { gte: debutMoisPrec, lte: finMoisPrec } }
    }),
  ]);

  // ── 4. Taux d'échec ──────────────────────────────────────────────────────
  const [echouesCeMois, totalCeMois] = await Promise.all([
    prisma.message.count({
      where: { userId, status: "FAILED", sent_at: { gte: debutCeMois } }
    }),
    prisma.message.count({
      where: { userId, sent_at: { gte: debutCeMois } }
    }),
  ]);

    // ── 5. Graphe — Semaine en cours (du Lundi au Dimanche) ──────────────────
  
  // Calcul du début de la semaine actuelle (Lundi)
  const debutSemaine = new Date(now);
  const jourActuel = now.getDay(); // 0 pour Dimanche, 1 pour Lundi...
  const diff = now.getDate() - jourActuel + (jourActuel === 0 ? -6 : 1); // Ajuste pour obtenir le Lundi
  debutSemaine.setDate(diff);
  debutSemaine.setHours(0, 0, 0, 0);

  const messagesParJour = await prisma.message.groupBy({
    by:      ["sent_at"],
    where:   { userId, sent_at: { gte: debutSemaine } }, // Récupère tout depuis Lundi
    _count:  { id: true },
    orderBy: { sent_at: "asc" },
  });

  const joursLabel = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  
  // On génère 7 jours à partir du Lundi de cette semaine
  const grapheData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(debutSemaine);
    date.setDate(debutSemaine.getDate() + i);
    
    const label = joursLabel[date.getDay()];
    
    // Comparaison précise par date (ignore l'heure pour le matching)
    const total = messagesParJour
      .filter(m => new Date(m.sent_at).toLocaleDateString() === date.toLocaleDateString())
      .reduce((sum, m) => sum + m._count.id, 0);

    return { jour: label, total };
  });

  // ── 6. Messages récents — filtrés par userId ─────────────────────────────
  const messagesRecents = await prisma.message.findMany({
    where:   { userId }, // ← userId toujours présent
    orderBy: { sent_at: "desc" },
    take:    5,
    select: {
      id:      true,
      to:      true,
      content: true,
      status:  true,
      sent_at: true,
      type:    true,
    },
  });

  // ── Calcul des pourcentages ───────────────────────────────────────────────
  const calcPct = (actuel: number, precedent: number) => {
    if (precedent === 0) return actuel > 0 ? 100 : 0;
    return Math.round(((actuel - precedent) / precedent) * 100);
  };

  const tauxEchec = totalCeMois > 0
    ? Math.round((echouesCeMois / totalCeMois) * 100 * 10) / 10
    : 0;

  return {
    messagesEnvoyes: {
      total:       messagesCeMois,
      pourcentage: calcPct(messagesCeMois, messagesMoisPrec),
    },
    messagesLivres: {
      total:       livresCeMois,
      pourcentage: calcPct(livresCeMois, livresMoisPrec),
    },
    contactsActifs: {
      total:       contactsActifs,
      pourcentage: calcPct(contactsActifs, contactsMoisPrec),
    },
    tauxEchec: {
      valeur:      tauxEchec,
      pourcentage: calcPct(echouesCeMois, totalCeMois > 0 ? totalCeMois : 0),
    },
    grapheSemaine:   grapheData,
    messagesRecents,
  };
}