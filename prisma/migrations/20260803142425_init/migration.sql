-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "quantity" DOUBLE PRECISION,
    "receiverName" TEXT,
    "note" TEXT,
    "date" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_rank" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "role" TEXT,
    "employeeId" TEXT,
    "points" DOUBLE PRECISION,
    "totalPoints" DOUBLE PRECISION,
    "completedOrders" DOUBLE PRECISION,
    "totalOrders" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "lastActivity" TIMESTAMP(3),
    "lastActivityType" TEXT,
    "lastOrderId" TEXT,
    "lastOrderNumber" TEXT,
    "activityHistory" JSONB,

    CONSTRAINT "employee_rank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "message" TEXT,
    "visibility" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "reason" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3),
    "status" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standards" (
    "id" TEXT NOT NULL,
    "role" TEXT,
    "roleDisplayName" TEXT,
    "department" TEXT,
    "departmentIcon" TEXT,
    "standards" JSONB,
    "description" JSONB,
    "effectiveFrom" JSONB,
    "reviewDate" JSONB,
    "createdBy" TEXT,
    "createdByRole" TEXT,
    "isAdminCreated" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN,
    "version" DOUBLE PRECISION,
    "updatedBy" TEXT,

    CONSTRAINT "standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "price" DOUBLE PRECISION,
    "category" TEXT,
    "imageUrl" TEXT,
    "cloudinaryData" JSONB,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "quantity" DOUBLE PRECISION,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itemCategories" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "type" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "itemCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "role" TEXT,
    "position" TEXT,
    "baseSalary" DOUBLE PRECISION,
    "bankAccount" TEXT,
    "notes" TEXT,
    "status" TEXT,
    "history" JSONB,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tablearrangements" (
    "id" TEXT NOT NULL,
    "floor" TEXT,
    "restaurantId" TEXT,
    "isActive" BOOLEAN,
    "versionV" DOUBLE PRECISION,
    "availableTables" DOUBLE PRECISION,
    "cleaningTables" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "dimensions" JSONB,
    "layoutType" TEXT,
    "maintenanceTables" DOUBLE PRECISION,
    "occupiedTables" DOUBLE PRECISION,
    "reservedTables" DOUBLE PRECISION,
    "restaurantName" TEXT,
    "sections" JSONB,
    "tables" JSONB,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tablearrangements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blogs" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publishedAt" TIMESTAMP(3),
    "isActive" BOOLEAN,
    "excerpt" TEXT,
    "views" DOUBLE PRECISION,
    "uploadProgress" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "mediaType" TEXT,
    "uploadStatus" TEXT,
    "Image" TEXT,
    "completedAt" TIMESTAMP(3),
    "fileSize" DOUBLE PRECISION,
    "fileUrl" TEXT,
    "format" TEXT,
    "mimeType" TEXT,
    "originalFileName" TEXT,
    "publicId" TEXT,
    "thumbnailUrl" TEXT,

    CONSTRAINT "blogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "value" JSONB,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qrhistories" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT,
    "restaurantName" TEXT,
    "floor" TEXT,
    "tableNumber" DOUBLE PRECISION,
    "tableId" TEXT,
    "qrCode" TEXT,
    "scans" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "versionV" DOUBLE PRECISION,

    CONSTRAINT "qrhistories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitresses" (
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

    CONSTRAINT "waitresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_accepter" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "reason" JSONB,
    "accepterId" TEXT,
    "accepterName" TEXT,
    "accepterEmail" TEXT,
    "accepterRole" TEXT,
    "changeDate" TIMESTAMP(3),
    "employeeRegistration" JSONB,
    "orderDetails" JSONB,

    CONSTRAINT "delivery_accepter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prizes" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "value" DOUBLE PRECISION,
    "icon" TEXT,
    "rarity" TEXT,
    "probability" DOUBLE PRECISION,
    "description" TEXT,
    "isActive" BOOLEAN,
    "color" TEXT,
    "gradient" TEXT,
    "textColor" TEXT,
    "totalWon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "prizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "categoryId" TEXT,
    "price" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "requiredStock" JSONB,
    "isActive" BOOLEAN,
    "isFeatured" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "cloudinaryData" JSONB,
    "nutritionalInfo" JSONB,
    "preparationTime" DOUBLE PRECISION,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lottery_winners" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "prize" TEXT,
    "winDate" TEXT,
    "month" TEXT,
    "prizeValue" DOUBLE PRECISION,
    "claimed" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "lottery_winners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "assignedTo" JSONB,
    "assignedBy" JSONB,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "priority" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "status" TEXT,
    "notes" JSONB,
    "actualHours" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
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
    "lastUsed" TIMESTAMP(3),
    "lastUsedInOrder" TEXT,
    "stockUsed" DOUBLE PRECISION,
    "reorderFrequency" TEXT,
    "requiredAmount" DOUBLE PRECISION,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "stock_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "code" TEXT,
    "referredBy" TEXT,
    "points" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT,
    "tableNumber" TEXT,
    "tableId" JSONB,
    "restaurantId" TEXT,
    "restaurantName" TEXT,
    "floor" JSONB,
    "arrangementId" JSONB,
    "tableCapacity" JSONB,
    "tableLocation" JSONB,
    "tableFeatures" JSONB,
    "tableShape" JSONB,
    "waiterId" TEXT,
    "waiterName" TEXT,
    "customerId" TEXT,
    "numberOfGuests" DOUBLE PRECISION,
    "items" JSONB,
    "subtotal" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "finalAmount" DOUBLE PRECISION,
    "deliveryFee" DOUBLE PRECISION,
    "packagingCharge" DOUBLE PRECISION,
    "categoryChargesTotal" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "status" TEXT,
    "specialRequirements" TEXT,
    "isActive" BOOLEAN,
    "stockProcessed" BOOLEAN,
    "inTable" BOOLEAN,
    "delivery" BOOLEAN,
    "deliveryInfo" JSONB,
    "paymentScreenshotUrl" JSONB,
    "markedForDeletion" BOOLEAN,
    "deletionRequestReason" JSONB,
    "deletionRequestedBy" JSONB,
    "deletionRequestedAt" JSONB,
    "deletedAt" JSONB,
    "deletedBy" JSONB,
    "deletionReason" JSONB,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stockProcessedAt" TIMESTAMP(3),
    "createdBy" JSONB,
    "creatorTracked" BOOLEAN,
    "creatorTrackedAt" TIMESTAMP(3),
    "stockProcessingNote" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "used_stock" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "stockId" TEXT,
    "stockName" TEXT,
    "stockCategory" TEXT,
    "stockUnit" TEXT,
    "unitCost" DOUBLE PRECISION,
    "totalQuantityUsed" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "items" JSONB,
    "usedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "used_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_wastages" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "quantity" DOUBLE PRECISION,
    "reason" TEXT,
    "date" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "stock_wastages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "userId" TEXT,
    "type" TEXT,
    "read" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commonExpenses" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "category" TEXT,
    "frequency" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN,
    "priority" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "commonExpenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deleted_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT,
    "tableNumber" TEXT,
    "tableId" JSONB,
    "restaurantId" TEXT,
    "restaurantName" TEXT,
    "floor" JSONB,
    "arrangementId" JSONB,
    "tableCapacity" JSONB,
    "tableLocation" JSONB,
    "tableFeatures" JSONB,
    "tableShape" JSONB,
    "waiterId" TEXT,
    "waiterName" TEXT,
    "customerId" TEXT,
    "numberOfGuests" DOUBLE PRECISION,
    "items" JSONB,
    "subtotal" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "finalAmount" DOUBLE PRECISION,
    "deliveryFee" DOUBLE PRECISION,
    "packagingCharge" DOUBLE PRECISION,
    "categoryChargesTotal" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "status" TEXT,
    "specialRequirements" TEXT,
    "isActive" BOOLEAN,
    "stockProcessed" BOOLEAN,
    "inTable" BOOLEAN,
    "delivery" BOOLEAN,
    "deliveryInfo" JSONB,
    "paymentScreenshotUrl" JSONB,
    "markedForDeletion" BOOLEAN,
    "deletionRequestReason" JSONB,
    "deletionRequestedBy" JSONB,
    "deletionRequestedAt" JSONB,
    "deletedAt" JSONB,
    "deletedBy" JSONB,
    "deletionReason" JSONB,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stockProcessedAt" TIMESTAMP(3),
    "createdBy" JSONB,
    "creatorTracked" BOOLEAN,
    "creatorTrackedAt" TIMESTAMP(3),
    "customerName" TEXT,
    "notes" TEXT,
    "orderItems" JSONB,
    "deletedByRole" TEXT,
    "deletionMethod" TEXT,
    "originalOrderId" TEXT,
    "originalOrderNumber" TEXT,
    "deletedFromCollection" TEXT,
    "movedToCollection" TEXT,
    "deletionLogId" TEXT,

    CONSTRAINT "deleted_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "stockName" TEXT,
    "categoryId" TEXT,
    "unit" TEXT,
    "reorderFrequency" TEXT,
    "requiredAmount" DOUBLE PRECISION,
    "requestDate" TEXT,
    "requestDateTime" TIMESTAMP(3),
    "requestedQuantity" DOUBLE PRECISION,
    "currentStock" DOUBLE PRECISION,
    "minimumStock" DOUBLE PRECISION,
    "estimatedUnitPrice" DOUBLE PRECISION,
    "estimatedTotalCost" DOUBLE PRECISION,
    "isDelivered" BOOLEAN,
    "isPurchased" BOOLEAN,
    "isConfirmed" BOOLEAN,
    "reason" TEXT,
    "status" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveredBy" TEXT,
    "actualTotalCost" DOUBLE PRECISION,
    "actualUnitPrice" DOUBLE PRECISION,
    "purchasedAt" TIMESTAMP(3),
    "purchasedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standards_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT,
    "standardId" TEXT,
    "role" TEXT,
    "standardsCount" DOUBLE PRECISION,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "standards_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "password" TEXT,
    "phone" TEXT,
    "employeeId" TEXT,
    "role" TEXT,
    "status" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresPasswordChange" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "employeeId" TEXT,
    "role" TEXT,
    "password" TEXT,
    "status" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresPasswordChange" BOOLEAN,
    "loginAttempts" DOUBLE PRECISION,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "lastPasswordChange" TIMESTAMP(3),
    "address" TEXT,
    "fcmTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSeen" JSONB,
    "online" BOOLEAN,
    "image" TEXT,
    "googleId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "specialization" TEXT,
    "shift" TEXT,
    "pin" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "category" TEXT,
    "date" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT,
    "recipeId" TEXT,
    "itemId" TEXT,
    "itemName" TEXT,
    "stepsCount" DOUBLE PRECISION,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "preparation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainings" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "type" TEXT,
    "uploadProgress" DOUBLE PRECISION,
    "uploadStatus" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit" (
    "id" TEXT NOT NULL,
    "action" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "userRole" TEXT,
    "description" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "amount" DOUBLE PRECISION,
    "category" TEXT,
    "date" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recurring" BOOLEAN,
    "frequency" TEXT,
    "notes" TEXT,
    "priority" TEXT,
    "status" TEXT,
    "createdBy" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plan_templates" (
    "id" TEXT NOT NULL,
    "templateCode" TEXT,
    "name" TEXT,
    "description" TEXT,
    "criteria" JSONB,
    "nutritionalTargets" JSONB,
    "weeklySchedule" JSONB,
    "mealPrepTips" JSONB,
    "groceryTips" JSONB,
    "shoppingList" JSONB,
    "notesForClient" TEXT,
    "status" TEXT,
    "usageCount" DOUBLE PRECISION,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "meal_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_bot_users" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "telegram_bot_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3),
    "type" TEXT,
    "severity" TEXT,
    "path" TEXT,
    "method" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "sessionId" JSONB,
    "details" JSONB,
    "storedAt" TIMESTAMP(3),

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_purchases" (
    "id" TEXT NOT NULL,
    "stockId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "quantity" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION,
    "supplier" TEXT,

    CONSTRAINT "stock_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promocodes" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "discount" DOUBLE PRECISION,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "promocodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_logs" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "deletedBy" TEXT,
    "deletedByRole" TEXT,
    "deletionReason" TEXT,
    "orderData" JSONB,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "deletion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_activities" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "userId" TEXT,
    "type" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "employee_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitress" (
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

    CONSTRAINT "waitress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "cuisine" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" JSONB,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailyCash" (
    "id" TEXT NOT NULL,
    "date" TEXT,
    "cashAmount" DOUBLE PRECISION,
    "transferAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION,
    "zReportNumber" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "dailyCash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "platformName" TEXT,
    "content" TEXT,
    "postType" TEXT,
    "scheduleTime" TIMESTAMP(3),
    "status" TEXT,
    "retryCount" DOUBLE PRECISION,
    "contentValidation" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userPoints" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "points" DOUBLE PRECISION,
    "activity" JSONB,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "userPoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preparation_recipes" (
    "id" TEXT NOT NULL,
    "itemId" TEXT,
    "itemName" TEXT,
    "steps" JSONB,
    "totalTime" DOUBLE PRECISION,
    "createdBy" TEXT,
    "createdByRole" JSONB,
    "isAdminCreated" BOOLEAN,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN,
    "version" DOUBLE PRECISION,
    "updatedBy" TEXT,

    CONSTRAINT "preparation_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "healthy_menu" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "categoryId" TEXT,
    "imageUrl" TEXT,
    "cloudinaryData" JSONB,
    "requiredStock" JSONB,
    "nutritionalInfo" JSONB,
    "preparationTime" DOUBLE PRECISION,
    "isActive" BOOLEAN,
    "isFeatured" BOOLEAN,
    "healthLabels" JSONB,
    "dietaryInfo" JSONB,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "healthy_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultures" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "cloudinaryData" JSONB,
    "createdBy" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN,

    CONSTRAINT "cultures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "used_stock_stockId_idx" ON "used_stock"("stockId");

-- CreateIndex
CREATE INDEX "used_stock_orderId_idx" ON "used_stock"("orderId");

-- CreateIndex
CREATE INDEX "deleted_orders_orderNumber_idx" ON "deleted_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "purchase_requests_stockId_idx" ON "purchase_requests"("stockId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_entity_idx" ON "audit"("entity");

-- CreateIndex
CREATE INDEX "security_logs_timestamp_idx" ON "security_logs"("timestamp");

-- CreateIndex
CREATE INDEX "stock_purchases_stockId_idx" ON "stock_purchases"("stockId");

-- CreateIndex
CREATE INDEX "deletion_logs_orderId_idx" ON "deletion_logs"("orderId");

-- CreateIndex
CREATE INDEX "preparation_recipes_itemId_idx" ON "preparation_recipes"("itemId");
