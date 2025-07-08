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
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

// Define RouteData interface locally since the import is missing
export interface RouteData {
  id?: string;
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  origin: {
    name: string;
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  isFavorite?: boolean;
}

export interface SavedRoute extends Omit<RouteData, 'createdAt' | 'savedAt'> {
  userId: string;
  name?: string;
  createdAt: Timestamp;
  savedAt: Timestamp;
}

export class FirestoreRouteService {
  private static readonly COLLECTION = 'routes';

  static async saveRoute(userId: string, routeData: RouteData, name?: string): Promise<string> {
    try {
      const routeToSave: Omit<SavedRoute, 'id'> = {
        ...routeData,
        userId,
        name: name || `Route to ${routeData.destination.name}`,
        createdAt: Timestamp.fromDate(routeData.createdAt),
        savedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), routeToSave);
      return docRef.id;
    } catch (error) {
      console.error('Error saving route:', error);
      throw error;
    }
  }

  static async getUserRoutes(userId: string): Promise<SavedRoute[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        orderBy('savedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const routes: SavedRoute[] = [];
      
      querySnapshot.forEach((doc) => {
        routes.push({
          id: doc.id,
          ...doc.data(),
        } as SavedRoute);
      });
      
      return routes;
    } catch (error) {
      console.error('Error fetching user routes:', error);
      throw error;
    }
  }

  static async getRoute(routeId: string): Promise<SavedRoute | null> {
    try {
      const docRef = doc(db, this.COLLECTION, routeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as SavedRoute;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching route:', error);
      throw error;
    }
  }

  static async updateRoute(routeId: string, updates: Partial<SavedRoute>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, routeId);
      await updateDoc(docRef, {
        ...updates,
        savedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating route:', error);
      throw error;
    }
  }

  static async deleteRoute(routeId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, routeId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting route:', error);
      throw error;
    }
  }

  static async getFavoriteRoutes(userId: string): Promise<SavedRoute[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        where('isFavorite', '==', true),
        orderBy('savedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const routes: SavedRoute[] = [];
      
      querySnapshot.forEach((doc) => {
        routes.push({
          id: doc.id,
          ...doc.data(),
        } as SavedRoute);
      });
      
      return routes;
    } catch (error) {
      console.error('Error fetching favorite routes:', error);
      throw error;
    }
  }
}
