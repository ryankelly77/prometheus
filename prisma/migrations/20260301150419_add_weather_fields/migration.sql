-- AlterTable
ALTER TABLE "WeatherData" ADD COLUMN     "isExtremeCold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isExtremeHeat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRainy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSevereWeather" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precipitationHours" INTEGER,
ADD COLUMN     "rainInches" DOUBLE PRECISION,
ADD COLUMN     "weatherDescription" TEXT,
ADD COLUMN     "windSpeedMax" DOUBLE PRECISION;
