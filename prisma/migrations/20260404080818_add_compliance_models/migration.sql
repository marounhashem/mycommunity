/*
  Warnings:

  - The `status` column on the `renovation_applications` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `issued_by` to the `violations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RenovationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('OPEN', 'PAID', 'RESOLVED');

-- AlterTable
ALTER TABLE "renovation_applications" ADD COLUMN     "contractor_name" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "manager_comment" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "RenovationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "violations" ADD COLUMN     "description" TEXT,
ADD COLUMN     "evidence_name" TEXT,
ADD COLUMN     "issued_by" TEXT NOT NULL,
ADD COLUMN     "status" "ViolationStatus" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "renovation_attachments" (
    "id" TEXT NOT NULL,
    "renovation_id" TEXT NOT NULL,
    "r2_key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,

    CONSTRAINT "renovation_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "renovation_attachments" ADD CONSTRAINT "renovation_attachments_renovation_id_fkey" FOREIGN KEY ("renovation_id") REFERENCES "renovation_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
