import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { User, TaxiRank, Journey } from '../../../types/database.types';
import { Route as TransitRoute } from '../../../types/database.types';

export interface PaginationOptions {
  limit?: number;
  lastDoc?: DocumentSnapshot;
}

export interface QueryOptions extends PaginationOptions {
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
    value: any;
  }>;
}

class FirebaseService {
  // Generic CRUD operations
  async create<T>(collectionName: string, data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  async getById<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as T;
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching document from ${collectionName}:`, error);
      throw error;
    }
  }

  async update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  async delete(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  async getAll<T>(collectionName: string, options?: QueryOptions): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [];
      
      // Add filters
      if (options?.filters) {
        options.filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator as any, filter.value));
        });
      }
      
      // Add ordering
      if (options?.orderByField) {
        constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'));
      }
      
      // Add pagination
      if (options?.limit) {
        constraints.push(limit(options.limit));
      }
      
      if (options?.lastDoc) {
        constraints.push(startAfter(options.lastDoc));
      }
      
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const documents: T[] = [];
      querySnapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data(),
        } as T);
      });
      
      return documents;
    } catch (error) {
      console.error(`Error fetching documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // User-specific methods
  async getUsers(options?: QueryOptions): Promise<User[]> {
    return this.getAll<User>('users', options);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.getById<User>('users', id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.getAll<User>('users', {
        filters: [{ field: 'email', operator: '==', value: email }],
        limit: 1,
      });
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    return this.create<User>('users', userData);
  }

  async updateUser(id: string, userData: Partial<User>): Promise<void> {
    return this.update<User>('users', id, userData);
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete('users', id);
  }

  // Taxi Rank-specific methods
  async getTaxiRanks(options?: QueryOptions): Promise<TaxiRank[]> {
    return this.getAll<TaxiRank>('taxi_ranks', {
      ...options,
      filters: [
        { field: 'is_active', operator: '==', value: true },
        ...(options?.filters || []),
      ],
    });
  }

  async getTaxiRankById(id: string): Promise<TaxiRank | null> {
    return this.getById<TaxiRank>('taxi_ranks', id);
  }

  async getTaxiRanksByCity(city: string): Promise<TaxiRank[]> {
    return this.getAll<TaxiRank>('taxi_ranks', {
      filters: [
        { field: 'city', operator: '==', value: city },
        { field: 'is_active', operator: '==', value: true },
      ],
      orderByField: 'popularity_score',
      orderDirection: 'desc',
    });
  }

  async getTaxiRanksByProvince(province: string): Promise<TaxiRank[]> {
    return this.getAll<TaxiRank>('taxi_ranks', {
      filters: [
        { field: 'province', operator: '==', value: province },
        { field: 'is_active', operator: '==', value: true },
      ],
      orderByField: 'popularity_score',
      orderDirection: 'desc',
    });
  }

  async getNearbyTaxiRanks(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<TaxiRank[]> {
    // Note: Firestore doesn't have built-in geospatial queries
    // This is a simplified version - in production, you'd use GeoFirestore or similar
    const allRanks = await this.getTaxiRanks();
    
    return allRanks.filter(rank => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        rank.latitude,
        rank.longitude
      );
      return distance <= radiusKm;
    }).sort((a, b) => {
      const distanceA = this.calculateDistance(latitude, longitude, a.latitude, a.longitude);
      const distanceB = this.calculateDistance(latitude, longitude, b.latitude, b.longitude);
      return distanceA - distanceB;
    });
  }

  async createTaxiRank(rankData: Omit<TaxiRank, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    return this.create<TaxiRank>('taxi_ranks', rankData);
  }

  async updateTaxiRank(id: string, rankData: Partial<TaxiRank>): Promise<void> {
    return this.update<TaxiRank>('taxi_ranks', id, rankData);
  }

  async deleteTaxiRank(id: string): Promise<void> {
    return this.delete('taxi_ranks', id);
  }

  // Transit Route-specific methods
  async getTransitRoutes(options?: QueryOptions): Promise<TransitRoute[]> {
    return this.getAll<TransitRoute>('transit_routes', {
      ...options,
      filters: [
        { field: 'is_active', operator: '==', value: true },
        ...(options?.filters || []),
      ],
    });
  }

  async getTransitRouteById(id: string): Promise<TransitRoute | null> {
    return this.getById<TransitRoute>('transit_routes', id);
  }

  async getRoutesByUser(userId: string): Promise<TransitRoute[]> {
    return this.getAll<TransitRoute>('transit_routes', {
      filters: [
        { field: 'user_id', operator: '==', value: userId },
        { field: 'is_active', operator: '==', value: true },
      ],
      orderByField: 'created_at',
      orderDirection: 'desc',
    });
  }

  async getRoutesByRank(rankId: number): Promise<TransitRoute[]> {
    return this.getAll<TransitRoute>('transit_routes', {
      filters: [
        { field: 'origin_rank_id', operator: '==', value: rankId },
        { field: 'is_active', operator: '==', value: true },
      ],
    });
  }

  async createTransitRoute(routeData: Omit<TransitRoute, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    return this.create<TransitRoute>('transit_routes', routeData);
  }

  async updateTransitRoute(id: string, routeData: Partial<TransitRoute>): Promise<void> {
    return this.update<TransitRoute>('transit_routes', id, routeData);
  }

  async deleteTransitRoute(id: string): Promise<void> {
    return this.delete('transit_routes', id);
  }

  // Journey-specific methods
  async getJourneys(options?: QueryOptions): Promise<Journey[]> {
    return this.getAll<Journey>('journeys', options);
  }

  async getJourneyById(id: string): Promise<Journey | null> {
    return this.getById<Journey>('journeys', id);
  }

  async getUserJourneys(userId: string): Promise<Journey[]> {
    return this.getAll<Journey>('journeys', {
      filters: [{ field: 'user_id', operator: '==', value: userId }],
      orderByField: 'created_at',
      orderDirection: 'desc',
    });
  }

  async getActiveJourneys(userId: string): Promise<Journey[]> {
    return this.getAll<Journey>('journeys', {
      filters: [
        { field: 'user_id', operator: '==', value: userId },
        { field: 'status', operator: 'in', value: ['planned', 'active'] },
      ],
      orderByField: 'created_at',
      orderDirection: 'desc',
    });
  }

  async createJourney(journeyData: Omit<Journey, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    return this.create<Journey>('journeys', journeyData);
  }

  async updateJourney(id: string, journeyData: Partial<Journey>): Promise<void> {
    return this.update<Journey>('journeys', id, journeyData);
  }

  async updateJourneyStatus(id: string, status: Journey['status']): Promise<void> {
    return this.update<Journey>('journeys', id, { status });
  }

  async deleteJourney(id: string): Promise<void> {
    return this.delete('journeys', id);
  }

  // Utility methods
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Search methods
  async searchTaxiRanks(searchTerm: string): Promise<TaxiRank[]> {
    // Note: Firestore doesn't have full-text search built-in
    // This is a simplified version - in production, you'd use Algolia or similar
    const allRanks = await this.getTaxiRanks();
    const searchLower = searchTerm.toLowerCase();
    
    return allRanks.filter(rank =>
      rank.name.toLowerCase().includes(searchLower) ||
      rank.address.toLowerCase().includes(searchLower) ||
      rank.city.toLowerCase().includes(searchLower) ||
      rank.province.toLowerCase().includes(searchLower)
    );
  }

  async searchRoutes(searchTerm: string): Promise<TransitRoute[]> {
    const allRoutes = await this.getTransitRoutes();
    const searchLower = searchTerm.toLowerCase();
    
    return allRoutes.filter(route =>
      route.from_location.toLowerCase().includes(searchLower) ||
      route.to_location.toLowerCase().includes(searchLower) ||
      (route.route_name && route.route_name.toLowerCase().includes(searchLower))
    );
  }
}

export const firebaseService = new FirebaseService();
export default firebaseService;