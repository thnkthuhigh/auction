import { create } from 'zustand';
import type { Auction, Bid } from '@auction/shared';

interface AuctionState {
  activeAuction: Auction | null;
  liveBids: Bid[];
  viewersCount: number;
  serverTimeOffsetMs: number;
  setActiveAuction: (auction: Auction) => void;
  updateAuctionPrice: (price: number, totalBids: number) => void;
  addLiveBid: (bid: Bid) => void;
  setLiveBids: (bids: Bid[]) => void;
  setViewersCount: (count: number) => void;
  setServerTimeOffsetMs: (offsetMs: number) => void;
  updateAuctionRealtimeStatus: (payload: {
    status: Auction['status'];
    endTime?: string;
    winnerId?: string | null;
    winnerUsername?: string;
    currentPrice?: number;
  }) => void;
  resetAuction: () => void;
}

export const useAuctionStore = create<AuctionState>((set) => ({
  activeAuction: null,
  liveBids: [],
  viewersCount: 0,
  serverTimeOffsetMs: 0,

  setActiveAuction: (auction) =>
    set((state) => {
      const currentAuction = state.activeAuction;
      if (!currentAuction || currentAuction.id !== auction.id) {
        return { activeAuction: auction, liveBids: [] };
      }

      return {
        activeAuction: {
          ...auction,
          currentPrice: Math.max(currentAuction.currentPrice, auction.currentPrice),
          totalBids: Math.max(currentAuction.totalBids, auction.totalBids),
        },
        liveBids: state.liveBids,
      };
    }),

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

  setLiveBids: (bids) =>
    set(() => ({
      liveBids: bids.slice(0, 50),
    })),

  setViewersCount: (count) => set({ viewersCount: count }),

  setServerTimeOffsetMs: (offsetMs) => set({ serverTimeOffsetMs: offsetMs }),

  updateAuctionRealtimeStatus: ({ status, endTime, winnerId, winnerUsername, currentPrice }) =>
    set((state) => ({
      activeAuction: state.activeAuction
        ? {
            ...state.activeAuction,
            status,
            ...(endTime ? { endTime } : {}),
            ...(winnerId !== undefined ? { winnerId } : {}),
            ...(winnerUsername !== undefined ? { winnerUsername } : {}),
            ...(currentPrice !== undefined ? { currentPrice } : {}),
          }
        : null,
    })),

  resetAuction: () =>
    set({
      activeAuction: null,
      liveBids: [],
      viewersCount: 0,
      serverTimeOffsetMs: 0,
    }),
}));
