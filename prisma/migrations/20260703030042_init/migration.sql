-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'WORKER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkRecord" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "leadInstallerName" TEXT NOT NULL,
    "helperName" TEXT,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "typeOfWork" TEXT NOT NULL,
    "workPerformedNotes" TEXT NOT NULL,
    "leadInstallerPay" DECIMAL(10,2) NOT NULL,
    "helperPay" DECIMAL(10,2),
    "customerSignature" TEXT NOT NULL,
    "installerSignature" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "WorkRecord_date_idx" ON "WorkRecord"("date");

-- CreateIndex
CREATE INDEX "WorkRecord_jobNumber_idx" ON "WorkRecord"("jobNumber");

-- CreateIndex
CREATE INDEX "WorkRecord_customerName_idx" ON "WorkRecord"("customerName");

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
