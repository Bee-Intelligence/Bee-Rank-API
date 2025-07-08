import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";

export interface SearchQuery {
  type: 'taxi_ranks' | 'hiking_signs' | 'users' | 'journeys' | 'all';
  query: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchStats {
  totalQueries: number;
  popularQueries: Array<{
    query: string;
    count: number;
  }>;
  searchTypes: Record<string, number>;
  averageResponseTime: number;
}

export class SearchService extends BaseService {
  private initialized = false;
  private searchStats = {
    totalQueries: 0,
    queryHistory: new Map<string, number>(),
    typeStats: new Map<string, number>(),
    responseTimes: [] as number[],
  };

  constructor() {
    super('SearchService');
  }

  async init(): Promise<void> {
    console.log('Initializing SearchService');
    this.initialized = true;
  }

  async search<T = any>(query: SearchQuery): Promise<SearchResult<T>> {
    const startTime = Date.now();
    
    try {
      console.log('Performing search', { 
        type: query.type, 
        query: query.query, 
        page: query.page, 
        limit: query.limit 
      });

      // Update stats
      this.updateSearchStats(query);

      // Mock implementation - replace with actual search logic
      const mockResults = await this.performMockSearch(query);

      // Record response time
      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);

      return mockResults as SearchResult<T>;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async performMockSearch(query: SearchQuery): Promise<SearchResult> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Mock search results based on type
    let mockItems: any[] = [];
    let total = 0;

    switch (query.type) {
      case 'taxi_ranks':
        mockItems = this.getMockTaxiRanks(query.query);
        break;
      case 'hiking_signs':
        mockItems = this.getMockHikingSigns(query.query);
        break;
      case 'users':
        mockItems = this.getMockUsers(query.query);
        break;
      case 'journeys':
        mockItems = this.getMockJourneys(query.query);
        break;
      case 'all':
        mockItems = [
          ...this.getMockTaxiRanks(query.query).slice(0, 5),
          ...this.getMockHikingSigns(query.query).slice(0, 5),
          ...this.getMockUsers(query.query).slice(0, 5),
          ...this.getMockJourneys(query.query).slice(0, 5),
        ];
        break;
      default:
        mockItems = [];
    }

    // Apply filters if provided
    if (query.filters) {
      mockItems = this.applyFilters(mockItems, query.filters);
    }

    total = mockItems.length;

    // Apply pagination
    const paginatedItems = mockItems.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  private getMockTaxiRanks(query: string): any[] {
    const mockRanks = [
      {
        id: 'rank_1',
        name: 'Cape Town Station Taxi Rank',
        location: 'Cape Town CBD',
        capacity: 50,
        operating_hours: '05:00-22:00',
        facilities: ['shelter', 'security'],
        latitude: -33.9249,
        longitude: 18.4241,
      },
      {
        id: 'rank_2',
        name: 'Bellville Taxi Rank',
        location: 'Bellville',
        capacity: 30,
        operating_hours: '05:30-21:30',
        facilities: ['shelter'],
        latitude: -33.8998,
        longitude: 18.6292,
      },
    ];

    if (!query) return mockRanks;

    return mockRanks.filter(rank => 
      rank.name.toLowerCase().includes(query.toLowerCase()) ||
      rank.location.toLowerCase().includes(query.toLowerCase())
    );
  }

  private getMockHikingSigns(query: string): any[] {
    const mockSigns = [
      {
        id: 'sign_1',
        title: 'Table Mountain Trail',
        description: 'Main trail to Table Mountain summit',
        difficulty: 'moderate',
        estimated_time: '2-3 hours',
        latitude: -33.9628,
        longitude: 18.4098,
        uploaded_by: 'user_1',
      },
      {
        id: 'sign_2',
        title: 'Lions Head Trail',
        description: 'Popular sunset hike',
        difficulty: 'easy',
        estimated_time: '1-2 hours',
        latitude: -33.9391,
        longitude: 18.3957,
        uploaded_by: 'user_2',
      },
    ];

    if (!query) return mockSigns;

    return mockSigns.filter(sign => 
      sign.title.toLowerCase().includes(query.toLowerCase()) ||
      sign.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  private getMockUsers(query: string): any[] {
    const mockUsers = [
      {
        id: 'user_1',
        username: 'hiker_john',
        email: 'john@example.com',
        profile: {
          name: 'John Smith',
          bio: 'Avid hiker and photographer',
        },
      },
      {
        id: 'user_2',
        username: 'taxi_driver_mary',
        email: 'mary@example.com',
        profile: {
          name: 'Mary Johnson',
          bio: 'Experienced taxi driver',
        },
      },
    ];

    if (!query) return mockUsers;

    return mockUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.profile.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  private getMockJourneys(query: string): any[] {
    const mockJourneys = [
      {
        id: 'journey_1',
        title: 'Cape Town to Stellenbosch',
        description: 'Daily commute route',
        start_location: 'Cape Town CBD',
        end_location: 'Stellenbosch',
        distance: 45.2,
        estimated_duration: 60,
      },
      {
        id: 'journey_2',
        title: 'Table Mountain Hike',
        description: 'Weekend hiking adventure',
        start_location: 'Lower Cable Station',
        end_location: 'Table Mountain Summit',
        distance: 5.5,
        estimated_duration: 180,
      },
    ];

    if (!query) return mockJourneys;

    return mockJourneys.filter(journey => 
      journey.title.toLowerCase().includes(query.toLowerCase()) ||
      journey.description.toLowerCase().includes(query.toLowerCase()) ||
      journey.start_location.toLowerCase().includes(query.toLowerCase()) ||
      journey.end_location.toLowerCase().includes(query.toLowerCase())
    );
  }

  private applyFilters(items: any[], filters: Record<string, any>): any[] {
    let filteredItems = items;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        filteredItems = filteredItems.filter(item => {
          const itemValue = item[key];
          
          if (typeof value === 'string') {
            return itemValue && itemValue.toString().toLowerCase().includes(value.toLowerCase());
          }
          
          return itemValue === value;
        });
      }
    }

    return filteredItems;
  }

  private updateSearchStats(query: SearchQuery): void {
    this.searchStats.totalQueries++;
    
    // Track query frequency
    const queryKey = query.query.toLowerCase();
    const currentCount = this.searchStats.queryHistory.get(queryKey) || 0;
    this.searchStats.queryHistory.set(queryKey, currentCount + 1);

    // Track search type frequency
    const currentTypeCount = this.searchStats.typeStats.get(query.type) || 0;
    this.searchStats.typeStats.set(query.type, currentTypeCount + 1);
  }

  private recordResponseTime(responseTime: number): void {
    this.searchStats.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.searchStats.responseTimes.length > 1000) {
      this.searchStats.responseTimes = this.searchStats.responseTimes.slice(-1000);
    }
  }

  async getSearchStats(): Promise<SearchStats> {
    try {
      // Get popular queries (top 10)
      const popularQueries = Array.from(this.searchStats.queryHistory.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      // Get search type stats
      const searchTypes = Object.fromEntries(this.searchStats.typeStats);

      // Calculate average response time
      const responseTimes = this.searchStats.responseTimes;
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

      return {
        totalQueries: this.searchStats.totalQueries,
        popularQueries,
        searchTypes,
        averageResponseTime: Math.round(averageResponseTime),
      };
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalQueries: 0,
        popularQueries: [],
        searchTypes: {},
        averageResponseTime: 0,
      };
    }
  }

  async clearSearchHistory(): Promise<void> {
    try {
      this.searchStats.queryHistory.clear();
      this.searchStats.typeStats.clear();
      this.searchStats.responseTimes = [];
      this.searchStats.totalQueries = 0;
      
      console.log('Search history cleared');
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const stats = await this.getSearchStats();
    
    return {
      status: 'healthy',
      details: {
        service: 'SearchService',
        initialized: this.initialized,
        stats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down SearchService');
    this.initialized = false;
  }
}