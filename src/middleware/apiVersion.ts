// src/middleware/apiVersion.ts
import type { NextFunction, Request as ExpressRequest, Response } from "express";
import semver from "semver";

// Extend the Request interface to include apiVersion
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}

type Request = ExpressRequest;

interface VersionConfig {
  minVersion: string;
  maxVersion: string;
  deprecated?: boolean;
  sunset?: Date;
}

const API_VERSIONS: Record<string, VersionConfig> = {
  "1": {
    minVersion: "1.0.0",
    maxVersion: "1.9.9",
    deprecated: true,
    sunset: new Date("2025-12-31"),
  },
  "2": {
    minVersion: "2.0.0",
    maxVersion: "2.9.9",
  },
};

export const apiVersion = (req: Request, res: Response, next: NextFunction) => {
  const version = (req.headers["accept-version"] as string) || "2";
  const config = API_VERSIONS[version as keyof typeof API_VERSIONS];

  if (!config) {
    return res.status(400).json({
      error: "Unsupported API version",
    });
  }

  if (config.deprecated) {
    res.setHeader("Deprecation", "true");
    if (config.sunset) {
      res.setHeader("Sunset", config.sunset.toUTCString());
    }
  }

  req.apiVersion = version;
  next();
};

export const versionedRoute = (
  versions: string[],
  handler: (req: Request, res: Response, next: NextFunction) => void,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (versions.includes(req.apiVersion as string)) {
      return handler(req, res, next);
    }
    next();
  };
};
