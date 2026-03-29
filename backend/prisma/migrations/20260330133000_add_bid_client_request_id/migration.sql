-- AlterTable
ALTER TABLE "bids"
ADD COLUMN "clientRequestId" TEXT;

-- CreateIndex
CREATE INDEX "bids_clientRequestId_idx" ON "bids"("clientRequestId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "bids_bidderId_auctionId_clientRequestId_key" ON "bids"("bidderId", "auctionId", "clientRequestId");
