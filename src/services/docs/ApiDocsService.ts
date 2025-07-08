// src/services/docs/ApiDocsService.ts
import { BaseService } from "../core/base/BaseService";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Router } from "express";

interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: {
    query?: Record<string, any>;
    body?: Record<string, any>;
    path?: string[];
  };
  responses: Record<
    string,
    {
      description: string;
      schema?: Record<string, any>;
    }
  >;
  authentication?: boolean;
  deprecated?: boolean;
  tags?: string[];
}

export class ApiDocsService extends BaseService {
  private endpoints: ApiEndpoint[] = [];
  private readonly docsPath: string;

  constructor() {
    super("apiDocs");
    this.docsPath = join(__dirname, "../../docs/api");
    this.loadEndpoints();
  }

  private loadEndpoints() {
    try {
      const data = readFileSync(join(this.docsPath, "endpoints.json"), "utf-8");
      this.endpoints = JSON.parse(data);
    } catch (error) {
      console.warn("No existing API documentation found");
    }
  }

  registerEndpoint(endpoint: ApiEndpoint) {
    this.endpoints.push(endpoint);
    this.saveEndpoints();
  }

  private saveEndpoints() {
    writeFileSync(
      join(this.docsPath, "endpoints.json"),
      JSON.stringify(this.endpoints, null, 2),
    );
  }

  generateDocs(format: "html" | "markdown" | "openapi" = "openapi") {
    switch (format) {
      case "html":
        return this.generateHtmlDocs();
      case "markdown":
        return this.generateMarkdownDocs();
      case "openapi":
        return this.generateOpenApiSpec();
      default:
        throw new Error(`Unsupported documentation format: ${format}`);
    }
  }

  private generateOpenApiSpec() {
    const spec: any = {
      openapi: "3.0.0",
      info: {
        title: "BeeRank API",
        version: "1.0.0",
        description:
          "API documentation for BeeRank taxi rank management system",
      },
      paths: {} as Record<string, any>,
      components: {
        schemas: {} as Record<string, any>,
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    };

    for (const endpoint of this.endpoints) {
      const path = endpoint.path;
      if (!spec.paths[path]) {
        spec.paths[path] = {};
      }

      spec.paths[path][endpoint.method.toLowerCase()] = {
        summary: endpoint.description,
        tags: endpoint.tags,
        parameters: this.generateOpenApiParameters(endpoint),
        responses: this.generateOpenApiResponses(endpoint),
        security: endpoint.authentication ? [{ bearerAuth: [] }] : undefined,
        deprecated: endpoint.deprecated,
      };
    }

    return spec;
  }

  private generateOpenApiParameters(endpoint: ApiEndpoint) {
    const parameters = [];

    if (endpoint.parameters?.path) {
      parameters.push(
        ...endpoint.parameters.path.map((param) => ({
          name: param,
          in: "path",
          required: true,
          schema: { type: "string" },
        })),
      );
    }

    if (endpoint.parameters?.query) {
      parameters.push(
        ...Object.entries(endpoint.parameters.query).map(([name, schema]) => ({
          name,
          in: "query",
          schema,
        })),
      );
    }

    return parameters;
  }

  private generateOpenApiResponses(endpoint: ApiEndpoint) {
    return Object.entries(endpoint.responses).reduce(
      (acc: Record<string, any>, [code, response]) => {
        acc[code] = {
          description: response.description,
          content: response.schema
            ? {
                "application/json": {
                  schema: response.schema,
                },
              }
            : undefined,
        };
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  private generateMarkdownDocs() {
    // Implementation for Markdown documentation generation
  }

  private generateHtmlDocs() {
    // Implementation for HTML documentation generation
  }
}