import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BaseService } from "./BaseService";

interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  tags?: string[];
  parameters?: {
    path?: string[];
    query?: Record<string, any>;
    body?: any;
  };
  responses: Record<
    string,
    {
      description: string;
      schema?: any;
    }
  >;
  authentication?: boolean;
  deprecated?: boolean;
}

interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  paths: Record<string, Record<string, any>>;
  components: {
    schemas: Record<string, any>;
    securitySchemes: Record<string, any>;
  };
}

export class ApiDocsService extends BaseService {
  private endpoints: ApiEndpoint[] = [];
  private readonly docsPath: string;

  constructor(serviceName: string) {
    super(serviceName);
    this.docsPath = join(process.cwd(), "docs", "api");
    this.ensureDocsDirectory();
  }

  async initialize(): Promise<void> {
    this.loadEndpoints();
    console.log("✅ ApiDocsService initialized");
  }

  async shutdown(): Promise<void> {
    this.saveEndpoints();
    console.log("🛑 ApiDocsService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const docsExist = existsSync(this.docsPath);
      return {
        status: "healthy",
        details: {
          docsPath: this.docsPath,
          endpointsCount: this.endpoints.length,
          docsDirectoryExists: docsExist,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "unhealthy",
        details: { error: errorMessage },
      };
    }
  }

  private ensureDocsDirectory() {
    if (!existsSync(this.docsPath)) {
      mkdirSync(this.docsPath, { recursive: true });
    }
  }

  private loadEndpoints() {
    try {
      const endpointsFile = join(this.docsPath, "endpoints.json");
      if (existsSync(endpointsFile)) {
        const data = readFileSync(endpointsFile, "utf-8");
        this.endpoints = JSON.parse(data);
      }
    } catch (error) {
      console.warn("No existing API documentation found or failed to load");
      this.endpoints = [];
    }
  }

  registerEndpoint(endpoint: ApiEndpoint) {
    // Check if endpoint already exists and update it, otherwise add new
    const existingIndex = this.endpoints.findIndex(
      (ep) => ep.path === endpoint.path && ep.method === endpoint.method,
    );

    if (existingIndex >= 0) {
      this.endpoints[existingIndex] = endpoint;
    } else {
      this.endpoints.push(endpoint);
    }

    this.saveEndpoints();
  }

  private saveEndpoints() {
    try {
      const endpointsFile = join(this.docsPath, "endpoints.json");
      writeFileSync(endpointsFile, JSON.stringify(this.endpoints, null, 2));
    } catch (error) {
      console.error("Failed to save endpoints:", error);
    }
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

  private generateOpenApiSpec(): OpenApiSpec {
    const spec: OpenApiSpec = {
      openapi: "3.0.0",
      info: {
        title: "BeeRank API",
        version: "1.0.0",
        description:
          "API documentation for BeeRank taxi rank management system",
      },
      paths: {},
      components: {
        schemas: {},
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
    const parameters: any[] = [];

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
    const responses: Record<string, any> = {};

    Object.entries(endpoint.responses).forEach(([code, response]) => {
      responses[code] = {
        description: response.description,
        content: response.schema
          ? {
              "application/json": {
                schema: response.schema,
              },
            }
          : undefined,
      };
    });

    return responses;
  }

  private generateMarkdownDocs(): string {
    let markdown = "# BeeRank API Documentation\n\n";

    // Group endpoints by tags
    const groupedEndpoints = this.groupEndpointsByTags();

    for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
      markdown += `## ${tag}\n\n`;

      for (const endpoint of endpoints) {
        markdown += `### ${endpoint.method.toUpperCase()} ${endpoint.path}\n\n`;
        markdown += `${endpoint.description}\n\n`;

        if (endpoint.parameters?.query) {
          markdown += "**Query Parameters:**\n";
          Object.entries(endpoint.parameters.query).forEach(
            ([name, schema]) => {
              markdown += `- \`${name}\`: ${JSON.stringify(schema)}\n`;
            },
          );
          markdown += "\n";
        }

        markdown += "**Responses:**\n";
        Object.entries(endpoint.responses).forEach(([code, response]) => {
          markdown += `- \`${code}\`: ${response.description}\n`;
        });
        markdown += "\n---\n\n";
      }
    }

    return markdown;
  }

  private generateHtmlDocs(): string {
    const markdown = this.generateMarkdownDocs();
    // Simple HTML wrapper - in a real implementation you might use a markdown parser
    return `
<!DOCTYPE html>
<html>
<head>
    <title>BeeRank API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <pre>${markdown}</pre>
</body>
</html>
    `;
  }

  private groupEndpointsByTags(): Record<string, ApiEndpoint[]> {
    const grouped: Record<string, ApiEndpoint[]> = {};

    for (const endpoint of this.endpoints) {
      const tags = endpoint.tags || ["General"];

      for (const tag of tags) {
        if (!grouped[tag]) {
          grouped[tag] = [];
        }
        grouped[tag].push(endpoint);
      }
    }

    return grouped;
  }

  getEndpoints(): ApiEndpoint[] {
    return [...this.endpoints];
  }

  getEndpoint(path: string, method: string): ApiEndpoint | null {
    return (
      this.endpoints.find(
        (ep) =>
          ep.path === path && ep.method.toLowerCase() === method.toLowerCase(),
      ) || null
    );
  }

  removeEndpoint(path: string, method: string): boolean {
    const index = this.endpoints.findIndex(
      (ep) =>
        ep.path === path && ep.method.toLowerCase() === method.toLowerCase(),
    );

    if (index >= 0) {
      this.endpoints.splice(index, 1);
      this.saveEndpoints();
      return true;
    }

    return false;
  }

  exportDocs(format: "html" | "markdown" | "openapi" = "openapi"): void {
    const docs = this.generateDocs(format);
    const extension = format === "openapi" ? "json" : format;
    const filename = `api-docs.${extension}`;
    const filepath = join(this.docsPath, filename);

    const content =
      typeof docs === "string" ? docs : JSON.stringify(docs, null, 2);
    writeFileSync(filepath, content);

    console.log(`API documentation exported to: ${filepath}`);
  }
}
