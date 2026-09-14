/*
  Warnings:

  - Changed the type of `purpose` on the `Otp` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_REGISTER_VERIFY', 'EMAIL_ENABLE_2FA', 'EMAIL_LOGIN_2FA', 'EMAIL_PASSWORD_RESET');

-- AlterTable
ALTER TABLE "Otp" DROP COLUMN "purpose",
ADD COLUMN     "purpose" "OtpPurpose" NOT NULL;

-- CreateIndex
CREATE INDEX "Otp_email_purpose_idx" ON "Otp"("email", "purpose");
