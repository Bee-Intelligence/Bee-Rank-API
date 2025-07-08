import type { Request, Response } from "express";
import { hikingSignQuerySchema } from "../database/schema/signs/hikingSignQuerySchema";
import { insertHikingSignSchema } from "../database/schema/signs/insertHikingSignSchema";
import { updateHikingSignSchema } from "../database/schema/signs/updateHikingSignSchema";
import type { HikingSignService } from "../services";
import { ServiceManager } from "../services";
import type { UserActivityService } from "../services";
import { BaseController } from "./BaseController";

export class HikingSignController extends BaseController {
  constructor(private hikingSignService: HikingSignService) {
    super();
  }

  getAll = this.asyncHandler(async (req: Request, res: Response) => {
    const validatedQuery = hikingSignQuerySchema.parse(req.query);
    const pagination = this.getPaginationParams(req);

    const searchParams = {
      ...pagination,
      latitude: validatedQuery.latitude,
      longitude: validatedQuery.longitude,
      radius: validatedQuery.radius,
      is_verified: validatedQuery.isVerified,
      user_id: validatedQuery.userId,
    };

    const signs = await this.hikingSignService.getAllHikingSigns(
      pagination.per_page,
      pagination.offset
    );
    return this.successResponse(res, signs);
  });

  getById = this.asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const sign = await this.hikingSignService.getHikingSignById(id);

    if (!sign) {
      return res
        .status(404)
        .json({ success: false, message: "Hiking sign not found" });
    }

    return this.successResponse(res, sign);
  });

  getNearby = this.asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const nearbySigns = await this.hikingSignService.getNearbyHikingSigns(
      Number.parseFloat(latitude as string),
      Number.parseFloat(longitude as string),
      Number.parseFloat(radius as string),
    );

    return this.successResponse(res, nearbySigns);
  });

  create = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = "demo-User"; // Extract from auth token in production

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    // Generate image URL (in production, upload to cloud storage)
    const imageUrl = `https://storage.example.com/hiking-signs/${Date.now()}-${req.file.originalname}`;

    const validatedData = insertHikingSignSchema.parse({
      ...req.body,
      userId,
      imageUrl,
      latitude: Number.parseFloat(req.body.latitude),
      longitude: Number.parseFloat(req.body.longitude),
      fareAmount: req.body.fareAmount
        ? Number.parseFloat(req.body.fareAmount)
        : undefined,
    });

    // Map to database field names (snake_case)
    const signData = {
      user_id: validatedData.userId,
      image_url: validatedData.imageUrl,
      description: validatedData.description,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
      address: validatedData.address,
      from_location: validatedData.fromLocation,
      to_location: validatedData.toLocation,
      fare_amount: validatedData.fareAmount,
      sign_type: validatedData.signType,
      destination: validatedData.toLocation || validatedData.address || 'Unknown',
      fare: validatedData.fareAmount || 0,
    };

    const sign = await this.hikingSignService.createHikingSign(signData);

    // Track user activity
    try {
      const userActivityService =
        ServiceManager.getInstance().getService<UserActivityService>(
          "userActivity",
        );
      if (userActivityService) {
        await userActivityService.recordActivity({
          user_id: userId,
          activity_type: "SIGN_UPLOADED",
          description: `Uploaded hiking sign: ${sign.description || "No description"}`,
          metadata: {
            signId: sign.id,
            signName: sign.description,
            location: `${signData.latitude}, ${signData.longitude}`,
          },
        });
      }
    } catch (activityError) {
      console.warn("Failed to track user activity:", activityError);
    }

    return this.successResponse(
      res,
      sign,
      "Hiking sign created successfully",
      201,
    );
  });

  update = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const validatedData = updateHikingSignSchema.parse(req.body);

    // Map to database field names if needed
    const updateData = {
      ...(validatedData.userId && { user_id: validatedData.userId }),
      ...(validatedData.imageUrl && { image_url: validatedData.imageUrl }),
      ...(validatedData.description !== undefined && {
        description: validatedData.description,
      }),
      ...(validatedData.latitude !== undefined && {
        latitude: validatedData.latitude,
      }),
      ...(validatedData.longitude !== undefined && {
        longitude: validatedData.longitude,
      }),
      ...(validatedData.address !== undefined && {
        address: validatedData.address,
      }),
      ...(validatedData.fromLocation !== undefined && {
        from_location: validatedData.fromLocation,
      }),
      ...(validatedData.toLocation !== undefined && {
        to_location: validatedData.toLocation,
      }),
      ...(validatedData.fareAmount !== undefined && {
        fare_amount: validatedData.fareAmount,
      }),
      ...(validatedData.signType && { sign_type: validatedData.signType }),
    };

    const sign = await this.hikingSignService.updateHikingSign(req.params.id, updateData);
    if (!sign) {
      return res
        .status(404)
        .json({ success: false, message: "Hiking sign not found" });
    }

    return this.successResponse(res, sign, "Hiking sign updated successfully");
  });

  delete = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const success = await this.hikingSignService.deleteHikingSign(req.params.id);

    if (!success) {
      return res
        .status(404)
        .json({ success: false, message: "Hiking sign not found" });
    }

    return this.successResponse(res, null, "Hiking sign deleted successfully");
  });

  verify = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateId(req.params.id);
    const userId = "demo-User"; // Extract from auth token in production

    const sign = await this.hikingSignService.verifyHikingSign(req.params.id, userId, 'VERIFIED');
    if (!sign) {
      return res
        .status(404)
        .json({ success: false, message: "Hiking sign not found" });
    }

    return this.successResponse(res, sign, "Hiking sign verified successfully");
  });

  getUserSigns = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = "demo-User"; // Extract from auth token in production
    const pagination = this.getPaginationParams(req);

    const searchParams = {
      ...pagination,
      user_id: userId,
    };

    const signs = await this.hikingSignService.getUserHikingSigns(
      userId,
      pagination.per_page,
      pagination.offset
    );
    return this.successResponse(res, signs);
  });

  getVerified = this.asyncHandler(async (req: Request, res: Response) => {
    const signs = await this.hikingSignService.getAllHikingSigns();
    return this.successResponse(res, signs);
  });
}
