import express from "express";
import type { Request, Response } from "express";
import { z } from "zod";

const router = express.Router();

// Validation schemas
const createReviewSchema = z.object({
  entity_type: z.enum(["taxi_rank", "route", "journey", "hiking_sign"]),
  entity_id: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_anonymous: z.boolean().optional(),
});

const reviewVoteSchema = z.object({
  vote_type: z.enum(["helpful", "not_helpful"]),
});

// Get reviews for an entity
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      entity_type,
      entity_id,
      rating_min,
      rating_max,
      page = 1,
      limit = 20,
      sort_by = "created_at",
      sort_order = "desc",
    } = req.query;

    // Mock response - replace with actual service call
    const reviews = {
      reviews: [
        {
          id: "1",
          entity_type,
          entity_id,
          user_id: "user1",
          user_name: "John Doe",
          rating: 4,
          comment: "Great service!",
          tags: ["clean", "efficient"],
          helpful_votes: 5,
          total_votes: 6,
          is_anonymous: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
    };

    res.json({
      success: true,
      data: reviews.reviews,
      pagination: {
        total: reviews.total,
        page: Number.parseInt(page as string),
        limit: Number.parseInt(limit as string),
        total_pages: Math.ceil(
          reviews.total / Number.parseInt(limit as string),
        ),
      },
    });
  } catch (error: any) {
    console.error("Get reviews error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch reviews",
    });
  }
});

// Create review
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["user-id"] as string) || "anonymous";
    const validatedData = createReviewSchema.parse(req.body);

    // Mock response - replace with actual service call
    const review = {
      id: Date.now().toString(),
      ...validatedData,
      user_id: userId,
      user_name: userId === "anonymous" ? "Anonymous" : "User Name",
      helpful_votes: 0,
      total_votes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: review,
      message: "Review created successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Create review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create review",
    });
  }
});

// Get review by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Mock response - replace with actual service call
    const review = {
      id,
      entity_type: "taxi_rank",
      entity_id: "rank1",
      user_id: "user1",
      user_name: "John Doe",
      rating: 4,
      comment: "Great service!",
      tags: ["clean", "efficient"],
      helpful_votes: 5,
      total_votes: 6,
      is_anonymous: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error("Get review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch review",
    });
  }
});

// Update review
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers["user-id"] as string;
    const validatedData = createReviewSchema.partial().parse(req.body);

    // Mock response - replace with actual service call
    const updatedReview = {
      id,
      ...validatedData,
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: updatedReview,
      message: "Review updated successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Update review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update review",
    });
  }
});

// Delete review
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.headers["user-id"] as string;

    // Mock response - replace with actual service call
    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete review",
    });
  }
});

// Vote on review
router.post("/:id/vote", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.headers["user-id"] as string) || "anonymous";
    const validatedData = reviewVoteSchema.parse(req.body);

    // Mock response - replace with actual service call
    const vote = {
      id: Date.now().toString(),
      review_id: id,
      user_id: userId,
      vote_type: validatedData.vote_type,
      created_at: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: vote,
      message: "Vote recorded successfully",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }

    console.error("Vote review error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to record vote",
    });
  }
});

// Get review statistics
router.get(
  "/stats/:entity_type/:entity_id",
  async (req: Request, res: Response) => {
    try {
      const { entity_type, entity_id } = req.params;

      // Mock response - replace with actual service call
      const stats = {
        total_reviews: 25,
        average_rating: 4.2,
        rating_distribution: {
          1: 1,
          2: 2,
          3: 5,
          4: 10,
          5: 7,
        },
        total_votes: 150,
        helpful_votes: 120,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error("Get review stats error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch review statistics",
      });
    }
  },
);

export default router;
