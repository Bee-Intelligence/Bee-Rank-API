import { db } from "../../config/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

export async function seedAllFirebaseData() {
  try {
    console.log("🌱 Populating Firebase database with sample data...");

    // Check if data already exists to avoid duplicates
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(query(usersCollection, limit(1)));
    
    if (!usersSnapshot.empty) {
      console.log("📊 Firebase database already has data, skipping population");
      return;
    }

    // Populate users first (referenced by other collections)
    const userIds = await populateUsers();
    
    // Insert admin and App Settings
    await insertInitialData();
    
    // Populate taxi ranks
    const rankIds = await populateTaxiRanks();
    
    // Populate transit routes
    const routeIds = await populateTransitRoutes(rankIds);
    
    // Populate journeys
    const journeyIds = await populateJourneys(userIds, rankIds);
    
    // Populate route connections
    await populateRouteConnections(journeyIds, routeIds);
    
    // Populate taxis nearby
    await populateTaxisNearby(routeIds);
    
    // Populate hiking signs
    await populateHikingSigns(userIds);
    
    // Populate User activities
    await populateUserActivities(userIds, rankIds);
    
    // Populate analytics events
    await populateAnalyticsEvents(userIds);
    
    // Populate location history
    await populateLocationHistory(userIds);
    
    // Populate User devices
    await populateUserDevices(userIds);
    
    // Populate notifications
    await populateNotifications(userIds);
    
    // Populate files
    await populateFiles(userIds);
    
    // Populate reviews
    await populateReviews(userIds);
    
    // Populate review votes
    await populateReviewVotes();
    
    // Populate API rate limits
    await populateApiRateLimits(userIds);

    // Populate new service collections
    await populateEmailTemplates();
    await populateEmailQueue(userIds);
    await populateFeatureFlags();
    await populateAuthSessions(userIds);
    await populateCacheEntries();
    await populateWebSocketSessions(userIds);
    const eventIds = await populateEntertainmentEvents();
    await populateUserEventBookmarks(userIds, eventIds);

    console.log("✅ Firebase database population completed successfully");
  } catch (error) {
    console.error("❌ Firebase database population failed:", error);
    throw error;
  }
}

