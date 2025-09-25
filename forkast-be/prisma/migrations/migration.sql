-- Consolidated migration: All initial tables and modifications
-- This migration combines all previous migrations into a single file
-- Includes integrity checks and concurrency-safe unique indexes

-- ========================
-- CreateTable: User
-- ========================
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on email
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- ========================
-- CreateTable: Order
-- ========================
CREATE TABLE "public"."Order" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "filledQuantity" INTEGER NOT NULL DEFAULT 0 CHECK ("filledQuantity" >= 0),
    "status" TEXT NOT NULL DEFAULT 'open',
    "market" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- (Optional) Unique constraint: only one open order per user
-- Comment this out if users are allowed multiple open orders
-- CREATE UNIQUE INDEX "Order_userId_status_open_key" ON "public"."Order"("userId")
-- WHERE "status" = 'open';

-- ========================
-- CreateTable: Trade
-- ========================
CREATE TABLE "public"."Trade" (
    "id" SERIAL NOT NULL,
    "buyOrderId" INTEGER,
    "sellOrderId" INTEGER,
    "buyerUserId" INTEGER,
    "sellerUserId" INTEGER,
    "price" DOUBLE PRECISION NOT NULL CHECK ("price" > 0),
    "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- ========================
-- CreateTable: Balance
-- ========================
CREATE TABLE "public"."Balance" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "symbol" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- Unique index: each user can only have one balance per symbol
CREATE UNIQUE INDEX "Balance_userId_symbol_key" ON "public"."Balance"("userId", "symbol");

-- ========================
-- Foreign Keys
-- ========================
ALTER TABLE "public"."Order"
    ADD CONSTRAINT "Order_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Trade"
    ADD CONSTRAINT "Trade_buyOrderId_fkey"
    FOREIGN KEY ("buyOrderId") REFERENCES "public"."Order"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Trade"
    ADD CONSTRAINT "Trade_sellOrderId_fkey"
    FOREIGN KEY ("sellOrderId") REFERENCES "public"."Order"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."Balance"
    ADD CONSTRAINT "Balance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;