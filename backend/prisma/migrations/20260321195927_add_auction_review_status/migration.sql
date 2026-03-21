-- CreateEnum
CREATE TYPE "AuctionReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewStatus" "AuctionReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT;

-- CreateIndex
CREATE INDEX "auctions_reviewStatus_idx" ON "auctions"("reviewStatus");

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
