-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN_RH', 'TUTEUR', 'STAGIAIRE') NOT NULL DEFAULT 'STAGIAIRE',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Stagiaire` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `numeroDossier` VARCHAR(191) NOT NULL,
    `domaine` VARCHAR(191) NOT NULL,
    `dateDebut` DATETIME(3) NOT NULL,
    `dateFin` DATETIME(3) NOT NULL,
    `tuteurId` VARCHAR(191) NULL,
    `cvUrl` VARCHAR(191) NULL,
    `motivationUrl` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Stagiaire_userId_key`(`userId`),
    UNIQUE INDEX `Stagiaire_numeroDossier_key`(`numeroDossier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inscription` (
    `id` VARCHAR(191) NOT NULL,
    `numeroDossier` VARCHAR(191) NOT NULL,
    `nom` VARCHAR(191) NOT NULL,
    `prenom` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NULL,
    `domaine` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `cvUrl` VARCHAR(191) NULL,
    `motivationUrl` VARCHAR(191) NULL,
    `status` ENUM('RECUE', 'EN_EXAMEN', 'ACCEPTEE', 'REFUSEE') NOT NULL DEFAULT 'RECUE',
    `commentaire` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Inscription_numeroDossier_key`(`numeroDossier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tache` (
    `id` VARCHAR(191) NOT NULL,
    `titre` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `statut` ENUM('A_FAIRE', 'EN_COURS', 'EN_REVISION', 'TERMINEE') NOT NULL DEFAULT 'A_FAIRE',
    `priorite` ENUM('BASSE', 'MOYENNE', 'HAUTE', 'URGENTE') NOT NULL DEFAULT 'MOYENNE',
    `deadline` DATETIME(3) NULL,
    `stagiaireId` VARCHAR(191) NOT NULL,
    `createurId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rapport` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activites` VARCHAR(191) NOT NULL,
    `difficultes` VARCHAR(191) NULL,
    `apprentissages` VARCHAR(191) NULL,
    `valide` BOOLEAN NOT NULL DEFAULT false,
    `commentaire` VARCHAR(191) NULL,
    `validateurId` VARCHAR(191) NULL,
    `stagiaireId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PresenceSession` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PresenceSession_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Presence` (
    `id` VARCHAR(191) NOT NULL,
    `stagiaireId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `statut` ENUM('PRESENT', 'RETARD', 'ABSENT', 'TELETRAVAIL') NOT NULL DEFAULT 'PRESENT',
    `ip` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Paiement` (
    `id` VARCHAR(191) NOT NULL,
    `stagiaireId` VARCHAR(191) NOT NULL,
    `montant` DOUBLE NOT NULL,
    `devise` VARCHAR(191) NOT NULL DEFAULT 'EUR',
    `statut` ENUM('PLANIFIE', 'EN_ATTENTE', 'PAYE', 'LITIGE') NOT NULL DEFAULT 'PLANIFIE',
    `datePrevue` DATETIME(3) NOT NULL,
    `datePaiement` DATETIME(3) NULL,
    `reference` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Evaluation` (
    `id` VARCHAR(191) NOT NULL,
    `stagiaireId` VARCHAR(191) NOT NULL,
    `evaluateurId` VARCHAR(191) NOT NULL,
    `ponctualite` DOUBLE NOT NULL,
    `rapports` DOUBLE NOT NULL,
    `taches` DOUBLE NOT NULL,
    `competences` DOUBLE NOT NULL,
    `comportement` DOUBLE NOT NULL,
    `noteFinale` DOUBLE NOT NULL,
    `mention` VARCHAR(191) NOT NULL,
    `commentaire` VARCHAR(191) NULL,
    `attestationUrl` VARCHAR(191) NULL,
    `attestationToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Evaluation_stagiaireId_key`(`stagiaireId`),
    UNIQUE INDEX `Evaluation_attestationToken_key`(`attestationToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `cible` VARCHAR(191) NULL,
    `details` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Stagiaire` ADD CONSTRAINT `Stagiaire_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tache` ADD CONSTRAINT `Tache_stagiaireId_fkey` FOREIGN KEY (`stagiaireId`) REFERENCES `Stagiaire`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tache` ADD CONSTRAINT `Tache_createurId_fkey` FOREIGN KEY (`createurId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rapport` ADD CONSTRAINT `Rapport_validateurId_fkey` FOREIGN KEY (`validateurId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rapport` ADD CONSTRAINT `Rapport_stagiaireId_fkey` FOREIGN KEY (`stagiaireId`) REFERENCES `Stagiaire`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Presence` ADD CONSTRAINT `Presence_stagiaireId_fkey` FOREIGN KEY (`stagiaireId`) REFERENCES `Stagiaire`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Presence` ADD CONSTRAINT `Presence_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `PresenceSession`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paiement` ADD CONSTRAINT `Paiement_stagiaireId_fkey` FOREIGN KEY (`stagiaireId`) REFERENCES `Stagiaire`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_stagiaireId_fkey` FOREIGN KEY (`stagiaireId`) REFERENCES `Stagiaire`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Evaluation` ADD CONSTRAINT `Evaluation_evaluateurId_fkey` FOREIGN KEY (`evaluateurId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
