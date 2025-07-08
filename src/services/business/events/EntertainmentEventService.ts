import { BaseService } from "../../core/base/BaseService";
import { sql } from "../../../config/db";

export interface EntertainmentEvent {
  id: string;
  title: string;
  description: string;
  type: 'theatre' | 'musical' | 'dj' | 'concert' | 'comedy';
  venue: string;
  address: string;
  date: string;
  time: string;
  price: string;
  image?: string;
  distance?: number;
  rating: number;
  is_bookmarked?: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateEntertainmentEventData {
  title: string;
  description: string;
  type: 'theatre' | 'musical' | 'dj' | 'concert' | 'comedy';
  venue: string;
  address: string;
  date: string;
  time: string;
  price: string;
  image?: string;
  rating?: number;
  latitude: number;
  longitude: number;
}

export interface UpdateEntertainmentEventData {
  title?: string;
  description?: string;
  type?: 'theatre' | 'musical' | 'dj' | 'concert' | 'comedy';
  venue?: string;
  address?: string;
  date?: string;
  time?: string;
  price?: string;
  image?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

export class EntertainmentEventService extends BaseService {
  private initialized = false;

  constructor() {
    super('EntertainmentEventService');
  }

  async init(): Promise<void> {
    console.log('Initializing EntertainmentEventService');
    this.initialized = true;
  }

  async createEvent(eventData: CreateEntertainmentEventData): Promise<EntertainmentEvent> {
    return this.executeQuery(async () => {
      console.log('Creating new entertainment event', { title: eventData.title });
      
      const [event] = await sql`
        INSERT INTO entertainment_events (
          title, description, type, venue, address, date, time, price, image, rating, latitude, longitude
        ) VALUES (
          ${eventData.title}, ${eventData.description}, ${eventData.type}, ${eventData.venue}, 
          ${eventData.address}, ${eventData.date}, ${eventData.time}, ${eventData.price}, 
          ${eventData.image || null}, ${eventData.rating || 0}, ${eventData.latitude}, ${eventData.longitude}
        ) RETURNING *
      `;

      return this.formatEvent(event);
    });
  }

  async getEventById(id: string): Promise<EntertainmentEvent | null> {
    return this.executeQuery(async () => {
      console.log('Getting entertainment event by ID', { id });
      
      const [event] = await sql`
        SELECT * FROM entertainment_events WHERE id = ${id}
      `;

      return event ? this.formatEvent(event) : null;
    });
  }

  async getAllEvents(limit: number = 20, offset: number = 0): Promise<EntertainmentEvent[]> {
    return this.executeQuery(async () => {
      console.log('Getting all entertainment events', { limit, offset });
      
      const events = await sql`
        SELECT * FROM entertainment_events 
        ORDER BY date ASC, time ASC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return events.map(event => this.formatEvent(event));
    });
  }

  async getEventsByType(type: string): Promise<EntertainmentEvent[]> {
    return this.executeQuery(async () => {
      console.log('Getting entertainment events by type', { type });
      
      const events = await sql`
        SELECT * FROM entertainment_events 
        WHERE type = ${type}
        ORDER BY date ASC, time ASC
      `;

      return events.map(event => this.formatEvent(event));
    });
  }

  async getEventsByVenue(venue: string): Promise<EntertainmentEvent[]> {
    return this.executeQuery(async () => {
      console.log('Getting entertainment events by venue', { venue });
      
      const events = await sql`
        SELECT * FROM entertainment_events 
        WHERE venue ILIKE ${`%${venue}%`}
        ORDER BY date ASC, time ASC
      `;

      return events.map(event => this.formatEvent(event));
    });
  }

  async getEventsByDate(date: string): Promise<EntertainmentEvent[]> {
    return this.executeQuery(async () => {
      console.log('Getting entertainment events by date', { date });
      
      const events = await sql`
        SELECT * FROM entertainment_events 
        WHERE date = ${date}
        ORDER BY time ASC
      `;

      return events.map(event => this.formatEvent(event));
    });
  }

  async getNearbyEvents(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<EntertainmentEvent[]> {
    return this.executeQuery(async () => {
      console.log('Getting nearby entertainment events', { latitude, longitude, radiusKm });
      
      const events = await sql`
        SELECT *, 
          (6371 * acos(cos(radians(${latitude})) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(${longitude})) + 
          sin(radians(${latitude})) * sin(radians(latitude)))) AS distance
        FROM entertainment_events
        HAVING distance <= ${radiusKm}
        ORDER BY distance ASC, date ASC
      `;

      return events.map(event => this.formatEvent(event));
    });
  }

  async updateEvent(id: string, updateData: UpdateEntertainmentEventData): Promise<EntertainmentEvent | null> {
    return this.executeQuery(async () => {
      console.log('Updating entertainment event', { id, updateData });
      
      if (Object.keys(updateData).length === 0) {
        return this.getEventById(id);
      }

      // Build dynamic update query
      const setClause = Object.keys(updateData).map(key => `${key} = $${key}`).join(', ');
      
      const [event] = await sql`
        UPDATE entertainment_events
        SET ${sql.unsafe(setClause)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return event ? this.formatEvent(event) : null;
    });
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.executeQuery(async () => {
      console.log('Deleting entertainment event', { id });
      
      const result = await sql`
        DELETE FROM entertainment_events WHERE id = ${id}
      `;

      return Array.isArray(result) && result.length > 0;
    });
  }

