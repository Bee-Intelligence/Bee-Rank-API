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

    const ranks = await this.taxiRankService.getAllTaxiRanks(
      pagination.per_page,
      pagination.offset
    );
    return this.successResponse(res, ranks);
  });

  getById = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const rank = await this.taxiRankService.getTaxiRankById(req.params.id);

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

    const nearbyRanks = await this.taxiRankService.getNearbyTaxiRanks(
      latitude,
      longitude,
      radius / 1000, // Convert meters to kilometers
    );
    return this.successResponse(res, nearbyRanks);
  });

  create = this.asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createTaxiRankSchema.parse(
      req.body,
    ) as CreateTaxiRankRequest;
    
    const rankData = {
      name: validatedData.name,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      address: validatedData.address,
      city: validatedData.city,
      province: validatedData.province,
      capacity: validatedData.capacity || 50,
      operating_hours: this.transformOperatingHours(validatedData.operating_hours),
      facilities: this.transformFacilities(validatedData.facilities),
    };
    
    const rank = await this.taxiRankService.createTaxiRank(rankData);
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

    const updateData = {
      name: validatedData.name,
      address: validatedData.address,
      capacity: validatedData.capacity,
      operating_hours: this.transformOperatingHours(validatedData.operating_hours),
      facilities: this.transformFacilities(validatedData.facilities),
      is_active: validatedData.is_active,
    };
    
    const rank = await this.taxiRankService.updateTaxiRank(req.params.id, updateData);
    if (!rank) {
      return res
        .status(404)
        .json({ success: false, message: "Taxi rank not found" });
    }

    return this.successResponse(res, rank, "Taxi rank updated successfully");
  });

  delete = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const success = await this.taxiRankService.deleteTaxiRank(req.params.id);

    if (!success) {
      return res
        .status(404)
        .json({ success: false, message: "Taxi rank not found" });
    }

    return this.successResponse(res, null, "Taxi rank deleted successfully");
  });

  getByCity = this.asyncHandler(async (req: Request, res: Response) => {
    const { city } = req.params;
    const ranks = await this.taxiRankService.getTaxiRanksByCity(city);
    return this.successResponse(res, ranks);
  });

  getByProvince = this.asyncHandler(async (req: Request, res: Response) => {
    const { province } = req.params;
    const ranks = await this.taxiRankService.getTaxiRanksByProvince(province);
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

    const ranks = await this.taxiRankService.searchTaxiRanks(query.trim());
    return this.successResponse(res, ranks);
  });

  getStats = this.asyncHandler(async (req: Request, res: Response) => {
    // Get basic statistics about taxi ranks
    const stats = await this.taxiRankService.getTaxiRankStats();

    return this.successResponse(res, stats);
  });

  getCities = this.asyncHandler(async (req: Request, res: Response) => {
    const allRanks = await this.taxiRankService.getAllTaxiRanks(10000, 0);
    const cities = [...new Set(allRanks.map((rank) => rank.city))].sort();

    return this.successResponse(res, cities);
  });

  getProvinces = this.asyncHandler(async (req: Request, res: Response) => {
    const allRanks = await this.taxiRankService.getAllTaxiRanks(10000, 0);
    const provinces = [
      ...new Set(allRanks.map((rank) => rank.province)),
    ].sort();

    return this.successResponse(res, provinces);
  });

  private transformOperatingHours(hours?: Record<string, string>): { open: string; close: string } | undefined {
    if (!hours) return undefined;
    
    // If it's already in the correct format
    if ('open' in hours && 'close' in hours) {
      return { open: hours.open, close: hours.close };
    }
    
    // Try to extract from various possible formats
    const open = hours.open || hours.opening || hours.start || '06:00';
    const close = hours.close || hours.closing || hours.end || '22:00';
    
    return { open, close };
  }

  private transformFacilities(facilities?: Record<string, any>): string[] | undefined {
    if (!facilities) return undefined;
    
    // If it's already an array
    if (Array.isArray(facilities)) {
      return facilities.map(f => String(f));
    }
    
    // If it's an object, extract values or keys
    if (typeof facilities === 'object') {
      // Try to get values first, then keys
      const values = Object.values(facilities);
      if (values.length > 0 && values.every(v => typeof v === 'string' || typeof v === 'boolean')) {
        return values.filter(v => v).map(v => String(v));
      }
      
      // Fall back to keys
      return Object.keys(facilities);
    }
    
    return undefined;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }
}
