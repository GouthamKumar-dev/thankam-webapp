-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('NOT_INITIATED', 'INITIATED', 'REJECTED', 'ACCEPTED');

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "agreementAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "agreementRejectReason" TEXT,
ADD COLUMN     "agreementStatus" "AgreementStatus" NOT NULL DEFAULT 'NOT_INITIATED',
ADD COLUMN     "agreementUpdatedAt" TIMESTAMP(3);
