-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStartedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep" INTEGER,
ADD COLUMN     "onboardingSyncedMonths" INTEGER NOT NULL DEFAULT 0;
