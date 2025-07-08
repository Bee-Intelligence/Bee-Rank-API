import { db } from "../../../config/firebase";
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';

export async function createFirebaseCollections() {
  try {
    console.log("📋 Setting up Firebase collections...");

    // Create system settings collection with initial document
    const systemSettingsRef = doc(db, 'system_settings', 'app_config');
    const systemSettingsDoc = await getDoc(systemSettingsRef);
    
    if (!systemSettingsDoc.exists()) {
      await setDoc(systemSettingsRef, {
        app_name: 'Bee Rank',
        app_version: '1.0.0',
        maintenance_mode: false,
        max_file_size_mb: 10,
        default_search_radius: 5000,
        rate_limit_requests_per_minute: 60,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log("✅ System settings collection created");
    }

    // Create collections by adding initial documents or ensuring they exist
    const collections = [
      'users',
      'taxi_ranks', 
      'transit_routes',
      'journeys',
      'route_connections',
      'taxis_nearby',
      'hiking_signs',
      'user_activities',
      'analytics_events',
      'location_history',
      'user_devices',
      'notifications',
      'files',
      'reviews',
      'review_votes',
      'api_rate_limits'
    ];

    // Create a metadata document for each collection to ensure they exist
    for (const collectionName of collections) {
      const metadataRef = doc(db, collectionName, '_metadata');
      const metadataDoc = await getDoc(metadataRef);
      
      if (!metadataDoc.exists()) {
        await setDoc(metadataRef, {
          collection_name: collectionName,
          created_at: new Date(),
          description: `Metadata document for ${collectionName} collection`,
          is_metadata: true
        });
      }
    }

    console.log("✅ Firebase collections setup completed");
  } catch (error) {
    console.error("❌ Failed to setup Firebase collections:", error);
    throw error;
  }
}