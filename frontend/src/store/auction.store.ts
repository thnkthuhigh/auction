import { create } from 'zustand';
import type { Auction, Bid } from '@auction/shared';

interface AuctionState {
  activeAuction: Auction | null;
  liveBids: Bid[];
  viewersCount: number;
  setActiveAuction: (auction: Auction) => void;
  updateAuctionPrice: (price: number, totalBids: number) => void;
  addLiveBid: (bid: Bid) => void;
  setViewersCount: (count: number) => void;
  resetAuction: () => void;
}

export const useAuctionStore = create<AuctionState>((set) => ({
  activeAuction: null,
  liveBids: [],
  viewersCount: 0,

  setActiveAuction: (auction) => set({ activeAuction: auction, liveBids: [] }),

  updateAuctionPrice: (price, totalBids) =>
    set((state) => ({
      activeAuction: state.activeAuction
        ? { ...state.activeAuction, currentPrice: price, totalBids }
        : null,
    })),

  addLiveBid: (bid) =>
    set((state) => ({
      liveBids: [bid, ...state.liveBids].slice(0, 50), // keep last 50
    })),

  setViewersCount: (count) => set({ viewersCount: count }),

  resetAuction: () => set({ activeAuction: null, liveBids: [], viewersCount: 0 }),
}));
