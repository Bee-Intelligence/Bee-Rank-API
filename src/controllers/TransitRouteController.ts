import type { Request, Response } from "express";
import { createTransitRouteSchema } from "../database/schema/transits/createTransitRouteSchema";
import type {
  CreateTransitRouteRequest,
  RouteSearchParams,
} from "../database/shared/models";
import type { TransitRouteService } from "../services";
import { BaseController } from "./BaseController";

export class TransitRouteController extends BaseController {
  constructor(private transitRouteService: TransitRouteService) {
    super();
  }

  getAll = this.asyncHandler(async (req: Request, res: Response) => {
    const pagination = this.getPaginationParams(req);
    const {
      origin_rank_id,
      destination_rank_id,
      route_type,
      max_fare,
      is_active,
    } = req.query;

    const searchParams: RouteSearchParams = {
      ...pagination,
      ...(origin_rank_id && {
        origin_rank_id: Number.parseInt(origin_rank_id as string),
      }),
      ...(destination_rank_id && {
        destination_rank_id: Number.parseInt(destination_rank_id as string),
      }),
      ...(route_type && { route_type: route_type as any }),
      ...(max_fare && { fare_max: Number.parseFloat(max_fare as string) }),
      ...(is_active !== undefined && { is_active: is_active === "true" }),
    };

    const { routes, total } =
      await this.transitRouteService.getTransitRoutes(searchParams);
    return this.paginatedResponse(
      res,
      routes,
      total,
      pagination.page!,
      pagination.per_page!,
    );
  });

  getById = this.asyncHandler(async (req: Request, res: Response) => {
    // Special case for demo-route
    if (req.params.id === "demo-route") {
      const demoRoute = await this.transitRouteService.getDemoRoute();
      return this.successResponse(res, demoRoute);
    }

    // Regular case for numeric IDs
    const id = this.validateId(req.params.id);
    const route = await this.transitRouteService.getTransitRouteById(id);

    if (!route) {
      return res
        .status(404)
        .json({ success: false, message: "Route not found" });
    }

    return this.successResponse(res, route);
  });

  create = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.extractUserId(req);
    const validatedData = createTransitRouteSchema.parse(req.body);

    const routeData: CreateTransitRouteRequest = {
      ...validatedData,
      user_id: userId,
    };

    const route = await this.transitRouteService.createTransitRoute(routeData);
    return this.successResponse(res, route, "Route created successfully", 201);
  });

  update = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const validatedData = createTransitRouteSchema.partial().parse(req.body);

    const route = await this.transitRouteService.updateTransitRoute(
      id,
      validatedData,
    );
    if (!route) {
      return res
        .status(404)
        .json({ success: false, message: "Route not found" });
    }

    return this.successResponse(res, route, "Route updated successfully");
  });

  delete = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const success = await this.transitRouteService.deleteTransitRoute(id);

    if (!success) {
      return res
        .status(404)
        .json({ success: false, message: "Route not found" });
    }

    return this.successResponse(res, null, "Route deleted successfully");
  });

  getRoutesByRank = this.asyncHandler(async (req: Request, res: Response) => {
    const rankId = this.validateId(req.params.rankId);
    const routes = await this.transitRouteService.getRoutesByRank(rankId);
    return this.successResponse(res, routes);
  });

  findRoutes = this.asyncHandler(async (req: Request, res: Response) => {
    const { origin_rank_id, destination_rank_id } = req.query;

    if (!origin_rank_id || !destination_rank_id) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination rank IDs are required",
      });
    }

    const routes = await this.transitRouteService.findRoutesBetweenRanks(
      Number.parseInt(origin_rank_id as string),
      Number.parseInt(destination_rank_id as string),
    );

    return this.successResponse(res, routes);
  });

  /**
   * Calculate route options between two points
   */
  calculateRoutes = this.asyncHandler(async (req: Request, res: Response) => {
    const { originLat, originLng, destinationLat, destinationLng, departureTime } = req.body;

    // Validate required parameters
    if (!originLat || !originLng || !destinationLat || !destinationLng) {
      return res.status(400).json({
        success: false,
        message: "Origin and destination coordinates are required",
      });
    }

    // Validate coordinate values
    const validateCoordinate = (value: any, name: string) => {
      const num = Number(value);
      if (isNaN(num)) {
        return `${name} must be a valid number`;
      }
      return null;
    };

    const errors = [
      validateCoordinate(originLat, "originLat"),
      validateCoordinate(originLng, "originLng"),
      validateCoordinate(destinationLat, "destinationLat"),
      validateCoordinate(destinationLng, "destinationLng"),
    ].filter(Boolean);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates provided",
        errors,
      });
    }

    // Call service method to calculate routes
    const routeOptions = await this.transitRouteService.calculateRoutes({
      originLat: Number(originLat),
      originLng: Number(originLng),
      destinationLat: Number(destinationLat),
      destinationLng: Number(destinationLng),
      departureTime,
    });

    return this.successResponse(res, routeOptions);
  });
}
