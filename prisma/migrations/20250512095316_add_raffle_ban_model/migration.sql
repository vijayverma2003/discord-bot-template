-- CreateTable
CREATE TABLE `RaffleBan` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `raffleId` VARCHAR(191) NOT NULL,
    `bannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RaffleBan_userId_raffleId_key`(`userId`, `raffleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
