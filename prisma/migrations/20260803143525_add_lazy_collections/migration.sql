-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "date" TEXT,
    "clockIn" TEXT,
    "clockOut" TEXT,
    "status" TEXT,
    "shift" TEXT,
    "lateMinutes" DOUBLE PRECISION,
    "overtimeMinutes" DOUBLE PRECISION,
    "pinVerified" BOOLEAN,
    "note" TEXT,
    "restaurantId" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webAuthnCredentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "credentialId" TEXT,
    "publicKey" TEXT,
    "counter" DOUBLE PRECISION,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "webAuthnCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webAuthnChallenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "challenge" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "webAuthnChallenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "subscription" JSONB,
    "endpoint" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waiters" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "shift" TEXT,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "userId" TEXT,
    "email" TEXT,
    "role" TEXT,
    "registeredFromUser" BOOLEAN,
    "registrationDate" TIMESTAMP(3),

    CONSTRAINT "waiters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "categoryId" TEXT,
    "unit" TEXT,
    "minimumStock" DOUBLE PRECISION,
    "currentStock" DOUBLE PRECISION,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "quantity" DOUBLE PRECISION,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userFavorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "itemIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "userFavorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "points" DOUBLE PRECISION,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderitems" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "itemId" TEXT,
    "menuItemId" TEXT,
    "name" TEXT,
    "itemName" TEXT,
    "quantity" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "subtotal" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "orderitems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menuItems" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "price" DOUBLE PRECISION,
    "description" TEXT,
    "imageUrl" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "menuItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posorders" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "userId" TEXT,
    "email" TEXT,
    "items" JSONB,
    "total" DOUBLE PRECISION,
    "status" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "posorders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "points" DOUBLE PRECISION,
    "reward" TEXT,
    "itemId" TEXT,
    "itemName" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "podcastApplications" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "categoryId" TEXT,
    "requiredStock" JSONB,
    "message" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "podcastApplications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entenfisApplications" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "entenfisApplications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "podcastGuests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "episode" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "podcastGuests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entenfesCases" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT,
    "name" TEXT,
    "fullName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT,
    "priority" TEXT,
    "status" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "entenfesCases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_userId_idx" ON "attendance"("userId");

-- CreateIndex
CREATE INDEX "attendance_date_idx" ON "attendance"("date");

-- CreateIndex
CREATE INDEX "webAuthnCredentials_userId_idx" ON "webAuthnCredentials"("userId");

-- CreateIndex
CREATE INDEX "webAuthnCredentials_credentialId_idx" ON "webAuthnCredentials"("credentialId");

-- CreateIndex
CREATE INDEX "webAuthnChallenges_userId_idx" ON "webAuthnChallenges"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_endpoint_idx" ON "subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "stock_name_idx" ON "stock"("name");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "orderitems_orderId_idx" ON "orderitems"("orderId");

-- CreateIndex
CREATE INDEX "redemptions_userId_idx" ON "redemptions"("userId");
