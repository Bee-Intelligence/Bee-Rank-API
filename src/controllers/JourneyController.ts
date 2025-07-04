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

    const { journeys, total } =
      await this.journeyService.getJourneys(searchParams);
    return this.paginatedResponse(
      res,
      journeys,
      total,
      pagination.page!,
      pagination.per_page!,
    );
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

    const journeyData: CreateJourneyRequest = {
      ...validatedData,
      user_id: userId,
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

    const journey = await this.journeyService.updateJourney(
      journey_id,
      validatedData,
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

    const journey = await this.journeyService.updateJourneyStatus(
      journey_id,
      status,
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
    const success = await this.journeyService.deleteJourney(journey_id);

    if (!success) {
      return res
        .status(404)
        .json({ success: false, message: "Journey not found" });
    }

    return this.successResponse(res, null, "Journey deleted successfully");
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

    const { journeys, total } =
      await this.journeyService.getJourneys(searchParams);
    return this.paginatedResponse(
      res,
      journeys,
      total,
      pagination.page!,
      pagination.per_page!,
    );
  });

  getJourneyStats = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.extractUserId(req);
    const { date_from, date_to } = journeyStatsQuerySchema.parse(req.query);

    const stats = await this.journeyService.getJourneyStats(userId, {
      ...(date_from && { start_date: new Date(date_from as string) }),
      ...(date_to && { end_date: new Date(date_to as string) }),
    });

    return this.successResponse(res, stats);
  });
}
