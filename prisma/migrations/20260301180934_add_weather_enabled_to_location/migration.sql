-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "weatherEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weatherEnabledAt" TIMESTAMP(3);
