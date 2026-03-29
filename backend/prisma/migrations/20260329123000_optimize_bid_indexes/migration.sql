-- Improve bid ranking and timeline queries used by realtime rooms
CREATE INDEX IF NOT EXISTS "bids_auctionId_createdAt_idx"
ON "bids" ("auctionId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "bids_auctionId_amount_createdAt_id_idx"
ON "bids" ("auctionId", "amount" DESC, "createdAt", "id");
