import { storage } from "../storage/DatabaseStorage";
import { BaseService } from "./BaseService";

export interface SearchQuery {
  type: "taxi_ranks" | "hiking_signs" | "routes" | "users";
  query: string;
  filters?: any;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export class SearchService extends BaseService {
  constructor(serviceName: string) {
    super(serviceName);
  }

  async initialize(): Promise<void> {
    console.log("✅ SearchService initialized");
  }

  async search(searchQuery: SearchQuery): Promise<SearchResult> {
    return this.executeQuery(async () => {
      const { type, query, page = 1, limit = 20 } = searchQuery;

      // Default to taxi_ranks if type is undefined
      const searchType = type || "taxi_ranks";

      let data: any[] = [];
      let total = 0;

      switch (searchType) {
        case "taxi_ranks":
          data = await storage.searchTaxiRanks(query);
          total = data.length;
          break;

        case "hiking_signs":
          // Implement hiking signs search if needed
          data = [];
          total = 0;
          break;

        case "routes":
          // Implement routes search if needed
          data = [];
          total = 0;
          break;

        case "users":
          // Implement users search if needed (be careful with privacy)
          data = [];
          total = 0;
          break;

        default:
          throw new Error(`Unsupported search type: ${type}`);
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedData = data.slice(startIndex, startIndex + limit);

      return {
        data: paginatedData,
        total,
        page,
        limit,
        hasMore: startIndex + limit < total,
      };
    });
  }

  async shutdown(): Promise<void> {
    console.log("🛑 SearchService shutdown");
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    return { status: "healthy" };
  }
}
