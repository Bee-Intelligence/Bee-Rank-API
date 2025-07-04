import { sql } from "../config/db";
import { BaseService } from "./BaseService";

interface CreateReviewData {
  entity_type: "taxi_rank" | "route" | "journey" | "hiking_sign";
  entity_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  tags?: string[];
  is_anonymous?: boolean;
}

interface ReviewSearchParams {
  entity_type?: string;
  entity_id?: string;
  rating_min?: number;
  rating_max?: number;
  user_id?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

interface Review {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_name?: string;
  rating: number;
  comment?: string;
  tags?: string[];
  helpful_votes: number;
  total_votes: number;
  is_anonymous: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ReviewVote {
  id: string;
  review_id: string;
  user_id: string;
  vote_type: "helpful" | "not_helpful";
  created_at: Date;
}

export class ReviewService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ ReviewService initialized");
  }

  async shutdown(): Promise<void> {
    console.log("🛑 ReviewService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const [result] = await sql`SELECT 1 as health_check`;
      return { status: "healthy", details: { database: "connected" } };
    } catch (error: any) {
      return {
        status: "unhealthy",
        details: { error: error?.message || "Unknown error" },
      };
    }
  }

  async createReview(reviewData: CreateReviewData): Promise<Review> {
    return this.executeQuery(async () => {
      const reviewId = this.generateReviewId();

      const [review] = await sql`
        INSERT INTO reviews (
          id, entity_type, entity_id, user_id, rating, comment, 
          tags, is_anonymous, helpful_votes, total_votes, created_at, updated_at
        )
        VALUES (
          ${reviewId}, ${reviewData.entity_type}, ${reviewData.entity_id},
          ${reviewData.user_id}, ${reviewData.rating}, ${reviewData.comment || null},
          ${JSON.stringify(reviewData.tags || [])}, ${reviewData.is_anonymous || false},
          0, 0, NOW(), NOW()
        )
        RETURNING *
      `;

      // Get user name if not anonymous
      if (!reviewData.is_anonymous) {
        const [user] = await sql`
          SELECT first_name, last_name FROM users WHERE id = ${reviewData.user_id}
        `;

        if (user) {
          return {
            ...review,
            user_name: `${user.first_name} ${user.last_name || ""}`.trim(),
          } as Review;
        }
      }

      return {
        ...review,
        user_name: reviewData.is_anonymous ? "Anonymous" : "Unknown User",
      } as Review;
    });
  }

  async getReviews(
    params: ReviewSearchParams,
  ): Promise<{ reviews: Review[]; total: number }> {
    return this.executeQuery(async () => {
      const {
        entity_type,
        entity_id,
        rating_min,
        rating_max,
        user_id,
        limit = 20,
        offset = 0,
        sort_by = "created_at",
        sort_order = "desc",
      } = params;

      const whereConditions = ["1=1"];

      if (entity_type) {
        whereConditions.push(`r.entity_type = '${entity_type}'`);
      }

      if (entity_id) {
        whereConditions.push(`r.entity_id = '${entity_id}'`);
      }

      if (rating_min !== undefined) {
        whereConditions.push(`r.rating >= ${rating_min}`);
      }

      if (rating_max !== undefined) {
        whereConditions.push(`r.rating <= ${rating_max}`);
      }

      if (user_id) {
        whereConditions.push(`r.user_id = '${user_id}'`);
      }

      const whereClause = whereConditions.join(" AND ");
      const orderClause = `${sort_by} ${sort_order.toUpperCase()}`;

      const reviews = await sql`
        SELECT 
          r.*,
          CASE 
            WHEN r.is_anonymous = true THEN 'Anonymous'
            ELSE COALESCE(u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown User')
          END as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE ${sql.unsafe(whereClause)}
        ORDER BY ${sql.unsafe(orderClause)}
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM reviews r
        WHERE ${sql.unsafe(whereClause)}
      `;

      return { reviews: reviews as Review[], total: Number.parseInt(count) };
    });
  }

  async getReviewById(id: string): Promise<Review | null> {
    return this.executeQuery(async () => {
      const [review] = await sql`
        SELECT 
          r.*,
          CASE 
            WHEN r.is_anonymous = true THEN 'Anonymous'
            ELSE COALESCE(u.first_name || ' ' || COALESCE(u.last_name, ''), 'Unknown User')
          END as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ${id}
      `;

      return (review as Review) || null;
    });
  }