async function populateUsers(): Promise<string[]> {
  console.log("👥 Populating users...");

  const users = [
    {
      email: "john.doe@example.com",
      password_hash: "$2b$10$hash1",
      first_name: "John",
      last_name: "Doe",
      phone: "+27123456789",
      role: "USER",
    },
    {
      email: "jane.smith@example.com",
      password_hash: "$2b$10$hash2",
      first_name: "Jane",
      last_name: "Smith",
      phone: "+27987654321",
      role: "USER",
    },
    {
      email: "admin@beerank.com",
      password_hash: "$2b$10$hash3",
      first_name: "Admin",
      last_name: "User",
      phone: "+27111222333",
      role: "ADMIN",
    },
    {
      email: "operator@beerank.com",
      password_hash: "$2b$10$hash4",
      first_name: "Operator",
      last_name: "User",
      phone: "+27444555666",
      role: "OPERATOR",
    },
    {
      email: "mike.johnson@example.com",
      password_hash: "$2b$10$hash5",
      first_name: "Mike",
      last_name: "Johnson",
      phone: "+27777888999",
      role: "USER",
    },
    {
      email: "sarah.wilson@example.com",
      password_hash: "$2b$10$hash6",
      first_name: "Sarah",
      last_name: "Wilson",
      phone: "+27222333444",
      role: "USER",
    },
    {
      email: "david.brown@example.com",
      password_hash: "$2b$10$hash7",
      first_name: "David",
      last_name: "Brown",
      phone: "+27555666777",
      role: "USER",
    },
    {
      email: "lisa.davis@example.com",
      password_hash: "$2b$10$hash8",
      first_name: "Lisa",
      last_name: "Davis",
      phone: "+27888999000",
      role: "USER",
    },
    {
      email: "chris.miller@example.com",
      password_hash: "$2b$10$hash9",
      first_name: "Chris",
      last_name: "Miller",
      phone: "+27333444555",
      role: "USER",
    },
    {
      email: "emma.taylor@example.com",
      password_hash: "$2b$10$hash10",
      first_name: "Emma",
      last_name: "Taylor",
      phone: "+27666777888",
      role: "USER",
    },
  ];

  const userIds: string[] = [];
  const batch = writeBatch(db);

  for (const user of users) {
    const userRef = doc(collection(db, 'users'));
    batch.set(userRef, {
      ...user,
      is_email_verified: true,
      is_active: true,
      is_first_time_launch: true,
      is_phone_verified: false,
      metadata: {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    userIds.push(userRef.id);
  }

  await batch.commit();
  console.log(`✅ Inserted ${userIds.length} users`);
  return userIds;
}

async function insertInitialData() {
  try {
    console.log("📝 Inserting initial data...");

    // Check if we already have system settings
    const settingsSnapshot = await getDocs(collection(db, 'system_settings'));
    if (settingsSnapshot.size > 1) { // More than just metadata doc
      console.log("📊 Database already has system settings, skipping initial data insertion");
      return;
    }

    // Insert default system settings
    const settingsData = [
      {
        setting_key: 'app_name',
        setting_value: 'Bee Rank',
        setting_type: 'string',
        description: 'Application name',
        is_public: true
      },
      {
        setting_key: 'app_version',
        setting_value: '1.0.0',
        setting_type: 'string',
        description: 'Current application version',
        is_public: true
      },
      {
        setting_key: 'maintenance_mode',
        setting_value: 'false',
        setting_type: 'boolean',
        description: 'Maintenance mode flag',
        is_public: false
      },
      {
        setting_key: 'max_file_size_mb',
        setting_value: '10',
        setting_type: 'number',
        description: 'Maximum file upload size in MB',
        is_public: false
      },
      {
        setting_key: 'default_search_radius',
        setting_value: '5000',
        setting_type: 'number',
        description: 'Default search radius in meters',
        is_public: true
      },
      {
        setting_key: 'rate_limit_requests_per_minute',
        setting_value: '60',
        setting_type: 'number',
        description: 'API rate limit',
        is_public: false
      }
    ];

    const batch = writeBatch(db);
    for (const setting of settingsData) {
      const settingRef = doc(collection(db, 'system_settings'));
      batch.set(settingRef, {
        ...setting,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    }

    await batch.commit();
    console.log("✅ Initial system settings inserted");
  } catch (error) {
    console.error("❌ Failed to insert initial data:", error);
    throw error;
  }
}

async function populateTaxiRanks(): Promise<string[]> {
  console.log("🚕 Populating taxi ranks...");

  const taxiRanks = [
    {
      name: "Cape Town CBD Taxi Rank",
      description: "Main taxi rank serving Cape Town CBD area",
      latitude: -33.9249,
      longitude: 18.4241,
      address: "Corner of Strand & Adderley Street, Cape Town, 8001",
      city: "Cape Town",
      province: "Western Cape",
      capacity: 50,
      contact_number: "+27214441234",
    },
    {
      name: "Wynberg Taxi Rank",
      description: "Primary transport hub for Wynberg and surrounding areas",
      latitude: -34.0186,
      longitude: 18.4745,
      address: "Main Road, Wynberg, Cape Town, 7800",
      city: "Cape Town",
      province: "Western Cape",
      capacity: 30,
      contact_number: "+27214442345",
    },
    {
      name: "Bellville Taxi Terminal",
      description: "Major taxi terminus serving northern suburbs",
      latitude: -33.8903,
      longitude: 18.6292,
      address: "Voortrekker Road, Bellville, 7530",
      city: "Bellville",
      province: "Western Cape",
      capacity: 80,
      contact_number: "+27214443456",
    },
    {
      name: "Mitchell's Plain Taxi Rank",
      description: "Serving Mitchell's Plain and surrounding townships",
      latitude: -34.0342,
      longitude: 18.6290,
      address: "AZ Berman Drive, Mitchell's Plain, 7785",
      city: "Cape Town",
      province: "Western Cape",
      capacity: 40,
      contact_number: "+27214444567",
    },
    {
      name: "Khayelitsha Taxi Rank",
      description: "Main transport hub for Khayelitsha community",
      latitude: -34.0293,
      longitude: 18.6920,
      address: "Ntlazane Road, Khayelitsha, 7784",
      city: "Cape Town",
      province: "Western Cape",
      capacity: 60,
      contact_number: "+27214445678",
    },
    {
      name: "Durban Central Taxi Rank",
      description: "Primary taxi rank in Durban city center",
      latitude: -29.8587,
      longitude: 31.0218,
      address: "Brook Street, Durban Central, 4001",
      city: "Durban",
      province: "KwaZulu-Natal",
      capacity: 70,
      contact_number: "+27313331234",
    },
    {
      name: "Johannesburg Park Station",
      description: "Major transport interchange at Park Station",
      latitude: -26.2041,
      longitude: 28.0473,
      address: "Rissik Street, Johannesburg, 2000",
      city: "Johannesburg",
      province: "Gauteng",
      capacity: 100,
      contact_number: "+27114441234",
    },
    {
      name: "Pretoria CBD Taxi Rank",
      description: "Central taxi rank serving Pretoria CBD",
      latitude: -25.7479,
      longitude: 28.2293,
      address: "Church Street, Pretoria Central, 0002",
      city: "Pretoria",
      province: "Gauteng",
      capacity: 45,
      contact_number: "+27124441234",
    },
    {
      name: "Port Elizabeth Central",
      description: "Main taxi rank in Port Elizabeth city center",
      latitude: -33.9608,
      longitude: 25.6022,
      address: "Baakens Street, Central, Port Elizabeth, 6001",
      city: "Port Elizabeth",
      province: "Eastern Cape",
      capacity: 35,
      contact_number: "+27414441234",
    },
    {
      name: "Bloemfontein CBD Rank",
      description: "Primary taxi rank serving Bloemfontein CBD",
      latitude: -29.0852,
      longitude: 26.1596,
      address: "Maitland Street, Bloemfontein, 9300",
      city: "Bloemfontein",
      province: "Free State",
      capacity: 25,
      contact_number: "+27514441234",
    },
  ];

  const rankIds: string[] = [];
  const batch = writeBatch(db);

  for (const rank of taxiRanks) {
    const rankRef = doc(collection(db, 'taxi_ranks'));
    batch.set(rankRef, {
      ...rank,
      facilities: {},
      operating_hours: {
        monday: "06:00-22:00",
        tuesday: "06:00-22:00", 
        wednesday: "06:00-22:00",
        thursday: "06:00-22:00",
        friday: "06:00-22:00",
        saturday: "06:00-22:00",
        sunday: "06:00-22:00"
      },
      accessibility_features: [],
      fare_structure: {},
      safety_rating: 0.0,
      popularity_score: 0,
      routes: [],
      is_active: true,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    rankIds.push(rankRef.id);
  }

  await batch.commit();
  console.log(`✅ Inserted ${rankIds.length} taxi ranks`);
  return rankIds;
}

async function populateTransitRoutes(rankIds: string[]): Promise<string[]> {
  console.log("🛣️ Populating transit routes...");

  const routes = [
    {
      from_location: "Cape Town CBD",
      to_location: "Wynberg",
      fare: 15.50,
      duration_minutes: 45,
      distance_km: 12.3,
      route_type: "taxi",
      origin_rank_id: rankIds[0],
      destination_rank_id: rankIds[1],
    },
    {
      from_location: "Cape Town CBD",
      to_location: "Bellville",
      fare: 18.00,
      duration_minutes: 35,
      distance_km: 15.7,
      route_type: "taxi",
      origin_rank_id: rankIds[0],
      destination_rank_id: rankIds[2],
    },
    {
      from_location: "Wynberg",
      to_location: "Mitchell's Plain",
      fare: 12.00,
      duration_minutes: 25,
      distance_km: 8.5,
      route_type: "taxi",
      origin_rank_id: rankIds[1],
      destination_rank_id: rankIds[3],
    },
    {
      from_location: "Bellville",
      to_location: "Khayelitsha",
      fare: 20.00,
      duration_minutes: 50,
      distance_km: 18.2,
      route_type: "taxi",
      origin_rank_id: rankIds[2],
      destination_rank_id: rankIds[4],
    },
    {
      from_location: "Cape Town CBD",
      to_location: "Khayelitsha",
      fare: 22.50,
      duration_minutes: 55,
      distance_km: 25.1,
      route_type: "taxi",
      origin_rank_id: rankIds[0],
      destination_rank_id: rankIds[4],
    },
    {
      from_location: "Durban Central",
      to_location: "Pinetown",
      fare: 14.00,
      duration_minutes: 30,
      distance_km: 16.8,
      route_type: "taxi",
      origin_rank_id: rankIds[5],
      destination_rank_id: rankIds[6],
    },
    {
      from_location: "Johannesburg Park Station",
      to_location: "Soweto",
      fare: 16.50,
      duration_minutes: 40,
      distance_km: 20.5,
      route_type: "taxi",
      origin_rank_id: rankIds[6],
      destination_rank_id: rankIds[7],
    },
    {
      from_location: "Pretoria CBD",
      to_location: "Mamelodi",
      fare: 13.00,
      duration_minutes: 35,
      distance_km: 18.3,
      route_type: "taxi",
      origin_rank_id: rankIds[7],
      destination_rank_id: rankIds[8],
    },
    {
      from_location: "Port Elizabeth Central",
      to_location: "New Brighton",
      fare: 11.50,
      duration_minutes: 25,
      distance_km: 12.7,
      route_type: "taxi",
      origin_rank_id: rankIds[8],
      destination_rank_id: rankIds[9],
    },
    {
      from_location: "Bloemfontein CBD",
      to_location: "Mangaung",
      fare: 10.00,
      duration_minutes: 20,
      distance_km: 8.9,
      route_type: "taxi",
      origin_rank_id: rankIds[9],
      destination_rank_id: rankIds[0],
    },
  ];

  const routeIds: string[] = [];
  const batch = writeBatch(db);

  for (const route of routes) {
    const routeRef = doc(collection(db, 'transit_routes'));
    batch.set(routeRef, {
      ...route,
      is_direct: true,
      frequency_minutes: 30,
      operating_days: [1, 2, 3, 4, 5, 6, 7],
      route_points: [],
      metadata: {},
      is_active: true,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    routeIds.push(routeRef.id);
  }

  await batch.commit();
  console.log(`✅ Inserted ${routeIds.length} transit routes`);
  return routeIds;
}

async function populateJourneys(userIds: string[], rankIds: string[]): Promise<string[]> {
  console.log("🗺️ Populating journeys...");

  const journeys = [
    {
      user_id: userIds[0],
      origin_rank_id: rankIds[0],
      destination_rank_id: rankIds[1],
      total_fare: 15.50,
      total_duration_minutes: 45,
      total_distance_km: 12.3,
      journey_type: "direct",
      status: "completed",
      hop_count: 1,
    },
    {
      user_id: userIds[1],
      origin_rank_id: rankIds[0],
      destination_rank_id: rankIds[2],
      total_fare: 18.00,
      total_duration_minutes: 35,
      total_distance_km: 15.7,
      journey_type: "direct",
      status: "completed",
      hop_count: 2,
    },
    {
      user_id: userIds[2],
      origin_rank_id: rankIds[1],
      destination_rank_id: rankIds[3],
      total_fare: 12.00,
      total_duration_minutes: 25,
      total_distance_km: 8.5,
      journey_type: "direct",
      status: "active",
      hop_count: 3,
    },
    {
      user_id: userIds[3],
      origin_rank_id: rankIds[2],
      destination_rank_id: rankIds[4],
      total_fare: 20.00,
      total_duration_minutes: 50,
      total_distance_km: 18.2,
      journey_type: "connected",
      status: "planned",
      hop_count: 4,
    },
    {
      user_id: userIds[4],
      origin_rank_id: rankIds[0],
      destination_rank_id: rankIds[4],
      total_fare: 22.50,
      total_duration_minutes: 55,
      total_distance_km: 25.1,
      journey_type: "direct",
      status: "completed",
      hop_count: 5,
    },
  ];

  const journeyIds: string[] = [];
  const batch = writeBatch(db);

  for (const journey of journeys) {
    const journeyRef = doc(collection(db, 'journeys'));
    batch.set(journeyRef, {
      ...journey,
      route_path: [],
      waypoints: [],
      metadata: {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    journeyIds.push(journeyRef.id);
  }

  await batch.commit();
  console.log(`✅ Inserted ${journeyIds.length} journeys`);
  return journeyIds;
}

async function populateRouteConnections(journeyIds: string[], routeIds: string[]) {
  console.log("🔗 Populating route connections...");

  if (journeyIds.length === 0 || routeIds.length === 0) {
    console.log("⚠️ No journeys or routes found, skipping route connections population");
    return;
  }

  const batch = writeBatch(db);

  for (let i = 0; i < Math.min(10, journeyIds.length); i++) {
    const connectionRef = doc(collection(db, 'route_connections'));
    batch.set(connectionRef, {
      journey_id: journeyIds[i % journeyIds.length],
      route_id: routeIds[i % routeIds.length],
      sequence_order: (i % 3) + 1,
      connection_rank_id: `rank_${(i % 10) + 1}`,
      segment_fare: 50.0 + i * 10,
      segment_duration_minutes: 60 + i * 30,
      segment_distance_km: 100 + i * 50,
      waiting_time_minutes: 0,
      created_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log("✅ Route connections populated");
}

async function populateTaxisNearby(routeIds: string[]) {
  console.log("🚖 Populating nearby taxis...");

  const taxis = [
    {
      route_id: routeIds[0],
      from_location: "Cape Town CBD",
      to_location: "Wynberg",
      image_url: "https://example.com/taxis/taxi1.jpg",
      description: "Toyota Quantum - 14 seater",
      fare: 15.50,
      operating_hours: "05:00 - 22:00",
      current_latitude: -33.9249,
      current_longitude: 18.4241,
    },
    {
      route_id: routeIds[1],
      from_location: "Cape Town CBD",
      to_location: "Bellville",
      image_url: "https://example.com/taxis/taxi2.jpg",
      description: "Mercedes Sprinter - 22 seater",
      fare: 18.00,
      operating_hours: "04:30 - 23:00",
      current_latitude: -33.8903,
      current_longitude: 18.6292,
    },
    {
      route_id: routeIds[2],
      from_location: "Wynberg",
      to_location: "Mitchell's Plain",
      image_url: "https://example.com/taxis/taxi3.jpg",
      description: "Toyota HiAce - 16 seater",
      fare: 12.00,
      operating_hours: "05:30 - 21:30",
      current_latitude: -34.0186,
      current_longitude: 18.4745,
    },
  ];

  const batch = writeBatch(db);

  for (const taxi of taxis) {
    const taxiRef = doc(collection(db, 'taxis_nearby'));
    batch.set(taxiRef, {
      ...taxi,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${taxis.length} nearby taxis`);
}

async function populateHikingSigns(userIds: string[]) {
  console.log("🪧 Populating hiking signs...");

  const signs = [
    {
      user_id: userIds[0],
      image_url: "https://example.com/signs/sign1.jpg",
      description: "Taxi fare board showing Cape Town CBD to Wynberg R15.50",
      latitude: -33.9249,
      longitude: 18.4241,
      address: "Corner Strand & Adderley Street, Cape Town",
      from_location: "Cape Town CBD",
      to_location: "Wynberg",
      fare_amount: 15.50,
    },
    {
      user_id: userIds[1],
      image_url: "https://example.com/signs/sign2.jpg",
      description: "Route information board at Bellville Terminal",
      latitude: -33.8903,
      longitude: 18.6292,
      address: "Voortrekker Road, Bellville",
      from_location: "Bellville",
      to_location: "Khayelitsha",
      fare_amount: 20.00,
    },
  ];

  const batch = writeBatch(db);

  for (const sign of signs) {
    const signRef = doc(collection(db, 'hiking_signs'));
    batch.set(signRef, {
      ...sign,
      sign_type: 'fare_board',
      verification_count: 0,
      is_verified: true,
      metadata: {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${signs.length} hiking signs`);
}

async function populateUserActivities(userIds: string[], rankIds: string[]) {
  console.log("📊 Populating user activities...");

  const activities = [
    {
      user_id: userIds[0],
      activity_type: "rank_search",
      description: "Searched for taxi ranks near Cape Town CBD",
      rank_id: rankIds[0],
      latitude: -33.9249,
      longitude: 18.4241,
    },
    {
      user_id: userIds[1],
      activity_type: "journey_created",
      description: "Created journey from Cape Town CBD to Wynberg",
      rank_id: rankIds[1],
      latitude: -34.0186,
      longitude: 18.4745,
    },
  ];

  const batch = writeBatch(db);

  for (const activity of activities) {
    const activityRef = doc(collection(db, 'user_activities'));
    batch.set(activityRef, {
      ...activity,
      metadata: {},
      created_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${activities.length} user activities`);
}

async function populateAnalyticsEvents(userIds: string[]) {
  console.log("📈 Populating analytics events...");

  const events = [
    {
      user_id: userIds[0],
      event_type: "page_view",
      event_category: "navigation",
      event_action: "view_home",
      event_label: "home_page",
      event_value: 1.0,
    },
    {
      user_id: userIds[1],
      event_type: "search",
      event_category: "taxi_ranks",
      event_action: "search_nearby",
      event_label: "location_search",
      event_value: 1.0,
    },
  ];

  const batch = writeBatch(db);

  for (const event of events) {
    const eventRef = doc(collection(db, 'analytics_events'));
    batch.set(eventRef, {
      ...event,
      session_id: `session_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {},
      timestamp: serverTimestamp(),
      created_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${events.length} analytics events`);
}

async function populateLocationHistory(userIds: string[]) {
  console.log("📍 Populating location history...");

  const locations = [
    {
      user_id: userIds[0],
      latitude: -33.9249,
      longitude: 18.4241,
      accuracy: 5.0,
      activity_type: "walking",
    },
    {
      user_id: userIds[1],
      latitude: -34.0186,
      longitude: 18.4745,
      accuracy: 3.2,
      activity_type: "in_vehicle",
    },
  ];

  const batch = writeBatch(db);

  for (const location of locations) {
    const locationRef = doc(collection(db, 'location_history'));
    batch.set(locationRef, {
      ...location,
      is_mock_location: false,
      recorded_at: serverTimestamp(),
      created_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${locations.length} location history records`);
}

async function populateUserDevices(userIds: string[]) {
  console.log("📱 Populating user devices...");

  const platforms = ["android", "ios", "web"];
  const batch = writeBatch(db);

  for (let i = 0; i < Math.min(5, userIds.length); i++) {
    const deviceRef = doc(collection(db, 'user_devices'));
    batch.set(deviceRef, {
      user_id: userIds[i],
      device_token: `device_token_${i + 1}_${Date.now()}`,
      device_id: `device_id_${i + 1}`,
      device_name: `User Device ${i + 1}`,
      platform: platforms[i % 3],
      app_version: '1.0.0',
      os_version: platforms[i % 3] === "android" ? "11.0" : platforms[i % 3] === "ios" ? "15.0" : "Chrome 90",
      device_model: platforms[i % 3] === "android" ? "Samsung Galaxy" : platforms[i % 3] === "ios" ? "iPhone 12" : "Desktop",
      push_enabled: true,
      subscribed_topics: [],
      timezone: 'Africa/Johannesburg',
      locale: 'en-ZA',
      is_active: true,
      last_active: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${Math.min(5, userIds.length)} user devices`);
}

async function populateNotifications(userIds: string[]) {
  console.log("🔔 Populating notifications...");

  const notifications = [
    {
      user_id: userIds[0],
      title: "Journey Reminder",
      message: "Your planned journey to Wynberg starts in 30 minutes",
      type: "journey",
      category: "reminder",
    },
    {
      user_id: userIds[1],
      title: "Fare Update",
      message: "Taxi fare from Cape Town CBD to Bellville updated to R18.00",
      type: "fare_update",
      category: "information",
    },
    {
      user_id: userIds[2],
      title: "Route Disruption",
      message: "Traffic delays on Wynberg to Mitchell's Plain route",
      type: "alert",
      category: "traffic",
    },
  ];

  const batch = writeBatch(db);

  for (const notification of notifications) {
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      ...notification,
      data: {},
      is_read: false,
      priority: 0,
      created_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${notifications.length} notifications`);
}

async function populateFiles(userIds: string[]) {
  console.log("📁 Populating files...");

  const fileTypes = ["image", "document", "audio", "video"];
  const batch = writeBatch(db);

  for (let i = 0; i < Math.min(5, userIds.length); i++) {
    const fileRef = doc(collection(db, 'files'));
    batch.set(fileRef, {
      user_id: userIds[i],
      file_name: `file_${i + 1}_${Date.now()}.jpg`,
      original_filename: `original_file_${i + 1}.jpg`,
      file_type: fileTypes[i % 4],
      file_category: 'user_upload',
      size_bytes: 1024 * (i + 1) * 100,
      mime_type: fileTypes[i % 4] === "image" ? "image/jpeg" : "application/octet-stream",
      file_hash: `hash_${i + 1}_${Date.now()}`,
      storage_path: `/storage/files/file_${i + 1}`,
      public_url: `https://example.com/files/file_${i + 1}.jpg`,
      is_public: i % 3 === 0,
      download_count: 0,
      metadata: {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${Math.min(5, userIds.length)} files`);
}

async function populateReviews(userIds: string[]) {
  console.log("⭐ Populating reviews...");

  const entityTypes = ["rank", "route", "journey", "taxi"];
  const comments = [
    "Excellent service, very reliable",
    "Good value for money",
    "Could be improved",
    "Outstanding experience",
    "Average service",
  ];

  const batch = writeBatch(db);

  for (let i = 0; i < Math.min(5, userIds.length); i++) {
    const reviewRef = doc(collection(db, 'reviews'));
    batch.set(reviewRef, {
      user_id: userIds[i],
      entity_type: entityTypes[i % entityTypes.length],
      entity_id: (i % 10) + 1,
      rating: Math.floor(Math.random() * 5) + 1,
      title: `Review ${i + 1} Title`,
      comment: comments[i],
      helpful_count: Math.floor(Math.random() * 20),
      is_verified: i % 2 === 0,
      is_anonymous: false,
      metadata: {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${Math.min(5, userIds.length)} reviews`);
}

async function populateReviewVotes() {
  console.log("👍 Populating review votes...");

  // Get some reviews first
  const reviewsSnapshot = await getDocs(query(collection(db, 'reviews'), limit(5)));
  const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(5)));

  if (reviewsSnapshot.empty || usersSnapshot.empty) {
    console.log("⚠️ No reviews or users found, skipping review votes population");
    return;
  }

  const reviews = reviewsSnapshot.docs;
  const users = usersSnapshot.docs;
  const batch = writeBatch(db);

  for (let i = 0; i < Math.min(5, reviews.length); i++) {
    const voteRef = doc(collection(db, 'review_votes'));
    batch.set(voteRef, {
      review_id: reviews[i].id,
      user_id: users[(i + 1) % users.length].id,
      vote_type: i % 2 === 0 ? "helpful" : "not_helpful",
      created_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${Math.min(5, reviews.length)} review votes`);
}

async function populateApiRateLimits(userIds: string[]) {
  console.log("🚦 Populating API rate limits...");

  const endpoints = [
    "/api/ranks",
    "/api/routes",
    "/api/journeys",
    "/api/search",
    "/api/upload",
  ];

  const batch = writeBatch(db);

  for (let i = 0; i < Math.min(5, userIds.length); i++) {
    const rateLimitRef = doc(collection(db, 'api_rate_limits'));
    const randomIP = `192.168.1.${Math.floor(Math.random() * 100) + 1}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1-hour window

    batch.set(rateLimitRef, {
      identifier: randomIP,
      user_id: userIds[i],
      endpoint: endpoints[i % endpoints.length],
      requests_count: Math.floor(Math.random() * 50) + 1,
      window_start: serverTimestamp(),
      expires_at: expiresAt,
      metadata: {},
      created_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${Math.min(5, userIds.length)} API rate limits`);
}

async function populateEmailTemplates() {
  console.log("📧 Populating email templates...");

  const templates = [
    {
      template_key: "welcome_email",
      subject: "Welcome to Bee Rank!",
      html_content: "<h1>Welcome!</h1><p>Thank you for joining Bee Rank.</p>",
      text_content: "Welcome! Thank you for joining Bee Rank.",
      template_type: "transactional",
      is_active: true,
      variables: ["user_name", "app_name"]
    },
    {
      template_key: "password_reset",
      subject: "Reset Your Password",
      html_content: "<h1>Password Reset</h1><p>Click the link to reset your password: {{reset_link}}</p>",
      text_content: "Password Reset: Click the link to reset your password: {{reset_link}}",
      template_type: "transactional",
      is_active: true,
      variables: ["reset_link", "user_name"]
    },
    {
      template_key: "journey_reminder",
      subject: "Journey Reminder",
      html_content: "<h1>Journey Reminder</h1><p>Your journey from {{from}} to {{to}} starts in {{time}}.</p>",
      text_content: "Journey Reminder: Your journey from {{from}} to {{to}} starts in {{time}}.",
      template_type: "notification",
      is_active: true,
      variables: ["from", "to", "time", "user_name"]
    }
  ];

  const batch = writeBatch(db);

  for (const template of templates) {
    const templateRef = doc(collection(db, 'email_templates'));
    batch.set(templateRef, {
      ...template,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${templates.length} email templates`);
}

async function populateEmailQueue(userIds: string[]) {
  console.log("📮 Populating email queue...");

  const emails = [
    {
      to_email: "john.doe@example.com",
      from_email: "noreply@beerank.com",
      subject: "Welcome to Bee Rank!",
      template_key: "welcome_email",
      template_data: { user_name: "John", app_name: "Bee Rank" },
      status: "sent",
      priority: 1,
      scheduled_at: null,
      sent_at: serverTimestamp(),
      error_message: null,
      retry_count: 0
    },
    {
      to_email: "jane.smith@example.com",
      from_email: "noreply@beerank.com",
      subject: "Journey Reminder",
      template_key: "journey_reminder",
      template_data: { user_name: "Jane", from: "Cape Town CBD", to: "Wynberg", time: "30 minutes" },
      status: "pending",
      priority: 2,
      scheduled_at: serverTimestamp(),
      sent_at: null,
      error_message: null,
      retry_count: 0
    }
  ];

  const batch = writeBatch(db);

  for (const email of emails) {
    const emailRef = doc(collection(db, 'email_queue'));
    batch.set(emailRef, {
      ...email,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${emails.length} email queue entries`);
}

async function populateFeatureFlags() {
  console.log("🚩 Populating feature flags...");

  const flags = [
    {
      name: "entertainment_events",
      description: "Enable entertainment events feature",
      is_enabled: true,
      rollout_percentage: 100,
      target_groups: { roles: ["USER", "ADMIN"], regions: ["ZA"] },
      conditions: {},
      metadata: { version: "1.0", owner: "product_team" }
    },
    {
      name: "advanced_search",
      description: "Enable advanced search functionality",
      is_enabled: true,
      rollout_percentage: 75,
      target_groups: { roles: ["USER"], regions: ["ZA"] },
      conditions: { min_app_version: "1.2.0" },
      metadata: { version: "1.1", owner: "engineering_team" }
    },
    {
      name: "real_time_tracking",
      description: "Enable real-time taxi tracking",
      is_enabled: false,
      rollout_percentage: 0,
      target_groups: { roles: ["ADMIN"], regions: ["ZA"] },
      conditions: { beta_user: true },
      metadata: { version: "0.1", owner: "beta_team" }
    }
  ];

  const batch = writeBatch(db);

  for (const flag of flags) {
    const flagRef = doc(collection(db, 'feature_flags'));
    batch.set(flagRef, {
      ...flag,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${flags.length} feature flags`);
}

async function populateAuthSessions(userIds: string[]) {
  console.log("🔐 Populating auth sessions...");

  const sessions = [
    {
      user_id: userIds[0],
      access_token_hash: "hash_access_token_1",
      refresh_token_hash: "hash_refresh_token_1",
      device_info: { platform: "android", model: "Samsung Galaxy S21", os_version: "11.0" },
      ip_address: "192.168.1.100",
      user_agent: "BeeRank/1.0 (Android 11; Samsung Galaxy S21)",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      is_active: true,
      last_activity: serverTimestamp()
    },
    {
      user_id: userIds[1],
      access_token_hash: "hash_access_token_2",
      refresh_token_hash: "hash_refresh_token_2",
      device_info: { platform: "ios", model: "iPhone 12", os_version: "15.0" },
      ip_address: "192.168.1.101",
      user_agent: "BeeRank/1.0 (iOS 15.0; iPhone 12)",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      is_active: true,
      last_activity: serverTimestamp()
    }
  ];

  const batch = writeBatch(db);

  for (const session of sessions) {
    const sessionRef = doc(collection(db, 'auth_sessions'));
    batch.set(sessionRef, {
      ...session,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${sessions.length} auth sessions`);
}

async function populateCacheEntries() {
  console.log("💾 Populating cache entries...");

  const cacheEntries = [
    {
      cache_key: "taxi_ranks:nearby:cape_town",
      cache_value: { ranks: ["rank_1", "rank_2"], count: 2 },
      pattern: "taxi_ranks:*",
      ttl_seconds: 3600,
      expires_at: new Date(Date.now() + 3600 * 1000),
      access_count: 15,
      last_accessed: serverTimestamp(),
      metadata: { region: "cape_town", type: "search_result" }
    },
    {
      cache_key: "routes:popular:western_cape",
      cache_value: { routes: ["route_1", "route_2", "route_3"], count: 3 },
      pattern: "routes:*",
      ttl_seconds: 1800,
      expires_at: new Date(Date.now() + 1800 * 1000),
      access_count: 8,
      last_accessed: serverTimestamp(),
      metadata: { region: "western_cape", type: "popular_routes" }
    }
  ];

  const batch = writeBatch(db);

  for (const entry of cacheEntries) {
    const cacheRef = doc(collection(db, 'cache_entries'));
    batch.set(cacheRef, {
      ...entry,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${cacheEntries.length} cache entries`);
}

async function populateWebSocketSessions(userIds: string[]) {
  console.log("🔌 Populating WebSocket sessions...");

  const sessions = [
    {
      user_id: userIds[0],
      socket_id: "socket_12345",
      connection_info: {
        device_info: { platform: "android", model: "Samsung Galaxy S21" },
        ip_address: "192.168.1.100",
        user_agent: "BeeRank/1.0 (Android 11; Samsung Galaxy S21)"
      },
      subscribed_channels: ["user_notifications", "journey_updates"],
      is_active: true,
      last_ping: serverTimestamp(),
      connected_at: serverTimestamp()
    },
    {
      user_id: userIds[1],
      socket_id: "socket_67890",
      connection_info: {
        device_info: { platform: "ios", model: "iPhone 12" },
        ip_address: "192.168.1.101",
        user_agent: "BeeRank/1.0 (iOS 15.0; iPhone 12)"
      },
      subscribed_channels: ["user_notifications", "real_time_tracking"],
      is_active: true,
      last_ping: serverTimestamp(),
      connected_at: serverTimestamp()
    }
  ];

  const batch = writeBatch(db);

  for (const session of sessions) {
    const sessionRef = doc(collection(db, 'websocket_sessions'));
    batch.set(sessionRef, {
      ...session,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${sessions.length} WebSocket sessions`);
}

async function populateEntertainmentEvents() {
  console.log("🎭 Populating entertainment events...");

  const events = [
    {
      title: "Cape Town Jazz Festival",
      description: "Annual international jazz festival featuring world-class artists",
      event_type: "musical",
      venue_name: "Cape Town International Convention Centre",
      venue_address: "1 Lower Long Street, Cape Town, 8001",
      latitude: -33.9150,
      longitude: 18.4240,
      start_date: new Date("2024-03-29"),
      end_date: new Date("2024-03-30"),
      start_time: "18:00",
      end_time: "23:00",
      ticket_price_min: 250.00,
      ticket_price_max: 1500.00,
      currency: "ZAR",
      age_restriction: "18+",
      capacity: 5000,
      organizer_name: "Cape Town Jazz Festival",
      organizer_contact: "+27214441234",
      website_url: "https://capetownjazzfest.com",
      image_url: "https://example.com/events/jazz_festival.jpg",
      tags: ["jazz", "music", "festival", "international"],
      is_featured: true,
      is_active: true,
      booking_url: "https://capetownjazzfest.com/tickets"
    },
    {
      title: "The Lion King Musical",
      description: "Disney's award-winning musical brings the Pride Lands to life",
      event_type: "theatre",
      venue_name: "Artscape Theatre Centre",
      venue_address: "D.F. Malan Street, Cape Town, 8001",
      latitude: -33.9320,
      longitude: 18.4170,
      start_date: new Date("2024-04-15"),
      end_date: new Date("2024-05-15"),
      start_time: "19:30",
      end_time: "22:00",
      ticket_price_min: 180.00,
      ticket_price_max: 850.00,
      currency: "ZAR",
      age_restriction: "All ages",
      capacity: 1400,
      organizer_name: "Artscape Theatre",
      organizer_contact: "+27214402400",
      website_url: "https://artscape.co.za",
      image_url: "https://example.com/events/lion_king.jpg",
      tags: ["theatre", "musical", "disney", "family"],
      is_featured: true,
      is_active: true,
      booking_url: "https://artscape.co.za/tickets"
    },
    {
      title: "Black Coffee Live",
      description: "South African DJ legend performs his latest electronic beats",
      event_type: "dj",
      venue_name: "GrandWest Casino",
      venue_address: "1 Vasco Boulevard, Goodwood, Cape Town, 7460",
      latitude: -33.8890,
      longitude: 18.5430,
      start_date: new Date("2024-04-20"),
      end_date: new Date("2024-04-20"),
      start_time: "21:00",
      end_time: "03:00",
      ticket_price_min: 350.00,
      ticket_price_max: 750.00,
      currency: "ZAR",
      age_restriction: "18+",
      capacity: 3000,
      organizer_name: "GrandWest Entertainment",
      organizer_contact: "+27215051777",
      website_url: "https://grandwest.co.za",
      image_url: "https://example.com/events/black_coffee.jpg",
      tags: ["dj", "electronic", "dance", "nightlife"],
      is_featured: false,
      is_active: true,
      booking_url: "https://grandwest.co.za/tickets"
    },
    {
      title: "Kirstenbosch Summer Concerts",
      description: "Outdoor concert series in the beautiful botanical gardens",
      event_type: "concert",
      venue_name: "Kirstenbosch National Botanical Garden",
      venue_address: "Rhodes Drive, Newlands, Cape Town, 7700",
      latitude: -33.9880,
      longitude: 18.4320,
      start_date: new Date("2024-03-10"),
      end_date: new Date("2024-04-28"),
      start_time: "17:30",
      end_time: "21:00",
      ticket_price_min: 120.00,
      ticket_price_max: 300.00,
      currency: "ZAR",
      age_restriction: "All ages",
      capacity: 2500,
      organizer_name: "Kirstenbosch",
      organizer_contact: "+27217997000",
      website_url: "https://kirstenbosch.co.za",
      image_url: "https://example.com/events/kirstenbosch.jpg",
      tags: ["concert", "outdoor", "nature", "family"],
      is_featured: true,
      is_active: true,
      booking_url: "https://kirstenbosch.co.za/concerts"
    },
    {
      title: "Comedy Central Live",
      description: "Stand-up comedy night featuring local and international comedians",
      event_type: "comedy",
      venue_name: "Baxter Theatre Centre",
      venue_address: "Main Road, Rondebosch, Cape Town, 7700",
      latitude: -33.9570,
      longitude: 18.4650,
      start_date: new Date("2024-04-05"),
      end_date: new Date("2024-04-05"),
      start_time: "20:00",
      end_time: "22:30",
      ticket_price_min: 80.00,
      ticket_price_max: 200.00,
      currency: "ZAR",
      age_restriction: "16+",
      capacity: 600,
      organizer_name: "Baxter Theatre",
      organizer_contact: "+27216850116",
      website_url: "https://baxter.co.za",
      image_url: "https://example.com/events/comedy_night.jpg",
      tags: ["comedy", "stand-up", "entertainment", "nightlife"],
      is_featured: false,
      is_active: true,
      booking_url: "https://baxter.co.za/tickets"
    }
  ];

  const eventIds: string[] = [];
  const batch = writeBatch(db);

  for (const event of events) {
    const eventRef = doc(collection(db, 'entertainment_events'));
    batch.set(eventRef, {
      ...event,
      metadata: {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    eventIds.push(eventRef.id);
  }

  await batch.commit();
  console.log(`✅ Inserted ${events.length} entertainment events`);
  return eventIds;
}

async function populateUserEventBookmarks(userIds: string[], eventIds: string[]) {
  console.log("🔖 Populating user event bookmarks...");

  if (userIds.length === 0 || eventIds.length === 0) {
    console.log("⚠️ No users or events found, skipping bookmarks population");
    return;
  }

  const bookmarks = [
    {
      user_id: userIds[0],
      event_id: eventIds[0], // Cape Town Jazz Festival
      is_attending: true,
      reminder_set: true,
      reminder_time: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day before
      notes: "Looking forward to this amazing jazz festival!"
    },
    {
      user_id: userIds[1],
      event_id: eventIds[1], // The Lion King Musical
      is_attending: false,
      reminder_set: true,
      reminder_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week before
      notes: "Interested in taking the family"
    },
    {
      user_id: userIds[0],
      event_id: eventIds[3], // Kirstenbosch Summer Concerts
      is_attending: true,
      reminder_set: false,
      reminder_time: null,
      notes: "Love outdoor concerts!"
    },
    {
      user_id: userIds[2],
      event_id: eventIds[2], // Black Coffee Live
      is_attending: true,
      reminder_set: true,
      reminder_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days before
      notes: "Can't miss Black Coffee!"
    },
    {
      user_id: userIds[3],
      event_id: eventIds[4], // Comedy Central Live
      is_attending: false,
      reminder_set: false,
      reminder_time: null,
      notes: "Maybe next time"
    }
  ];

  const batch = writeBatch(db);

  for (const bookmark of bookmarks) {
    const bookmarkRef = doc(collection(db, 'user_event_bookmarks'));
    batch.set(bookmarkRef, {
      ...bookmark,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`✅ Inserted ${bookmarks.length} user event bookmarks`);
}