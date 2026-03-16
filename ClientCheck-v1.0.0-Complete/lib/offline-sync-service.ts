import AsyncStorage from "@react-native-async-storage/async-storage";
// import { NetInfo } from "@react-native-community/netinfo"; // Will be available after install

export interface PendingReview {
  id: string;
  customerId: number;
  rating: number;
  redFlags: string[];
  comment: string;
  photos?: string[];
  timestamp: number;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
}

export interface SyncQueueState {
  pendingReviews: PendingReview[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  failedCount: number;
}

const STORAGE_KEY = "offline_sync_queue";
const MAX_RETRIES = 3;

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private queue: PendingReview[] = [];
  private isOnline = true;
  private isSyncing = false;
  private listeners: Array<(state: SyncQueueState) => void> = [];

  private constructor() {
    this.initializeNetworkListener();
    this.loadQueue();
  }

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  /**
   * Initialize network status listener
   */
  private initializeNetworkListener(): void {
    // This would use react-native-netinfo in production
    // For now, we'll check periodically
    setInterval(() => {
      this.checkNetworkStatus();
    }, 5000);
  }

  /**
   * Check network status and sync if online
   */
  private async checkNetworkStatus(): Promise<void> {
    try {
      // In production, use: const state = await NetInfo.fetch();
      // For testing, we'll assume online
      const wasOnline = this.isOnline;
      this.isOnline = true;

      if (!wasOnline && this.isOnline) {
        console.log("Network restored, syncing pending reviews...");
        await this.syncQueue();
      }

      this.notifyListeners();
    } catch (error) {
      console.error("Failed to check network status:", error);
    }
  }

  /**
   * Add a review to the offline queue
   */
  async addToQueue(review: Omit<PendingReview, "id" | "timestamp" | "retryCount" | "status">): Promise<string> {
    const id = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pendingReview: PendingReview = {
      ...review,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: "pending",
    };

    this.queue.push(pendingReview);
    await this.saveQueue();
    this.notifyListeners();

    // Try to sync immediately if online
    if (this.isOnline) {
      await this.syncQueue();
    }

    return id;
  }

  /**
   * Sync all pending reviews
   */
  async syncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const failedReviews: PendingReview[] = [];

      for (const review of this.queue) {
        if (review.status === "pending" || review.status === "failed") {
          const success = await this.syncReview(review);

          if (success) {
            // Remove from queue
            this.queue = this.queue.filter((r) => r.id !== review.id);
          } else {
            review.retryCount++;
            if (review.retryCount >= MAX_RETRIES) {
              review.status = "failed";
              failedReviews.push(review);
            } else {
              review.status = "pending";
            }
          }
        }
      }

      await this.saveQueue();
      this.isSyncing = false;
      this.notifyListeners();

      if (failedReviews.length > 0) {
        console.warn(`${failedReviews.length} reviews failed to sync after ${MAX_RETRIES} retries`);
      }
    } catch (error) {
      console.error("Sync queue error:", error);
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Sync individual review (would call API in production)
   */
  private async syncReview(review: PendingReview): Promise<boolean> {
    try {
      // In production, this would call your API endpoint
      // const response = await trpc.reviews.create.mutate({...review});
      // For testing, simulate success after 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`Review ${review.id} synced successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to sync review ${review.id}:`, error);
      return false;
    }
  }

  /**
   * Get current queue state
   */
  getState(): SyncQueueState {
    return {
      pendingReviews: this.queue,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: null,
      failedCount: this.queue.filter((r) => r.status === "failed").length,
    };
  }

  /**
   * Subscribe to queue state changes
   */
  subscribe(listener: (state: SyncQueueState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error("Failed to save queue:", error);
    }
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to load queue:", error);
    }
  }

  /**
   * Clear all pending reviews
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }

  /**
   * Retry failed reviews
   */
  async retryFailed(): Promise<void> {
    this.queue = this.queue.map((r) => ({
      ...r,
      status: r.status === "failed" ? "pending" : r.status,
      retryCount: 0,
    }));
    await this.saveQueue();
    await this.syncQueue();
  }
}

export const offlineSyncService = OfflineSyncService.getInstance();
