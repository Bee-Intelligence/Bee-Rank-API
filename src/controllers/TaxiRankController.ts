import type { Request, Response } from "express";
import { z } from "zod";
import type {
  CreateTaxiRankRequest,
  TaxiRankSearchParams,
  UpdateTaxiRankRequest,
} from "../database/shared/models";
import type { TaxiRankService } from "../services";
import { BaseController } from "./BaseController";
import {createTaxiRankSchema} from "../database/schema/ranks/createTaxiRankSchema";
import {updateTaxiRankSchema} from "../database/schema/ranks/updateTaxiRankSchema";

const nearbyQuerySchema = z.object({
  latitude: z.string().transform((val) => Number.parseFloat(val)),
  longitude: z.string().transform((val) => Number.parseFloat(val)),
  radius: z
    .string()
    .transform((val) => Number.parseFloat(val))
    .optional(),
  limit: z
    .string()
    .transform((val) => Number.parseInt(val))
    .optional(),
});

export class TaxiRankController extends BaseController {
  constructor(private taxiRankService: TaxiRankService) {
    super();
  }

  getAll = this.asyncHandler(async (req: Request, res: Response) => {
    const pagination = this.getPaginationParams(req);
    const {
      search,
      name,
      city,
      province,
      is_active,
      latitude,
      longitude,
      radius,
    } = req.query;

    const searchParams: TaxiRankSearchParams = {
      ...pagination,
      // Use 'name' instead of 'search' as that's what the interface expects
      ...(search && { name: search as string }),
      ...(name && { name: name as string }),
      ...(city && { city: city as string }),
      ...(province && { province: province as string }),
      ...(is_active !== undefined && { is_active: is_active === "true" }),
      ...(latitude && { latitude: Number.parseFloat(latitude as string) }),
      ...(longitude && { longitude: Number.parseFloat(longitude as string) }),
      ...(radius && { radius: Number.parseFloat(radius as string) }),
    };

    const { ranks, total } = await this.taxiRankService.getRanks(searchParams);
    return this.paginatedResponse(
      res,
      ranks,
      total,
      pagination.page!,
      pagination.per_page!,
    );
  });

  getById = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const rank = await this.taxiRankService.getRankById(id);

    if (!rank) {
      return res
        .status(404)
        .json({ success: false, message: "Taxi rank not found" });
    }

    return this.successResponse(res, rank);
  });

  getNearby = this.asyncHandler(async (req: Request, res: Response) => {
    const {
      latitude,
      longitude,
      radius = 5000,
      limit = 50,
    } = nearbyQuerySchema.parse(req.query);

    const nearbyRanks = await this.taxiRankService.getNearbyRanks(
      latitude,
      longitude,
      radius,
      limit,
    );
    return this.successResponse(res, nearbyRanks);
  });

  create = this.asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createTaxiRankSchema.parse(
      req.body,
    ) as CreateTaxiRankRequest;
    const rank = await this.taxiRankService.createRank(validatedData);
    return this.successResponse(
      res,
      rank,
      "Taxi rank created successfully",
      201,
    );
  });

  update = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const validatedData = updateTaxiRankSchema.parse(
      req.body,
    ) as UpdateTaxiRankRequest;

    const rank = await this.taxiRankService.updateRank(id, validatedData);
    if (!rank) {
      return res
        .status(404)
        .json({ success: false, message: "Taxi rank not found" });
    }

    return this.successResponse(res, rank, "Taxi rank updated successfully");
  });

  delete = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const success = await this.taxiRankService.deleteRank(id);

    if (!success) {
      return res
        .status(404)
        .json({ success: false, message: "Taxi rank not found" });
    }

    return this.successResponse(res, null, "Taxi rank deleted successfully");
  });

  getByCity = this.asyncHandler(async (req: Request, res: Response) => {
    const { city } = req.params;
    const ranks = await this.taxiRankService.getRanksByCity(city);
    return this.successResponse(res, ranks);
  });

  getByProvince = this.asyncHandler(async (req: Request, res: Response) => {
    const { province } = req.params;
    const ranks = await this.taxiRankService.getRanksByProvince(province);
    return this.successResponse(res, ranks);
  });

  search = this.asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.params;
    const pagination = this.getPaginationParams(req);

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchParams: TaxiRankSearchParams = {
      ...pagination,
      // Fixed: Use 'name' instead of 'search' since that's what the interface has
      name: query.trim(),
    };

    const { ranks, total } = await this.taxiRankService.getRanks(searchParams);
    return this.paginatedResponse(
      res,
      ranks,
      total,
      pagination.page!,
      pagination.per_page!,
    );
  });

  getStats = this.asyncHandler(async (req: Request, res: Response) => {
    // Get basic statistics about taxi ranks
    const allRanks = await this.taxiRankService.getRanks({
      limit: 10000,
      offset: 0,
    });

    const stats = {
      total_ranks: allRanks.total,
      active_ranks: allRanks.ranks.filter((rank) => rank.is_active).length,
      cities: [...new Set(allRanks.ranks.map((rank) => rank.city))].length,
      provinces: [...new Set(allRanks.ranks.map((rank) => rank.province))]
        .length,
      by_city: this.groupBy(allRanks.ranks, "city"),
      by_province: this.groupBy(allRanks.ranks, "province"),
    };

    return this.successResponse(res, stats);
  });

  getCities = this.asyncHandler(async (req: Request, res: Response) => {
    const allRanks = await this.taxiRankService.getRanks({
      limit: 10000,
      offset: 0,
    });
    const cities = [...new Set(allRanks.ranks.map((rank) => rank.city))].sort();

    return this.successResponse(res, cities);
  });

  getProvinces = this.asyncHandler(async (req: Request, res: Response) => {
    const allRanks = await this.taxiRankService.getRanks({
      limit: 10000,
      offset: 0,
    });
    const provinces = [
      ...new Set(allRanks.ranks.map((rank) => rank.province)),
    ].sort();

    return this.successResponse(res, provinces);
  });

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }
}
