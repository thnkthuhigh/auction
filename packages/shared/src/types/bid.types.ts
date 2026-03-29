export interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  bidderId: string;
  bidderUsername: string;
  bidderAvatar?: string;
  auctionId: string;
}

export interface PlaceBidDTO {
  auctionId: string;
  amount: number;
  clientRequestId?: string;
}
