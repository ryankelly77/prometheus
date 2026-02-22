-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SSOProvider" AS ENUM ('SAML', 'OIDC', 'AZURE_AD', 'OKTA', 'GOOGLE_WORKSPACE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'PARTNER_ADMIN', 'GROUP_ADMIN', 'LOCATION_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Daypart" AS ENUM ('BREAKFAST', 'BRUNCH', 'LUNCH', 'AFTERNOON', 'DINNER', 'LATE_NIGHT');

-- CreateEnum
CREATE TYPE "Trend" AS ENUM ('UP', 'DOWN', 'FLAT');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('EXCELLENT', 'GOOD', 'WARNING', 'DANGER');

-- CreateEnum
CREATE TYPE "ReviewPlatform" AS ENUM ('GOOGLE', 'YELP', 'TRIPADVISOR', 'FACEBOOK', 'OPENTABLE', 'RESY', 'OTHER');

-- CreateEnum
CREATE TYPE "SentimentLabel" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');

-- CreateEnum
CREATE TYPE "MentionType" AS ENUM ('FEATURE_ARTICLE', 'REVIEW', 'AWARD', 'BEST_OF_LIST', 'NEWS_MENTION', 'SOCIAL_INFLUENCER', 'TV_RADIO', 'OTHER');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('CLEAR', 'MOSTLY_CLEAR', 'PARTLY_CLOUDY', 'OVERCAST', 'FOGGY', 'LIGHT_DRIZZLE', 'DRIZZLE', 'HEAVY_DRIZZLE', 'LIGHT_RAIN', 'RAIN', 'HEAVY_RAIN', 'LIGHT_SNOW', 'SNOW', 'HEAVY_SNOW', 'SLEET', 'THUNDERSTORM', 'THUNDERSTORM_HAIL');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('SPORTS', 'CONCERT', 'THEATER', 'COMEDY', 'CONFERENCE', 'CONVENTION', 'FESTIVAL', 'HOLIDAY', 'SCHOOL_BREAK', 'SCHOOL_EVENT', 'COMMUNITY', 'FOOD_DRINK', 'PRIVATE_PARTY', 'OTHER');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('SEATGEEK', 'TICKETMASTER', 'EVENTBRITE', 'SYSTEM', 'MANUAL');

