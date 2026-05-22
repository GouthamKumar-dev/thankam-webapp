-- CreateEnum
CREATE TYPE "QuotationSource" AS ENUM ('ADMIN', 'CUSTOMER_PORTAL');

-- CreateEnum
CREATE TYPE "CustomerRequestStatus" AS ENUM ('NEW', 'OTP_VERIFIED', 'CONTACTED', 'QUOTED', 'CONVERTED', 'CLOSED_REJECTED');

-- AlterTable
ALTER TABLE "Quotation"
ADD COLUMN "source" "QuotationSource" NOT NULL DEFAULT 'ADMIN',
ADD COLUMN "requestStatus" "CustomerRequestStatus",
ADD COLUMN "requestStatusUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CustomerPortalOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPortalOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quotation_source_requestStatus_idx" ON "Quotation"("source", "requestStatus");

-- CreateIndex
CREATE INDEX "CustomerPortalOtp_phone_createdAt_idx" ON "CustomerPortalOtp"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerPortalOtp_expiresAt_idx" ON "CustomerPortalOtp"("expiresAt");