  async bookmarkEvent(eventId: string, userId: string): Promise<boolean> {
    return this.executeQuery(async () => {
      console.log('Bookmarking entertainment event', { eventId, userId });
      
      await sql`
        INSERT INTO user_event_bookmarks (user_id, event_id)
        VALUES (${userId}, ${eventId})
        ON CONFLICT (user_id, event_id) DO NOTHING
      `;

      return true;
    });
  }

  async unbookmarkEvent(eventId: string, userId: string): Promise<boolean> {
    return this.executeQuery(async () => {
      console.log('Unbookmarking entertainment event', { eventId, userId });
      
      const result = await sql`
        DELETE FROM user_event_bookmarks
        WHERE user_id = ${userId} AND event_id = ${eventId}
      `;

      return Array.isArray(result) && result.length > 0;
    });
  }

  async getUserBookmarkedEvents(userId: string): Promise<EntertainmentEvent[]> {
    return this.executeQuery(async () => {
      console.log('Getting user bookmarked events', { userId });
      
      const events = await sql`
        SELECT e.*, true as is_bookmarked
        FROM entertainment_events e
        INNER JOIN user_event_bookmarks b ON e.id = b.event_id
        WHERE b.user_id = ${userId}
        ORDER BY e.date ASC, e.time ASC
      `;

      return events.map(event => this.formatEvent(event));
    });
  }

  async searchEvents(query: string): Promise<EntertainmentEvent[]> {
    return this.executeQuery(async () => {
      console.log('Searching entertainment events', { query });
      
      const events = await sql`
        SELECT * FROM entertainment_events 
        WHERE title ILIKE ${`%${query}%`} 
           OR description ILIKE ${`%${query}%`}
           OR venue ILIKE ${`%${query}%`}
           OR address ILIKE ${`%${query}%`}
        ORDER BY date ASC, time ASC
      `;

      return events.map(event => this.formatEvent(event));
    });
  }

  async getEventStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    upcoming: number;
    thisWeek: number;
  }> {
    return this.executeQuery(async () => {
      console.log('Getting entertainment event statistics');
      
      const [totalResult] = await sql`
        SELECT COUNT(*) as total FROM entertainment_events
      `;

      const typeStats = await sql`
        SELECT type, COUNT(*) as count 
        FROM entertainment_events 
        GROUP BY type
      `;

      const [upcomingResult] = await sql`
        SELECT COUNT(*) as upcoming 
        FROM entertainment_events 
        WHERE date >= CURRENT_DATE
      `;

      const [thisWeekResult] = await sql`
        SELECT COUNT(*) as this_week 
        FROM entertainment_events 
        WHERE date >= CURRENT_DATE 
        AND date <= CURRENT_DATE + INTERVAL '7 days'
      `;

      const byType: Record<string, number> = {};
      typeStats.forEach(stat => {
        byType[stat.type] = parseInt(stat.count);
      });

      return {
        total: parseInt(totalResult.total),
        byType,
        upcoming: parseInt(upcomingResult.upcoming),
        thisWeek: parseInt(thisWeekResult.this_week),
      };
    });
  }

  private formatEvent(event: any): EntertainmentEvent {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      venue: event.venue,
      address: event.address,
      date: event.date,
      time: event.time,
      price: event.price,
      image: event.image,
      rating: parseFloat(event.rating) || 0,
      is_bookmarked: event.is_bookmarked || false,
      location: {
        latitude: parseFloat(event.latitude),
        longitude: parseFloat(event.longitude),
      },
      created_at: event.created_at,
      updated_at: event.updated_at,
    };
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    return {
      status: 'healthy',
      details: {
        service: 'EntertainmentEventService',
        initialized: this.initialized,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down EntertainmentEventService');
    this.initialized = false;
  }
}