  async updateReview(
    id: string,
    updateData: Partial<CreateReviewData>,
  ): Promise<Review | null> {
    return this.executeQuery(async () => {
      const updateFields = Object.keys(updateData)
        .filter(
          (key) => updateData[key as keyof CreateReviewData] !== undefined,
        )
        .map((key) => {
          const value = updateData[key as keyof CreateReviewData];
          if (key === "tags") {
            return `${key} = '${JSON.stringify(value)}'`;
          }
          return `${key} = '${value}'`;
        })
        .join(", ");

      if (!updateFields) {
        throw new Error("No fields to update");
      }

      const [review] = await sql`
        UPDATE reviews
        SET ${sql.unsafe(updateFields)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return (review as Review) || null;
    });
  }

  async deleteReview(id: string, userId: string): Promise<boolean> {
    return this.executeQuery(async () => {
      const [result] = await sql`
        DELETE FROM reviews
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `;

      return !!result;
    });
  }

  async voteOnReview(
    reviewId: string,
    userId: string,
    voteType: "helpful" | "not_helpful",
  ): Promise<ReviewVote> {
    return this.executeQuery(async () => {
      const voteId = this.generateVoteId();

      // Check if user already voted
      const [existingVote] = await sql`
        SELECT * FROM review_votes 
        WHERE review_id = ${reviewId} AND user_id = ${userId}
      `;

      if (existingVote) {
        // Update existing vote
        await sql`
          UPDATE review_votes 
          SET vote_type = ${voteType}, created_at = NOW()
          WHERE review_id = ${reviewId} AND user_id = ${userId}
        `;
      } else {
        // Create new vote
        await sql`
          INSERT INTO review_votes (id, review_id, user_id, vote_type, created_at)
          VALUES (${voteId}, ${reviewId}, ${userId}, ${voteType}, NOW())
        `;
      }

      // Update review vote counts
      const votes = await sql`
        SELECT 
          COUNT(CASE WHEN vote_type = 'helpful' THEN 1 END) as helpful_votes,
          COUNT(*) as total_votes
        FROM review_votes
        WHERE review_id = ${reviewId}
      `;

      await sql`
        UPDATE reviews
        SET helpful_votes = ${votes[0].helpful_votes}, 
            total_votes = ${votes[0].total_votes}
        WHERE id = ${reviewId}
      `;

      const [vote] = await sql`
        SELECT * FROM review_votes 
        WHERE review_id = ${reviewId} AND user_id = ${userId}
      `;

      return vote as ReviewVote;
    });
  }

  async getReviewStats(entityType: string, entityId: string): Promise<any> {
    return this.executeQuery(async () => {
      const stats = await sql`
        SELECT 
          COUNT(*) as total_reviews,
          AVG(rating) as average_rating,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5,
          SUM(helpful_votes) as total_helpful_votes,
          SUM(total_votes) as total_votes
        FROM reviews
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}
      `;

      const popularTags = await sql`
        SELECT 
          unnest(string_to_array(array_to_string(tags, ','), ',')) as tag,
          COUNT(*) as count
        FROM reviews
        WHERE entity_type = ${entityType} 
          AND entity_id = ${entityId}
          AND tags IS NOT NULL
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      `;

      return {
        ...stats[0],
        rating_distribution: {
          1: Number.parseInt(stats[0].rating_1),
          2: Number.parseInt(stats[0].rating_2),
          3: Number.parseInt(stats[0].rating_3),
          4: Number.parseInt(stats[0].rating_4),
          5: Number.parseInt(stats[0].rating_5),
        },
        popular_tags: popularTags,
      };
    });
  }

  async getUserReviews(userId: string, limit = 20): Promise<Review[]> {
    return this.executeQuery(async () => {
      const reviews = await sql`
        SELECT r.*, 'You' as user_name
        FROM reviews r
        WHERE r.user_id = ${userId}
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `;

      return reviews as Review[];
    });
  }

  private generateReviewId(): string {
    return (
      "review_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  private generateVoteId(): string {
    return "vote_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }
}
