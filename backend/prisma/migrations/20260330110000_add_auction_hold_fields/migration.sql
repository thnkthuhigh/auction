-- Add hold tracking for realtime auction settlement
ALTER TABLE "auctions"
ADD COLUMN "heldAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "heldBidderId" TEXT;

-- Keep referential integrity for active hold owner
ALTER TABLE "auctions"
ADD CONSTRAINT "auctions_heldBidderId_fkey"
FOREIGN KEY ("heldBidderId") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "auctions_heldBidderId_idx" ON "auctions"("heldBidderId");
