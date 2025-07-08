import { BaseService } from '../../core/base/BaseService';
import { firebaseDatabaseConfig } from '../../../config/firebaseDatabase';
import { db } from '../../../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentSnapshot,
  QueryConstraint
} from 'firebase/firestore';

export class FirebaseBaseService extends BaseService {
  private db = db;

  constructor() {
    super('FirebaseService');
  }

  async initialize(): Promise<void> {
    try {
      await firebaseDatabaseConfig.initialize();
      console.log('✅ Firebase service initialized');
    } catch (error) {
      console.error('❌ Firebase service initialization failed:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Firebase doesn't require explicit shutdown, but we can log it
      console.log('🔄 Firebase service shutting down...');
      console.log('✅ Firebase service shutdown completed');
    } catch (error) {
      console.error('❌ Firebase service shutdown failed:', error);
      throw error;
    }
  }

  // Generic CRUD operations
  async create(collectionName: string, data: any, docId?: string): Promise<string> {
    try {
      const timestamp = new Date();
      const docData = {
        ...data,
        created_at: timestamp,
        updated_at: timestamp
      };

      if (docId) {
        const docRef = doc(this.db, collectionName, docId);
        await setDoc(docRef, docData);
        return docId;
      } else {
        const docRef = await addDoc(collection(this.db, collectionName), docData);
        return docRef.id;
      }
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  async getById(collectionName: string, docId: string): Promise<any | null> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  async getAll(collectionName: string, constraints: QueryConstraint[] = []): Promise<any[]> {
    try {
      const collectionRef = collection(this.db, collectionName);
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  async update(collectionName: string, docId: string, data: any): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      const updateData = {
        ...data,
        updated_at: new Date()
      };
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  async delete(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  // Specialized query methods
  async findByField(collectionName: string, field: string, value: any): Promise<any[]> {
    try {
      const q = query(collection(this.db, collectionName), where(field, '==', value));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error finding documents by ${field} in ${collectionName}:`, error);
      throw error;
    }
  }

  async findWithPagination(
    collectionName: string, 
    pageSize: number = 10, 
    lastDoc?: DocumentSnapshot,
    constraints: QueryConstraint[] = []
  ): Promise<{ data: any[], lastDoc: DocumentSnapshot | null }> {
    try {
      const collectionRef = collection(this.db, collectionName);
      let queryConstraints = [...constraints, limit(pageSize)];
      
      if (lastDoc) {
        queryConstraints.push(startAfter(lastDoc));
      }
      
      const q = query(collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      
      return { data, lastDoc: lastDocument };
    } catch (error) {
      console.error(`Error getting paginated documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Specific business logic methods
  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const users = await this.findByField('users', 'email', email);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getTaxiRanksByCity(city: string): Promise<any[]> {
    try {
      return await this.findByField('taxi_ranks', 'city', city);
    } catch (error) {
      console.error('Error getting taxi ranks by city:', error);
      throw error;
    }
  }

  async getActiveRoutes(): Promise<any[]> {
    try {
      const q = query(
        collection(this.db, 'transit_routes'),
        where('is_active', '==', true),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting active routes:', error);
      throw error;
    }
  }

  async getUserJourneys(userId: string): Promise<any[]> {
    try {
      const q = query(
        collection(this.db, 'journeys'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting user journeys:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const result = await firebaseDatabaseConfig.healthCheck();
      return {
        status: result.status,
        details: {
          timestamp: result.timestamp,
          info: result.info
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Batch operations
  async batchCreate(collectionName: string, documents: any[]): Promise<string[]> {
    try {
      const ids: string[] = [];
      const timestamp = new Date();
      
      // Firebase has a limit of 500 operations per batch
      const batchSize = 500;
      
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        for (const docData of batch) {
          const docRef = await addDoc(collection(this.db, collectionName), {
            ...docData,
            created_at: timestamp,
            updated_at: timestamp
          });
          ids.push(docRef.id);
        }
      }
      
      return ids;
    } catch (error) {
      console.error(`Error batch creating documents in ${collectionName}:`, error);
      throw error;
    }
  }
}

export default FirebaseBaseService;