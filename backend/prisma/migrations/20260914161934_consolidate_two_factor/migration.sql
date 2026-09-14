/*
  Warnings:

  - You are about to drop the column `is2FAEnabled` on the `User` table. All the data in the column will be lost.
  - The `twoFactorMethod` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TwoFactorMethod" AS ENUM ('NONE', 'EMAIL', 'TOTP', 'BOTH');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "is2FAEnabled",
DROP COLUMN "twoFactorMethod",
ADD COLUMN     "twoFactorMethod" "TwoFactorMethod" NOT NULL DEFAULT 'NONE';
