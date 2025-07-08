import type { Request, Response } from "express";
import { z } from "zod";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UserSearchParams,
} from "../database/shared/models";
import type { UserService } from "../services";
import { ServiceManager, UserActivityService } from "../services";
import { BaseController } from "./BaseController";

const createUserSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  profile_image_url: z.string().url().optional(),
  role: z.enum(["USER", "ADMIN", "OPERATOR"]).optional(),
});

const updateUserSchema = createUserSchema.partial();

export class UserController extends BaseController {
  constructor(private userService: UserService) {
    super();
  }

  getAll = this.asyncHandler(async (req: Request, res: Response) => {
    const pagination = this.getPaginationParams(req);
    const { search, role, is_active } = req.query;

    const searchParams: UserSearchParams = {
      ...pagination,
      ...(search && { search: search as string }),
      ...(role && { role: role as any }),
      ...(is_active !== undefined && { is_active: is_active === "true" }),
    };

    const { users, total } = await this.userService.getUsers(searchParams);
    return this.paginatedResponse(
      res,
      users,
      total,
      pagination.page!,
      pagination.per_page!,
    );
  });

  getById = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateUUID(req.params.id);
    const user = await this.userService.getUserById(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return this.successResponse(res, user);
  });

  create = this.asyncHandler(async (req: Request, res: Response) => {
    const validatedData = createUserSchema.parse(req.body) as CreateUserRequest;
    
    // Transform request data to service data format
    const userData = {
      email: validatedData.email,
      first_name: validatedData.first_name || '',
      last_name: validatedData.last_name || '',
      phone: validatedData.phone,
      role: validatedData.role as 'USER' | 'ADMIN' | 'DRIVER' || 'USER',
    };
    
    const user = await this.userService.createUser(userData);
    return this.successResponse(res, user, "User created successfully", 201);
  });

  update = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateUUID(req.params.id);
    const validatedData = updateUserSchema.parse(req.body) as UpdateUserRequest;

    const user = await this.userService.updateUser(id, validatedData);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return this.successResponse(res, user, "User updated successfully");
  });

  delete = this.asyncHandler(async (req: Request, res: Response) => {
    const id = this.validateUUID(req.params.id);
    const success = await this.userService.deleteUser(id);

    if (!success) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return this.successResponse(res, null, "User deleted successfully");
  });

  getProfile = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.extractUserId(req);
    const user = await this.userService.getUserProfile(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return this.successResponse(res, user);
  });

  updateProfile = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.extractUserId(req);
    const validatedData = updateUserSchema.parse(req.body) as UpdateUserRequest;

    const user = await this.userService.updateUser(userId, validatedData);
    return this.successResponse(res, user, "Profile updated successfully");
  });

  getUserActivity = this.asyncHandler(async (req: Request, res: Response) => {
    const userId = this.validateUUID(req.params.id);
    const pagination = this.getPaginationParams(req);

    // Get the user activity service
    const userActivityService = ServiceManager.getInstance().getService<UserActivityService>("userActivity");

    if (!userActivityService) {
      return res.status(503).json({
        success: false,
        message: "User activity service unavailable",
      });
    }

    // Get user activities
    const activities = await userActivityService.getUserActivities(
      userId,
      undefined, // activityType
      pagination.per_page,
      (pagination.page! - 1) * pagination.per_page!
    );
    const total = activities.length; // Mock total for now

    return this.paginatedResponse(
      res,
      activities,
      total,
      pagination.page!,
      pagination.per_page!,
      "User activity retrieved successfully"
    );
  });
}
