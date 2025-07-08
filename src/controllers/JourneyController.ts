import type { Request, Response } from "express";
import { z } from "zod";
import type {
  CreateJourneyRequest,
  JourneySearchParams,
  UpdateJourneyRequest,
} from "../database/shared/models";
import type { JourneyService } from "../services";
import { BaseController } from "./BaseController";
import { createJourneySchema } from "../database/schema/journeys/createJourneySchema";
import { 
  updateJourneySchema, 
  updateJourneyStatusSchema 
} from "../database/schema/journeys/updateJourneySchema";
import { 
  journeyQuerySchema, 
  userJourneysQuerySchema, 
  journeyStatsQuerySchema 
} from "../database/schema/journeys/journeyQuerySchema";

export class JourneyController extends BaseController {
  constructor(private journeyService: JourneyService) {
    super();
  }

  getAll = this.asyncHandler(async (req: Request, res: Response) => {
    const pagination = this.getPaginationParams(req);
    const { user_id, status, journey_type, date_from, date_to } = journeyQuerySchema.parse(req.query);

    const searchParams: JourneySearchParams = {
      ...pagination,
      ...(user_id && { user_id: user_id as string }),
      ...(status && { status: status as any }),
      ...(journey_type && { journey_type: journey_type as any }),
      ...(date_from && { date_from: new Date(date_from as string) }),
      ...(date_to && { date_to: new Date(date_to as string) }),
    };

    const journeys = await this.journeyService.getUserJourneys(
      searchParams.user_id || '',
      searchParams.status,
      pagination.per_page,
      pagination.offset
    );
    return this.successResponse(res, journeys);
  });

  getById = this.asyncHandler(async (req: Request, res: Response) => {
    const journey_id = req.params.id;
    const journey = await this.journeyService.getJourneyById(journey_id);

    if (!journey) {
      return res
        .status(404)
        .json({ success: false, message: "Journey not found" });
    }

    return this.successResponse(res, journey);
  });

  create = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.extractUserId(req);
    const validatedData = createJourneySchema.parse(req.body);

    // For now, use mock coordinates since we have rank IDs instead of coordinates
    const journeyData = {
      user_id: userId,
      origin_latitude: -26.2041, // Mock Johannesburg coordinates
      origin_longitude: 28.0473,
      origin_address: `Rank ${validatedData.origin_rank_id}`,
      destination_latitude: -26.1076, // Mock Pretoria coordinates
      destination_longitude: 28.0567,
      destination_address: `Rank ${validatedData.destination_rank_id}`,
      route_type: this.mapJourneyTypeToRouteType(validatedData.journey_type),
    };

    const journey = await this.journeyService.createJourney(journeyData);
    return this.successResponse(
      res,
      journey,
      "Journey created successfully",
      201,
    );
  });

  update = this.asyncHandler(async (req: Request, res: Response) => {
    const journey_id = req.params.id;
    const validatedData = updateJourneySchema.parse(
      req.body,
    ) as UpdateJourneyRequest;

    // Map status values from request to service format
    const mappedData = {
      ...validatedData,
      status: validatedData.status ? this.mapStatusToService(validatedData.status) : undefined,
      actual_fare: validatedData.metadata?.actual_fare,
      started_at: validatedData.started_at,
      completed_at: validatedData.completed_at,
    };

    const journey = await this.journeyService.updateJourney(
      journey_id,
      mappedData,
    );
    if (!journey) {
      return res
        .status(404)
        .json({ success: false, message: "Journey not found" });
    }

    return this.successResponse(res, journey, "Journey updated successfully");
  });

  updateStatus = this.asyncHandler(async (req: Request, res: Response) => {
    const journey_id = req.params.id;
    const { status } = updateJourneyStatusSchema.parse(req.body);

    const journey = await this.journeyService.updateJourney(
      journey_id,
      { status: status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' },
    );
    if (!journey) {
      return res
        .status(404)
        .json({ success: false, message: "Journey not found" });
    }

    return this.successResponse(
      res,
      journey,
      "Journey status updated successfully",
    );
  });

  delete = this.asyncHandler(async (req: Request, res: Response) => {
    const journey_id = req.params.id;
    // Delete not implemented in service - use cancel instead
    const journey = await this.journeyService.cancelJourney(journey_id);

    if (!journey) {
      return res
        .status(404)
        .json({ success: false, message: "Journey not found" });
    }

    return this.successResponse(res, journey, "Journey cancelled successfully");
  });

  getUserJourneys = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.extractUserId(req);
    const pagination = this.getPaginationParams(req);
    const { status } = userJourneysQuerySchema.parse(req.query);

    const searchParams: JourneySearchParams = {
      ...pagination,
      user_id: userId,
      ...(status && { status: status as any }),
    };

    const journeys = await this.journeyService.getUserJourneys(
      userId,
      searchParams.status,
      pagination.per_page,
      pagination.offset
    );
    return this.successResponse(res, journeys);
  });

  getJourneyStats = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.extractUserId(req);
    const { date_from, date_to } = journeyStatsQuerySchema.parse(req.query);

    const stats = await this.journeyService.getJourneyStats(userId);

    return this.successResponse(res, stats);
  });

  private mapStatusToService(status: string): 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' {
    switch (status) {
      case 'planned': return 'PLANNED';
      case 'active': return 'IN_PROGRESS';
      case 'completed': return 'COMPLETED';
      case 'cancelled': return 'CANCELLED';
      default: return 'PLANNED';
    }
  }

  private mapJourneyTypeToRouteType(journeyType?: string): 'DIRECT' | 'CONNECTED' | 'MULTI_HOP' {
    switch (journeyType) {
      case 'direct': return 'DIRECT';
      case 'connected': return 'CONNECTED';
      case 'no_route_found': return 'MULTI_HOP';
      default: return 'DIRECT';
    }
  }
}
