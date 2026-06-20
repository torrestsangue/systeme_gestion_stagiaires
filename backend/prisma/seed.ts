// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin@123', 10);

  const users = [
    { email: 'admin@sgs.local',     nom: 'Admin',    prenom: 'SGS',   role: 'SUPER_ADMIN' },
    { email: 'rh@sgs.local',        nom: 'RH',       prenom: 'Marie', role: 'ADMIN_RH'   },
    { email: 'tuteur@sgs.local',    nom: 'Tuteur',   prenom: 'Jean',  role: 'TUTEUR'     },
    { email: 'stagiaire@sgs.local', nom: 'Stagiaire',prenom: 'Alima', role: 'STAGIAIRE'  },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        email:    u.email,
        password: hash,
        nom:      u.nom,
        prenom:   u.prenom,
        role:     u.role as any,
        actif:    true,
        is_verify: true,
      },
    });
    console.log(`✅ ${u.role} créé : ${u.email}`);
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });