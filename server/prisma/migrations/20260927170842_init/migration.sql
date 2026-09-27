-- CreateEnum
CREATE TYPE "WashType" AS ENUM ('MANUAL', 'AUTOMATIC', 'DETAILING', 'MULTI_SERVICE');

-- CreateEnum
CREATE TYPE "CurrentSystem" AS ENUM ('NOTEBOOK', 'WHATSAPP', 'EXCEL', 'EXISTING_SOFTWARE', 'NONE');

-- CreateEnum
CREATE TYPE "Interest" AS ENUM ('HOT', 'WARM', 'COLD', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "serialNo" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "whatsapp" TEXT,
    "location" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mapsLink" TEXT,
    "washType" "WashType" NOT NULL,
    "dailyVehicles" INTEGER NOT NULL,
    "currentSystem" "CurrentSystem" NOT NULL,
    "remarks" TEXT,
    "interest" "Interest" NOT NULL,
    "followUpDate" DATE,
    "followUpCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "collectedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "outcome" TEXT,
    "scheduledFor" DATE,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_serialNo_key" ON "Lead"("serialNo");

-- CreateIndex
CREATE INDEX "Lead_district_idx" ON "Lead"("district");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_interest_idx" ON "Lead"("interest");

-- CreateIndex
CREATE INDEX "Lead_followUpDate_idx" ON "Lead"("followUpDate");

-- CreateIndex
CREATE INDEX "Lead_collectedBy_idx" ON "Lead"("collectedBy");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "FollowUpNote_leadId_idx" ON "FollowUpNote"("leadId");

-- AddForeignKey
ALTER TABLE "FollowUpNote" ADD CONSTRAINT "FollowUpNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