-- CreateEnum
CREATE TYPE "EventImpact" AS ENUM ('MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'MAJOR');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('FEDERAL', 'STATE', 'RELIGIOUS', 'CULTURAL', 'COMMERCIAL', 'LOCAL', 'SCHOOL');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('TOAST', 'SQUARE', 'CLOVER', 'REVEL', 'R365', 'MARGINEDGE', 'QUICKBOOKS', 'OPENTABLE', 'RESY', 'TOCK', 'YELP_RESERVATIONS', 'GOOGLE_BUSINESS', 'SPROUT_SOCIAL', 'META_BUSINESS');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'EXPIRED', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'REFRESH_FAILED', 'NEEDS_REAUTH');

-- CreateEnum
CREATE TYPE "ApiService" AS ENUM ('OPEN_METEO', 'SEATGEEK', 'TICKETMASTER', 'EVENTBRITE', 'BRIGHTLOCAL_REVIEWS', 'BRIGHTLOCAL_LOCAL', 'SEMRUSH', 'METRICOOL', 'TOAST', 'SQUARE', 'CLOVER', 'REVEL', 'R365', 'MARGINEDGE', 'QUICKBOOKS', 'OPENTABLE', 'RESY', 'TOCK', 'YELP_RESERVATIONS', 'GOOGLE_BUSINESS', 'SPROUT_SOCIAL', 'META_BUSINESS', 'CLAUDE_AI', 'PROMETHEUS_AI_VISIBILITY');

-- CreateEnum
CREATE TYPE "ServiceHealth" AS ENUM ('HEALTHY', 'DEGRADED', 'DOWN', 'RATE_LIMITED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CircuitState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateEnum
CREATE TYPE "ApiLogStatus" AS ENUM ('SUCCESS', 'ERROR', 'WARNING', 'RATE_LIMITED', 'TIMEOUT', 'AUTH_ERROR', 'VALIDATION_ERROR');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'TWITTER_X', 'LINKEDIN', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "SocialConnectionType" AS ENUM ('MANAGED', 'BYOA');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('IMAGE', 'CAROUSEL', 'VIDEO', 'REEL', 'STORY', 'LIVE', 'TEXT', 'LINK');

-- CreateEnum
CREATE TYPE "PostPerformance" AS ENUM ('TOP_PERFORMER', 'ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE', 'UNDERPERFORMING');

-- CreateEnum
CREATE TYPE "AIPromptCategory" AS ENUM ('MONTHLY_SUMMARY', 'WEEKLY_DIGEST', 'METRIC_ANALYSIS', 'TREND_DETECTION', 'ANOMALY_ALERT', 'RECOMMENDATION', 'COMPARISON', 'FORECAST', 'REVIEW_RESPONSE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InsightPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InsightSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'CAUTIONARY', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "InsightUrgency" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InsightTrigger" AS ENUM ('SCHEDULED', 'USER_REQUESTED', 'ANOMALY', 'THRESHOLD');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoIconUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#6366f1',
    "accentColor" TEXT NOT NULL DEFAULT '#8b5cf6',
    "darkMode" BOOLEAN NOT NULL DEFAULT true,
    "customDomain" TEXT,
    "domainVerified" BOOLEAN NOT NULL DEFAULT false,
    "domainVerifyToken" TEXT,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ssoProvider" "SSOProvider",
    "ssoEntityId" TEXT,
    "ssoMetadataUrl" TEXT,
    "ssoClientId" TEXT,
    "ssoClientSecret" TEXT,
    "ssoTenantId" TEXT,
    "ssoDomain" TEXT,
    "allowPublicSignup" BOOLEAN NOT NULL DEFAULT false,
    "requireSso" BOOLEAN NOT NULL DEFAULT false,
    "plan" "PlanType" NOT NULL DEFAULT 'STARTER',
    "planSeats" INTEGER NOT NULL DEFAULT 5,
    "planLocations" INTEGER NOT NULL DEFAULT 1,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantGroup" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "restaurantGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "conceptType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "ssoProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOrganization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "restaurantGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "restaurantGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "invitedByEmail" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "emailSentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SSOSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "nonce" TEXT,
    "redirectUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SSOSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaypartMetrics" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "daypart" "Daypart" NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foodSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "beverageSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "alcoholSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "beerSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "wineSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "liquorSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nonAlcoholicBevSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "covers" INTEGER NOT NULL DEFAULT 0,
    "checkCount" INTEGER NOT NULL DEFAULT 0,
    "fohLaborHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "fohLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bohLaborHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "bohLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ppa" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DaypartMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetrics" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "totalSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foodSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "beverageSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "alcoholSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "beerSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "wineSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "liquorSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "nonAlcoholicBevSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "covers" INTEGER NOT NULL DEFAULT 0,
    "checkCount" INTEGER NOT NULL DEFAULT 0,
    "reservationCovers" INTEGER NOT NULL DEFAULT 0,
    "walkInCovers" INTEGER NOT NULL DEFAULT 0,
    "noShows" INTEGER NOT NULL DEFAULT 0,
    "fohLaborHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "fohLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bohLaborHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "bohLaborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborHours" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "foodCost" DECIMAL(12,2),
    "ppa" DECIMAL(10,2),
    "laborPercent" DECIMAL(5,2),
    "weatherId" TEXT,
    "eventsContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyMetrics" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "totalSales" DECIMAL(12,2),
    "foodSales" DECIMAL(12,2),
    "beverageSales" DECIMAL(12,2),
    "alcoholSales" DECIMAL(12,2),
    "beerSales" DECIMAL(12,2),
    "wineSales" DECIMAL(12,2),
    "liquorSales" DECIMAL(12,2),
    "nonAlcoholicBevSales" DECIMAL(12,2),
    "totalCovers" INTEGER,
    "reservationCovers" INTEGER,
    "walkInCovers" INTEGER,
    "totalNoShows" INTEGER,
    "fohLaborHours" DECIMAL(10,2),
    "fohLaborCost" DECIMAL(12,2),
    "bohLaborHours" DECIMAL(10,2),
    "bohLaborCost" DECIMAL(12,2),
    "laborHours" DECIMAL(10,2),
    "laborCost" DECIMAL(12,2),
    "foodCost" DECIMAL(12,2),
    "ppa" DECIMAL(10,2),
    "primeCost" DECIMAL(5,2),
    "laborPercent" DECIMAL(5,2),
    "foodPercent" DECIMAL(5,2),
    "revPash" DECIMAL(10,2),
    "operatingDays" INTEGER,
    "targets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLoyalty" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "oneVisit" INTEGER NOT NULL DEFAULT 0,
    "twoToFourVisits" INTEGER NOT NULL DEFAULT 0,
    "fiveToNineVisits" INTEGER NOT NULL DEFAULT 0,
    "tenPlusVisits" INTEGER NOT NULL DEFAULT 0,
    "uniqueCustomers" INTEGER NOT NULL DEFAULT 0,
    "repeatRate" DECIMAL(5,2),
    "loyaltyRate" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLoyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "platform" "ReviewPlatform" NOT NULL,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT,
    "reviewerName" TEXT,
    "reviewerUrl" TEXT,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "responseText" TEXT,
    "responseDate" TIMESTAMP(3),
    "sentimentScore" DECIMAL(3,2),
    "sentimentLabel" "SentimentLabel",
    "keywords" TEXT[],
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewMetrics" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "newReviews" INTEGER NOT NULL DEFAULT 0,
    "oneStarCount" INTEGER NOT NULL DEFAULT 0,
    "twoStarCount" INTEGER NOT NULL DEFAULT 0,
    "threeStarCount" INTEGER NOT NULL DEFAULT 0,
    "fourStarCount" INTEGER NOT NULL DEFAULT 0,
    "fiveStarCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2),
    "cumulativeRating" DECIMAL(3,2),
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DECIMAL(5,2),
    "avgResponseTimeHours" INTEGER,
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "neutralCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "platformBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteVisibility" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "visibilityScore" DECIMAL(5,2),
    "organicKeywords" INTEGER,
    "organicTraffic" INTEGER,
    "localPackRankings" JSONB,
    "avgLocalRank" DECIMAL(4,1),
    "trackedKeywords" JSONB,
    "gbpImpressions" INTEGER,
    "gbpClicks" INTEGER,
    "gbpCalls" INTEGER,
    "gbpDirections" INTEGER,
    "aiVisibility" JSONB,
    "aiMentionCount" INTEGER,
    "aiPlatforms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PRMention" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "mentionDate" DATE NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "outlet" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "mentionType" "MentionType" NOT NULL,
    "reach" INTEGER,
    "sentiment" "SentimentLabel",
    "enteredById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PRMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScoreConfig" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "targets" JSONB NOT NULL,
    "metricDirections" JSONB,
    "ebitdaTarget" DECIMAL(12,2),
    "ebitdaBonusPoints" DECIMAL(5,2),
    "ebitdaPenaltyPoints" DECIMAL(5,2),
    "thresholds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthScoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthScoreHistory" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "overallScore" DECIMAL(6,2) NOT NULL,
    "metricScores" JSONB NOT NULL,
    "baseScore" DECIMAL(6,2) NOT NULL,
    "ebitdaActual" DECIMAL(12,2),
    "ebitdaAdjustment" DECIMAL(5,2),
    "previousScore" DECIMAL(6,2),
    "scoreDelta" DECIMAL(5,2),
    "trend" "Trend",
    "status" "HealthStatus" NOT NULL,
    "configSnapshot" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthScoreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherData" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tempHigh" DOUBLE PRECISION,
    "tempLow" DOUBLE PRECISION,
    "tempAvg" DOUBLE PRECISION,
    "feelsLikeHigh" DOUBLE PRECISION,
    "feelsLikeLow" DOUBLE PRECISION,
    "precipitation" DOUBLE PRECISION,
    "precipProb" DOUBLE PRECISION,
    "snowfall" DOUBLE PRECISION,
    "weatherCode" INTEGER,
    "condition" "WeatherCondition",
    "humidity" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "windGusts" DOUBLE PRECISION,
    "cloudCover" DOUBLE PRECISION,
    "uvIndex" DOUBLE PRECISION,
    "isActual" BOOLEAN NOT NULL DEFAULT false,
    "forecastedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalEvent" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "isMultiDay" BOOLEAN NOT NULL DEFAULT false,
    "endDate" DATE,
    "venueName" TEXT,
    "venueAddress" TEXT,
    "venueLat" DOUBLE PRECISION,
    "venueLng" DOUBLE PRECISION,
    "distanceMiles" DOUBLE PRECISION,
    "category" "EventCategory" NOT NULL,
    "subcategory" TEXT,
    "expectedAttendance" INTEGER,
    "venueCapacity" INTEGER,
    "popularityScore" DOUBLE PRECISION,
    "impactScore" INTEGER,
    "impactLevel" "EventImpact",
    "source" "EventSource" NOT NULL,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "fingerprint" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "enteredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "year" INTEGER,
    "name" TEXT NOT NULL,
    "type" "HolidayType" NOT NULL,
    "impactLevel" "EventImpact",
    "notes" TEXT,
    "isNational" BOOLEAN NOT NULL DEFAULT true,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenStatus" "TokenStatus",
    "tokenExpiresWarningAt" TIMESTAMP(3),
    "tokenRefreshAttempts" INTEGER NOT NULL DEFAULT 0,
    "tokenLastRefreshAt" TIMESTAMP(3),
    "tokenRefreshError" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "config" JSONB,
    "externalId" TEXT,
    "externalName" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" "SyncStatus",
    "lastSyncError" TEXT,
    "nextScheduledSync" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "connectedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationStatus" (
    "id" TEXT NOT NULL,
    "service" "ApiService" NOT NULL,
    "organizationId" TEXT,
    "status" "ServiceHealth" NOT NULL DEFAULT 'HEALTHY',
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "lastErrorCode" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "circuitState" "CircuitState" NOT NULL DEFAULT 'CLOSED',
    "circuitOpenedAt" TIMESTAMP(3),
    "circuitResetAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncDuration" INTEGER,
    "nextSyncAt" TIMESTAMP(3),
    "syncInProgress" BOOLEAN NOT NULL DEFAULT false,
    "mtdRequests" INTEGER NOT NULL DEFAULT 0,
    "mtdCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "mtdUnits" INTEGER NOT NULL DEFAULT 0,
    "costResetAt" TIMESTAMP(3),
    "rateLimitRemaining" INTEGER,
    "rateLimitResetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "service" "ApiService" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'GET',
    "organizationId" TEXT,
    "locationId" TEXT,
    "requestUrl" TEXT NOT NULL,
    "requestBody" JSONB,
    "requestHeaders" JSONB,
    "status" "ApiLogStatus" NOT NULL,
    "httpStatus" INTEGER,
    "responseBody" JSONB,
    "responseSizeBytes" INTEGER,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "errorStack" TEXT,
    "latencyMs" INTEGER,
    "cost" DECIMAL(10,6),
    "units" INTEGER,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "retryOfId" TEXT,
    "willRetry" BOOLEAN NOT NULL DEFAULT false,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountUrl" TEXT,
    "profileImageUrl" TEXT,
    "connectionType" "SocialConnectionType" NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "integrationId" TEXT,
    "managedAccountRef" TEXT,
    "followers" INTEGER,
    "following" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMetrics" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "followersStart" INTEGER,
    "followersEnd" INTEGER,
    "followersGained" INTEGER,
    "followersLost" INTEGER,
    "netFollowers" INTEGER,
    "postsPublished" INTEGER NOT NULL DEFAULT 0,
    "storiesPublished" INTEGER NOT NULL DEFAULT 0,
    "reelsPublished" INTEGER NOT NULL DEFAULT 0,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalReach" INTEGER NOT NULL DEFAULT 0,
    "totalEngagements" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "totalSaves" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DECIMAL(5,2),
    "reachRate" DECIMAL(5,2),
    "totalVideoViews" INTEGER,
    "totalWatchTime" INTEGER,
    "avgWatchTime" DECIMAL(8,2),
    "storyViews" INTEGER,
    "storyReplies" INTEGER,
    "storyExits" INTEGER,
    "profileVisits" INTEGER,
    "websiteClicks" INTEGER,
    "emailClicks" INTEGER,
    "callClicks" INTEGER,
    "directionClicks" INTEGER,
    "topPosts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "postUrl" TEXT,
    "postType" "PostType" NOT NULL,
    "caption" TEXT,
    "mediaUrls" TEXT[],
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "videoViews" INTEGER,
    "videoWatchTime" INTEGER,
    "videoCompletionRate" DECIMAL(5,2),
    "engagementRate" DECIMAL(5,2),
    "performance" "PostPerformance",
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPrompt" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "userPromptTemplate" TEXT NOT NULL,
    "category" "AIPromptCategory" NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
    "maxTokens" INTEGER NOT NULL DEFAULT 1024,
    "temperature" DECIMAL(2,1) NOT NULL DEFAULT 0.7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresPro" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "periodType" "InsightPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "inputData" JSONB NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "keyPoints" TEXT[],
    "metrics" JSONB,
    "recommendations" JSONB,
    "sentiment" "InsightSentiment",
    "urgency" "InsightUrgency",
    "triggerType" "InsightTrigger",
    "generatedById" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "feedbackRating" INTEGER,
    "feedbackNote" TEXT,
    "model" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "tokensUsed" INTEGER,
    "latencyMs" INTEGER,
    "cost" DECIMAL(10,6),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "insightsGenerated" INTEGER NOT NULL DEFAULT 0,
    "reviewResponses" INTEGER NOT NULL DEFAULT 0,
    "customQueries" INTEGER NOT NULL DEFAULT 0,
    "totalRuns" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "runsIncluded" INTEGER NOT NULL,
    "runsRemaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT,
    "page" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "RestaurantGroup_organizationId_idx" ON "RestaurantGroup"("organizationId");

-- CreateIndex
CREATE INDEX "Location_restaurantGroupId_idx" ON "Location"("restaurantGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "UserProfile_email_idx" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "UserOrganization_organizationId_idx" ON "UserOrganization"("organizationId");

-- CreateIndex
CREATE INDEX "UserOrganization_userId_idx" ON "UserOrganization"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOrganization_userId_organizationId_key" ON "UserOrganization"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_organizationId_email_key" ON "Invitation"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SSOSession_state_key" ON "SSOSession"("state");

-- CreateIndex
CREATE INDEX "SSOSession_state_idx" ON "SSOSession"("state");

-- CreateIndex
CREATE INDEX "DaypartMetrics_locationId_date_idx" ON "DaypartMetrics"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DaypartMetrics_locationId_date_daypart_key" ON "DaypartMetrics"("locationId", "date", "daypart");

-- CreateIndex
CREATE INDEX "DailyMetrics_locationId_date_idx" ON "DailyMetrics"("locationId", "date");

-- CreateIndex
CREATE INDEX "DailyMetrics_date_idx" ON "DailyMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetrics_locationId_date_key" ON "DailyMetrics"("locationId", "date");

-- CreateIndex
CREATE INDEX "MonthlyMetrics_locationId_idx" ON "MonthlyMetrics"("locationId");

-- CreateIndex
CREATE INDEX "MonthlyMetrics_month_idx" ON "MonthlyMetrics"("month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyMetrics_locationId_month_key" ON "MonthlyMetrics"("locationId", "month");

-- CreateIndex
CREATE INDEX "CustomerLoyalty_locationId_idx" ON "CustomerLoyalty"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLoyalty_locationId_month_key" ON "CustomerLoyalty"("locationId", "month");

-- CreateIndex
CREATE INDEX "Review_locationId_reviewDate_idx" ON "Review"("locationId", "reviewDate");

-- CreateIndex
CREATE INDEX "Review_locationId_platform_idx" ON "Review"("locationId", "platform");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Review_locationId_platform_externalId_key" ON "Review"("locationId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "ReviewMetrics_locationId_idx" ON "ReviewMetrics"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewMetrics_locationId_month_key" ON "ReviewMetrics"("locationId", "month");

-- CreateIndex
CREATE INDEX "WebsiteVisibility_locationId_idx" ON "WebsiteVisibility"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteVisibility_locationId_month_key" ON "WebsiteVisibility"("locationId", "month");

-- CreateIndex
CREATE INDEX "PRMention_locationId_month_idx" ON "PRMention"("locationId", "month");

-- CreateIndex
CREATE INDEX "PRMention_locationId_mentionDate_idx" ON "PRMention"("locationId", "mentionDate");

-- CreateIndex
CREATE UNIQUE INDEX "HealthScoreConfig_locationId_key" ON "HealthScoreConfig"("locationId");

-- CreateIndex
CREATE INDEX "HealthScoreHistory_locationId_idx" ON "HealthScoreHistory"("locationId");

-- CreateIndex
CREATE INDEX "HealthScoreHistory_month_idx" ON "HealthScoreHistory"("month");

-- CreateIndex
CREATE UNIQUE INDEX "HealthScoreHistory_locationId_month_key" ON "HealthScoreHistory"("locationId", "month");

-- CreateIndex
CREATE INDEX "WeatherData_locationId_date_idx" ON "WeatherData"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherData_locationId_date_key" ON "WeatherData"("locationId", "date");

-- CreateIndex
CREATE INDEX "LocalEvent_locationId_date_idx" ON "LocalEvent"("locationId", "date");

-- CreateIndex
CREATE INDEX "LocalEvent_date_idx" ON "LocalEvent"("date");

-- CreateIndex
CREATE INDEX "LocalEvent_fingerprint_idx" ON "LocalEvent"("fingerprint");

-- CreateIndex
CREATE INDEX "LocalEvent_category_idx" ON "LocalEvent"("category");

-- CreateIndex
CREATE UNIQUE INDEX "LocalEvent_locationId_source_externalId_key" ON "LocalEvent"("locationId", "source", "externalId");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "Holiday_type_idx" ON "Holiday"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_name_key" ON "Holiday"("date", "name");

-- CreateIndex
CREATE INDEX "Integration_locationId_idx" ON "Integration"("locationId");

-- CreateIndex
CREATE INDEX "Integration_type_status_idx" ON "Integration"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_locationId_type_key" ON "Integration"("locationId", "type");

-- CreateIndex
CREATE INDEX "IntegrationStatus_service_idx" ON "IntegrationStatus"("service");

-- CreateIndex
CREATE INDEX "IntegrationStatus_status_idx" ON "IntegrationStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationStatus_service_organizationId_key" ON "IntegrationStatus"("service", "organizationId");

-- CreateIndex
CREATE INDEX "ApiLog_service_createdAt_idx" ON "ApiLog"("service", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_organizationId_createdAt_idx" ON "ApiLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_locationId_createdAt_idx" ON "ApiLog"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_status_createdAt_idx" ON "ApiLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_traceId_idx" ON "ApiLog"("traceId");

-- CreateIndex
CREATE INDEX "SocialAccount_locationId_idx" ON "SocialAccount"("locationId");

-- CreateIndex
CREATE INDEX "SocialAccount_platform_idx" ON "SocialAccount"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_locationId_platform_accountId_key" ON "SocialAccount"("locationId", "platform", "accountId");

-- CreateIndex
CREATE INDEX "SocialMetrics_socialAccountId_idx" ON "SocialMetrics"("socialAccountId");

-- CreateIndex
CREATE INDEX "SocialMetrics_month_idx" ON "SocialMetrics"("month");

-- CreateIndex
CREATE UNIQUE INDEX "SocialMetrics_socialAccountId_month_key" ON "SocialMetrics"("socialAccountId", "month");

-- CreateIndex
CREATE INDEX "SocialPost_socialAccountId_publishedAt_idx" ON "SocialPost"("socialAccountId", "publishedAt");

-- CreateIndex
CREATE INDEX "SocialPost_postType_idx" ON "SocialPost"("postType");

-- CreateIndex
CREATE INDEX "SocialPost_performance_idx" ON "SocialPost"("performance");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_socialAccountId_externalId_key" ON "SocialPost"("socialAccountId", "externalId");

-- CreateIndex
CREATE INDEX "AIPrompt_organizationId_idx" ON "AIPrompt"("organizationId");

-- CreateIndex
CREATE INDEX "AIPrompt_category_idx" ON "AIPrompt"("category");

-- CreateIndex
CREATE INDEX "AIPrompt_isActive_idx" ON "AIPrompt"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AIPrompt_slug_organizationId_key" ON "AIPrompt"("slug", "organizationId");

-- CreateIndex
CREATE INDEX "AIInsight_locationId_periodStart_idx" ON "AIInsight"("locationId", "periodStart");

-- CreateIndex
CREATE INDEX "AIInsight_locationId_generatedAt_idx" ON "AIInsight"("locationId", "generatedAt");

-- CreateIndex
CREATE INDEX "AIInsight_promptId_idx" ON "AIInsight"("promptId");

-- CreateIndex
CREATE INDEX "AIInsight_isRead_isDismissed_idx" ON "AIInsight"("isRead", "isDismissed");

-- CreateIndex
CREATE INDEX "AIUsage_organizationId_idx" ON "AIUsage"("organizationId");

-- CreateIndex
CREATE INDEX "AIUsage_month_idx" ON "AIUsage"("month");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsage_organizationId_month_key" ON "AIUsage"("organizationId", "month");

-- AddForeignKey
ALTER TABLE "RestaurantGroup" ADD CONSTRAINT "RestaurantGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_restaurantGroupId_fkey" FOREIGN KEY ("restaurantGroupId") REFERENCES "RestaurantGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOrganization" ADD CONSTRAINT "UserOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SSOSession" ADD CONSTRAINT "SSOSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaypartMetrics" ADD CONSTRAINT "DaypartMetrics_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetrics" ADD CONSTRAINT "DailyMetrics_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetrics" ADD CONSTRAINT "DailyMetrics_weatherId_fkey" FOREIGN KEY ("weatherId") REFERENCES "WeatherData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyMetrics" ADD CONSTRAINT "MonthlyMetrics_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyalty" ADD CONSTRAINT "CustomerLoyalty_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMetrics" ADD CONSTRAINT "ReviewMetrics_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteVisibility" ADD CONSTRAINT "WebsiteVisibility_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PRMention" ADD CONSTRAINT "PRMention_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PRMention" ADD CONSTRAINT "PRMention_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScoreConfig" ADD CONSTRAINT "HealthScoreConfig_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthScoreHistory" ADD CONSTRAINT "HealthScoreHistory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeatherData" ADD CONSTRAINT "WeatherData_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalEvent" ADD CONSTRAINT "LocalEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalEvent" ADD CONSTRAINT "LocalEvent_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationStatus" ADD CONSTRAINT "IntegrationStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMetrics" ADD CONSTRAINT "SocialMetrics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIPrompt" ADD CONSTRAINT "AIPrompt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "AIPrompt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsage" ADD CONSTRAINT "AIUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

