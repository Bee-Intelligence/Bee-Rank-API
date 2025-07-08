import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  revieweeType: 'user' | 'taxi_rank' | 'journey' | 'driver';
  rating: number; // 1-5 stars
  title?: string;
  comment?: string;
  tags?: string[];
  isAnonymous: boolean;
  isVerified: boolean;
  helpfulVotes: number;
  reportCount: number;
  status: 'active' | 'hidden' | 'deleted' | 'pending_moderation';
  metadata?: {
    journeyId?: string;
    taxiRankId?: string;
    driverId?: string;
    tripDate?: Date;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  verifiedReviews: number;
  recentReviews: number; // Last 30 days
}

export interface ReviewFilters {
  revieweeId?: string;
  revieweeType?: string;
  reviewerId?: string;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  isVerified?: boolean;
  status?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'rating' | 'helpful';
  sortOrder?: 'asc' | 'desc';
}

export class ReviewService extends BaseService {
  private initialized = false;
  private reviews: Map<string, Review> = new Map();
  private reviewsByReviewee: Map<string, Set<string>> = new Map();
  private reviewsByReviewer: Map<string, Set<string>> = new Map();

  constructor() {
    super('ReviewService');
  }

  async init(): Promise<void> {
    console.log('Initializing ReviewService');
    
    try {
      // Load existing reviews (in a real implementation, this would be from database)
      await this.loadReviews();
      
      this.initialized = true;
      console.log('ReviewService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async loadReviews(): Promise<void> {
    // Mock data - in real implementation, load from database
    const mockReviews: Review[] = [
      {
        id: 'review_1',
        reviewerId: 'user_1',
        revieweeId: 'taxi_rank_1',
        revieweeType: 'taxi_rank',
        rating: 4,
        title: 'Good service',
        comment: 'Clean taxis and friendly drivers',
        tags: ['clean', 'friendly'],
        isAnonymous: false,
        isVerified: true,
        helpfulVotes: 5,
        reportCount: 0,
        status: 'active',
        metadata: {
          taxiRankId: 'taxi_rank_1',
          tripDate: new Date('2024-01-15'),
        },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      },
      {
        id: 'review_2',
        reviewerId: 'user_2',
        revieweeId: 'user_3',
        revieweeType: 'driver',
        rating: 5,
        title: 'Excellent driver',
        comment: 'Very professional and safe driving',
        tags: ['professional', 'safe'],
        isAnonymous: false,
        isVerified: true,
        helpfulVotes: 8,
        reportCount: 0,
        status: 'active',
        metadata: {
          driverId: 'user_3',
          journeyId: 'journey_1',
          tripDate: new Date('2024-01-20'),
        },
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      },
    ];

    for (const review of mockReviews) {
      this.reviews.set(review.id, review);
      this.indexReview(review);
    }

    console.log(`Loaded ${mockReviews.length} reviews`);
  }

  private indexReview(review: Review): void {
    // Index by reviewee
    if (!this.reviewsByReviewee.has(review.revieweeId)) {
      this.reviewsByReviewee.set(review.revieweeId, new Set());
    }
    this.reviewsByReviewee.get(review.revieweeId)!.add(review.id);

    // Index by reviewer
    if (!this.reviewsByReviewer.has(review.reviewerId)) {
      this.reviewsByReviewer.set(review.reviewerId, new Set());
    }
    this.reviewsByReviewer.get(review.reviewerId)!.add(review.id);
  }

  private unindexReview(review: Review): void {
    // Remove from reviewee index
    const revieweeReviews = this.reviewsByReviewee.get(review.revieweeId);
    if (revieweeReviews) {
      revieweeReviews.delete(review.id);
      if (revieweeReviews.size === 0) {
        this.reviewsByReviewee.delete(review.revieweeId);
      }
    }

    // Remove from reviewer index
    const reviewerReviews = this.reviewsByReviewer.get(review.reviewerId);
    if (reviewerReviews) {
      reviewerReviews.delete(review.id);
      if (reviewerReviews.size === 0) {
        this.reviewsByReviewer.delete(review.reviewerId);
      }
    }
  }

  async createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpfulVotes' | 'reportCount' | 'status'>): Promise<Review> {
    try {
      // Validate rating
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if reviewer has already reviewed this entity
      const existingReview = await this.getReviewByReviewerAndReviewee(
        reviewData.reviewerId,
        reviewData.revieweeId,
        reviewData.revieweeType
      );

      if (existingReview) {
        throw new Error('You have already reviewed this entity');
      }

      // Create review
      const review: Review = {
        ...reviewData,
        id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        helpfulVotes: 0,
        reportCount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store review
      this.reviews.set(review.id, review);
      this.indexReview(review);

      console.log('Review created successfully', { reviewId: review.id, rating: review.rating });
      return review;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getReview(reviewId: string): Promise<Review | null> {
    try {
      return this.reviews.get(reviewId) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async updateReview(reviewId: string, updates: Partial<Pick<Review, 'rating' | 'title' | 'comment' | 'tags'>>): Promise<Review | null> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return null;
      }

      // Validate rating if provided
      if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Update review
      const updatedReview: Review = {
        ...review,
        ...updates,
        updatedAt: new Date(),
      };

      this.reviews.set(reviewId, updatedReview);

      console.log('Review updated successfully', { reviewId });
      return updatedReview;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async deleteReview(reviewId: string): Promise<boolean> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return false;
      }

      // Unindex and remove review
      this.unindexReview(review);
      this.reviews.delete(reviewId);

      console.log('Review deleted successfully', { reviewId });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async getReviews(filters: ReviewFilters = {}): Promise<Review[]> {
    try {
      let reviews = Array.from(this.reviews.values());

      // Apply filters
      if (filters.revieweeId) {
        reviews = reviews.filter(r => r.revieweeId === filters.revieweeId);
      }

      if (filters.revieweeType) {
        reviews = reviews.filter(r => r.revieweeType === filters.revieweeType);
      }

      if (filters.reviewerId) {
        reviews = reviews.filter(r => r.reviewerId === filters.reviewerId);
      }

      if (filters.rating) {
        reviews = reviews.filter(r => r.rating === filters.rating);
      }

      if (filters.minRating) {
        reviews = reviews.filter(r => r.rating >= filters.minRating!);
      }

      if (filters.maxRating) {
        reviews = reviews.filter(r => r.rating <= filters.maxRating!);
      }

      if (filters.isVerified !== undefined) {
        reviews = reviews.filter(r => r.isVerified === filters.isVerified);
      }

      if (filters.status) {
        reviews = reviews.filter(r => r.status === filters.status);
      }

      if (filters.tags && filters.tags.length > 0) {
        reviews = reviews.filter(r => 
          r.tags && filters.tags!.some(tag => r.tags!.includes(tag))
        );
      }

      if (filters.dateFrom) {
        reviews = reviews.filter(r => r.createdAt >= filters.dateFrom!);
      }

      if (filters.dateTo) {
        reviews = reviews.filter(r => r.createdAt <= filters.dateTo!);
      }

      // Sort reviews
      const sortBy = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder || 'desc';

      reviews.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'rating':
            comparison = a.rating - b.rating;
            break;
          case 'helpful':
            comparison = a.helpfulVotes - b.helpfulVotes;
            break;
          case 'date':
          default:
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply pagination
      if (filters.offset) {
        reviews = reviews.slice(filters.offset);
      }

      if (filters.limit) {
        reviews = reviews.slice(0, filters.limit);
      }

      return reviews;
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async getReviewsByReviewee(revieweeId: string, revieweeType?: string): Promise<Review[]> {
    return this.getReviews({
      revieweeId,
      revieweeType,
      status: 'active',
    });
  }

  async getReviewsByReviewer(reviewerId: string): Promise<Review[]> {
    return this.getReviews({
      reviewerId,
      status: 'active',
    });
  }

  async getReviewByReviewerAndReviewee(reviewerId: string, revieweeId: string, revieweeType: string): Promise<Review | null> {
    try {
      const reviews = await this.getReviews({
        reviewerId,
        revieweeId,
        revieweeType,
      });

      return reviews.length > 0 ? reviews[0] : null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async getReviewStats(revieweeId: string, revieweeType?: string): Promise<ReviewStats> {
    try {
      const reviews = await this.getReviewsByReviewee(revieweeId, revieweeType);
      const activeReviews = reviews.filter(r => r.status === 'active');

      if (activeReviews.length === 0) {
        return {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          verifiedReviews: 0,
          recentReviews: 0,
        };
      }

      // Calculate average rating
      const totalRating = activeReviews.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRating / activeReviews.length;

      // Calculate rating distribution
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      activeReviews.forEach(r => {
        ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
      });

      // Count verified reviews
      const verifiedReviews = activeReviews.filter(r => r.isVerified).length;

      // Count recent reviews (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentReviews = activeReviews.filter(r => r.createdAt >= thirtyDaysAgo).length;

      return {
        totalReviews: activeReviews.length,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        ratingDistribution,
        verifiedReviews,
        recentReviews,
      };
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedReviews: 0,
        recentReviews: 0,
      };
    }
  }

  async voteHelpful(reviewId: string, userId: string): Promise<boolean> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return false;
      }

      // In a real implementation, you'd track who voted to prevent duplicate votes
      // For now, just increment the count
      review.helpfulVotes++;
      review.updatedAt = new Date();

      console.log('Helpful vote added', { reviewId, userId });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async reportReview(reviewId: string, userId: string, reason: string): Promise<boolean> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return false;
      }

      review.reportCount++;
      review.updatedAt = new Date();

      // Auto-hide review if it gets too many reports
      if (review.reportCount >= 5) {
        review.status = 'pending_moderation';
      }

      console.log('Review reported', { reviewId, userId, reason, reportCount: review.reportCount });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async moderateReview(reviewId: string, action: 'approve' | 'hide' | 'delete', moderatorId: string): Promise<boolean> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return false;
      }

      switch (action) {
        case 'approve':
          review.status = 'active';
          break;
        case 'hide':
          review.status = 'hidden';
          break;
        case 'delete':
          review.status = 'deleted';
          break;
      }

      review.updatedAt = new Date();

      console.log('Review moderated', { reviewId, action, moderatorId });
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async getTopReviewedEntities(revieweeType: string, limit: number = 10): Promise<Array<{ revieweeId: string; stats: ReviewStats }>> {
    try {
      const revieweeIds = new Set<string>();
      
      // Collect all reviewee IDs of the specified type
      for (const review of this.reviews.values()) {
        if (review.revieweeType === revieweeType && review.status === 'active') {
          revieweeIds.add(review.revieweeId);
        }
      }

      // Get stats for each reviewee
      const results = await Promise.all(
        Array.from(revieweeIds).map(async (revieweeId) => ({
          revieweeId,
          stats: await this.getReviewStats(revieweeId, revieweeType),
        }))
      );

      // Sort by total reviews and average rating
      results.sort((a, b) => {
        if (a.stats.totalReviews !== b.stats.totalReviews) {
          return b.stats.totalReviews - a.stats.totalReviews;
        }
        return b.stats.averageRating - a.stats.averageRating;
      });

      return results.slice(0, limit);
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const totalReviews = this.reviews.size;
    const activeReviews = Array.from(this.reviews.values()).filter(r => r.status === 'active').length;
    
    return {
      status: 'healthy',
      details: {
        service: 'ReviewService',
        initialized: this.initialized,
        totalReviews,
        activeReviews,
        revieweeCount: this.reviewsByReviewee.size,
        reviewerCount: this.reviewsByReviewer.size,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down ReviewService');
    
    this.reviews.clear();
    this.reviewsByReviewee.clear();
    this.reviewsByReviewer.clear();
    this.initialized = false;
  }
}