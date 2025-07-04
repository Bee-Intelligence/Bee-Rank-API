import { sql } from "../../config/db";

export async function seedAllData() {
  try {
    console.log("🌱 Populating database with sample data...");

    // Check if data already exists to avoid duplicates
    const [userCount] = await sql`SELECT COUNT(*) as count FROM users`;
    if (userCount.count > 0) {
      console.log("📊 Database already has data, skipping population");
      return;
    }

    // Populate users first (referenced by other tables)
    await populateUsers();
    //Insert admin and App Settings
    await insertInitialData();
    // Populate taxi ranks
    await populateTaxiRanks();

    // Populate transit routes
    await populateTransitRoutes();

    // Populate journeys
    await populateJourneys();

    // Populate route connections
    await populateRouteConnections();

    // Populate taxis nearby
    await populateTaxisNearby();

    // Populate hiking signs
    await populateHikingSigns();

    // Populate User activities
    await populateUserActivities();

    // Populate analytics events
    await populateAnalyticsEvents();

    // Populate location history
    await populateLocationHistory();

    // Populate User devices
    await populateUserDevices();

    // Populate notifications
    await populateNotifications();

    // Populate files
    await populateFiles();

    // Populate reviews
    await populateReviews();

    // Populate review votes
    await populateReviewVotes();

    // Populate API rate limits
    await populateApiRateLimits();

    console.log("✅ Database population completed successfully");
  } catch (error) {
    console.error("❌ Database population failed:", error);
    throw error;
  }
}

async function populateUsers() {
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

  for (const user of users) {
    await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_email_verified, is_active)
      VALUES (${user.email}, ${user.password_hash}, ${user.first_name}, ${user.last_name}, ${user.phone}, ${user.role}, true, true)
        ON CONFLICT (email) DO NOTHING
    `;
  }
}

async function insertInitialData() {
  try {
    console.log("📝 Inserting initial data...");

    // Check if we already have system settings
    const [settingsCount] = await sql`SELECT COUNT(*) as count
                                          FROM system_settings`;
    if (settingsCount.count > 0) {
      console.log(
          "📊 Database already has system settings, skipping initial data insertion",
      );
      return;
    }
    // Check if an admin user exists
    const [adminExists] = await sql`
            SELECT id
            FROM users
            WHERE email = 'admin@beerank.com'
        `;

    // Insert default system settings
    await sql`
            INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public)
            VALUES ('app_name', 'Bee Rank', 'string', 'Application name', true),
                   ('app_version', '1.0.0', 'string', 'Current application version', true),
                   ('maintenance_mode', 'false', 'boolean', 'Maintenance mode flag', false),
                   ('max_file_size_mb', '10', 'number', 'Maximum file upload size in MB', false),
                   ('default_search_radius', '5000', 'number', 'Default search radius in meters', true),
                   ('rate_limit_requests_per_minute', '60', 'number', 'API rate limit', false)
        `;

    if (!adminExists) {
      // Create default admin user
      await sql`
                INSERT INTO users (email, password_hash, first_name, last_name, role, is_email_verified, is_active)
                VALUES ('admin@beerank.com', '$2b$10$defaulthash', 'System', 'Admin', 'ADMIN', true, true)
            `;
      console.log("✅ Default admin user created");
    }
    console.log("✅ The admin user Exist");
    console.log("✅ Initial system settings inserted");
  } catch (error) {
    console.error("❌ Failed to insert initial data:", error);
    throw error;
  }
}

async function populateTaxiRanks() {
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

  for (const rank of taxiRanks) {
    await sql`
      INSERT INTO taxi_ranks (
        name, description, latitude, longitude, address, city, province,
        capacity, contact_number, is_active
      )
      VALUES (
               ${rank.name}, ${rank.description}, ${rank.latitude}, ${rank.longitude},
               ${rank.address}, ${rank.city}, ${rank.province}, ${rank.capacity},
               ${rank.contact_number}, true
             )
    `;
  }
}

async function populateTransitRoutes() {
  console.log("🛣️ Populating transit routes...");

  const routes = [
    {
      from_location: "Cape Town CBD",
      to_location: "Wynberg",
      fare: 15.50,
      duration_minutes: 45,
      distance_km: 12.3,
      route_type: "taxi",
      origin_rank_id: 1,
      destination_rank_id: 2,
    },
    {
      from_location: "Cape Town CBD",
      to_location: "Bellville",
      fare: 18.00,
      duration_minutes: 35,
      distance_km: 15.7,
      route_type: "taxi",
      origin_rank_id: 1,
      destination_rank_id: 3,
    },
    {
      from_location: "Wynberg",
      to_location: "Mitchell's Plain",
      fare: 12.00,
      duration_minutes: 25,
      distance_km: 8.5,
      route_type: "taxi",
      origin_rank_id: 2,
      destination_rank_id: 4,
    },
    {
      from_location: "Bellville",
      to_location: "Khayelitsha",
      fare: 20.00,
      duration_minutes: 50,
      distance_km: 18.2,
      route_type: "taxi",
      origin_rank_id: 3,
      destination_rank_id: 5,
    },
    {
      from_location: "Cape Town CBD",
      to_location: "Khayelitsha",
      fare: 22.50,
      duration_minutes: 55,
      distance_km: 25.1,
      route_type: "taxi",
      origin_rank_id: 1,
      destination_rank_id: 5,
    },
    {
      from_location: "Durban Central",
      to_location: "Pinetown",
      fare: 14.00,
      duration_minutes: 30,
      distance_km: 16.8,
      route_type: "taxi",
      origin_rank_id: 6,
      destination_rank_id: 7,
    },
    {
      from_location: "Johannesburg Park Station",
      to_location: "Soweto",
      fare: 16.50,
      duration_minutes: 40,
      distance_km: 20.5,
      route_type: "taxi",
      origin_rank_id: 7,
      destination_rank_id: 8,
    },
    {
      from_location: "Pretoria CBD",
      to_location: "Mamelodi",
      fare: 13.00,
      duration_minutes: 35,
      distance_km: 18.3,
      route_type: "taxi",
      origin_rank_id: 8,
      destination_rank_id: 9,
    },
    {
      from_location: "Port Elizabeth Central",
      to_location: "New Brighton",
      fare: 11.50,
      duration_minutes: 25,
      distance_km: 12.7,
      route_type: "taxi",
      origin_rank_id: 9,
      destination_rank_id: 10,
    },
    {
      from_location: "Bloemfontein CBD",
      to_location: "Mangaung",
      fare: 10.00,
      duration_minutes: 20,
      distance_km: 8.9,
      route_type: "taxi",
      origin_rank_id: 10,
      destination_rank_id: 1,
    },
  ];

  for (const route of routes) {
    await sql`
      INSERT INTO transit_routes (
        from_location, to_location, fare, duration_minutes, distance_km,
        route_type, origin_rank_id, destination_rank_id, is_direct, 
        frequency_minutes, operating_days, route_points, metadata, is_active
      )
      VALUES (
               ${route.from_location}, ${route.to_location}, ${route.fare},
               ${route.duration_minutes}, ${route.distance_km}, ${route.route_type},
               ${route.origin_rank_id}, ${route.destination_rank_id}, true,
               30, '{1,2,3,4,5,6,7}', '[]', '{}', true
             )
    `;
  }
}

async function populateJourneys() {
  console.log("🗺️ Populating journeys...");

  // Get some user IDs first
  const users = await sql`SELECT id FROM users LIMIT 10`;

  const journeys = [
    {
      user_id: users[0]?.id,
      origin_rank_id: 1,
      destination_rank_id: 2,
      total_fare: 15.50,
      total_duration_minutes: 45,
      total_distance_km: 12.3,
      journey_type: "direct",
      status: "completed",
      hop_count: 1,

    },
    {
      user_id: users[1]?.id,
      origin_rank_id: 1,
      destination_rank_id: 3,
      total_fare: 18.00,
      total_duration_minutes: 35,
      total_distance_km: 15.7,
      journey_type: "direct",
      status: "completed",
      hop_count: 2,
    },
    {
      user_id: users[2]?.id,
      origin_rank_id: 2,
      destination_rank_id: 4,
      total_fare: 12.00,
      total_duration_minutes: 25,
      total_distance_km: 8.5,
      journey_type: "direct",
      status: "active",
      hop_count: 3,
    },
    {
      user_id: users[3]?.id,
      origin_rank_id: 3,
      destination_rank_id: 5,
      total_fare: 20.00,
      total_duration_minutes: 50,
      total_distance_km: 18.2,
      journey_type: "connected",
      status: "planned",
      hop_count: 4,
    },
    {
      user_id: users[4]?.id,
      origin_rank_id: 1,
      destination_rank_id: 5,
      total_fare: 22.50,
      total_duration_minutes: 55,
      total_distance_km: 25.1,
      journey_type: "direct",
      status: "completed",
      hop_count: 5,
    },
    {
      user_id: users[5]?.id,
      origin_rank_id: 6,
      destination_rank_id: 7,
      total_fare: 16.50,
      total_duration_minutes: 40,
      total_distance_km: 20.5,
      journey_type: "direct",
      status: "cancelled",
      hop_count: 6,
    },
    {
      user_id: users[6]?.id,
      origin_rank_id: 7,
      destination_rank_id: 8,
      total_fare: 13.00,
      total_duration_minutes: 35,
      total_distance_km: 18.3,
      journey_type: "connected",
      status: "completed",
      hop_count: 7,
    },
    {
      user_id: users[7]?.id,
      origin_rank_id: 8,
      destination_rank_id: 9,
      total_fare: 11.50,
      total_duration_minutes: 25,
      total_distance_km: 12.7,
      journey_type: "direct",
      status: "active",
      hop_count: 8,
    },
    {
      user_id: users[8]?.id,
      origin_rank_id: 9,
      destination_rank_id: 10,
      total_fare: 10.00,
      total_duration_minutes: 20,
      total_distance_km: 8.9,
      journey_type: "direct",
      status: "planned",
      hop_count: 9,
    },
    {
      user_id: users[9]?.id,
      origin_rank_id: 10,
      destination_rank_id: 1,
      total_fare: 35.00,
      total_duration_minutes: 120,
      total_distance_km: 45.8,
      journey_type: "connected",
      status: "completed",
      hop_count: 10,
    },
  ];

  const insertedJourneys = [];

  for (const journey of journeys) {
   const result =  await sql`
      INSERT INTO journeys (
        user_id, origin_rank_id, destination_rank_id, total_fare,
        total_duration_minutes, total_distance_km, journey_type, status, hop_count

      )
      VALUES (
               ${journey.user_id}, ${journey.origin_rank_id}, ${journey.destination_rank_id},
               ${journey.total_fare}, ${journey.total_duration_minutes}, ${journey.total_distance_km},
               ${journey.journey_type}, ${journey.status},${journey.hop_count || 1}
             )
        RETURNING *
    `;
    insertedJourneys.push(result[0]);
  }

  console.log(`✅ Inserted ${insertedJourneys.length} journeys`);
  return insertedJourneys;
}

async function populateRouteConnections() {
  console.log("🔗 Populating route connections...");

  // Get journey IDs
  const journeys = await sql`SELECT journey_id FROM journeys LIMIT 5`;
  const routes = await sql`SELECT id FROM transit_routes LIMIT 10`;
  // Check if we have journeys to work with
  if (journeys.length === 0) {
    console.log("⚠️ No journeys found, skipping route connections population");
    return;
  }

  if (routes.length === 0) {
    console.log("⚠️ No routes found, skipping route connections population");
    return;
  }

  for (let i = 0; i < Math.min(10, journeys.length); i++) {
    await sql`
      INSERT INTO route_connections (journey_id, route_id, sequence_order, connection_rank_id, segment_fare, segment_duration_minutes, segment_distance_km)
      VALUES (${journeys[i % journeys.length].journey_id}, ${routes[i % routes.length].id}, ${(i % 3) + 1}, ${(i % 10) + 1}, ${50.0 + i * 10}, ${60 + i * 30}, ${100 + i * 50})
    `;

  }
}

async function populateHikingSigns() {
  console.log("🪧 Populating hiking signs...");

  const users = await sql`SELECT id FROM users LIMIT 10`;

  const signs = [
    {
      user_id: users[0]?.id,
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
      user_id: users[1]?.id,
      image_url: "https://example.com/signs/sign2.jpg",
      description: "Route information board at Bellville Terminal",
      latitude: -33.8903,
      longitude: 18.6292,
      address: "Voortrekker Road, Bellville",
      from_location: "Bellville",
      to_location: "Khayelitsha",
      fare_amount: 20.00,
    },
    {
      user_id: users[2]?.id,
      image_url: "https://example.com/signs/sign3.jpg",
      description: "Taxi fare display at Mitchell's Plain rank",
      latitude: -34.0342,
      longitude: 18.6290,
      address: "AZ Berman Drive, Mitchell's Plain",
      from_location: "Mitchell's Plain",
      to_location: "Wynberg",
      fare_amount: 12.00,
    },
    {
      user_id: users[3]?.id,
      image_url: "https://example.com/signs/sign4.jpg",
      description: "Route pricing board at Khayelitsha rank",
      latitude: -34.0293,
      longitude: 18.6920,
      address: "Ntlazane Road, Khayelitsha",
      from_location: "Khayelitsha",
      to_location: "Cape Town CBD",
      fare_amount: 22.50,
    },
    {
      user_id: users[4]?.id,
      image_url: "https://example.com/signs/sign5.jpg",
      description: "Durban central taxi fare information",
      latitude: -29.8587,
      longitude: 31.0218,
      address: "Brook Street, Durban Central",
      from_location: "Durban Central",
      to_location: "Pinetown",
      fare_amount: 14.00,
    },
    {
      user_id: users[5]?.id,
      image_url: "https://example.com/signs/sign6.jpg",
      description: "Park Station route information board",
      latitude: -26.2041,
      longitude: 28.0473,
      address: "Rissik Street, Johannesburg",
      from_location: "Park Station",
      to_location: "Soweto",
      fare_amount: 16.50,
    },
    {
      user_id: users[6]?.id,
      image_url: "https://example.com/signs/sign7.jpg",
      description: "Pretoria CBD taxi fare display",
      latitude: -25.7479,
      longitude: 28.2293,
      address: "Church Street, Pretoria Central",
      from_location: "Pretoria CBD",
      to_location: "Mamelodi",
      fare_amount: 13.00,
    },
    {
      user_id: users[7]?.id,
      image_url: "https://example.com/signs/sign8.jpg",
      description: "Port Elizabeth taxi rank pricing",
      latitude: -33.9608,
      longitude: 25.6022,
      address: "Baakens Street, Port Elizabeth",
      from_location: "PE Central",
      to_location: "New Brighton",
      fare_amount: 11.50,
    },
    {
      user_id: users[8]?.id,
      image_url: "https://example.com/signs/sign9.jpg",
      description: "Bloemfontein taxi fare information",
      latitude: -29.0852,
      longitude: 26.1596,
      address: "Maitland Street, Bloemfontein",
      from_location: "Bloemfontein CBD",
      to_location: "Mangaung",
      fare_amount: 10.00,
    },
    {
      user_id: users[9]?.id,
      image_url: "https://example.com/signs/sign10.jpg",
      description: "Updated fare board at Cape Town CBD",
      latitude: -33.9250,
      longitude: 18.4240,
      address: "Strand Street, Cape Town CBD",
      from_location: "Cape Town CBD",
      to_location: "Bellville",
      fare_amount: 18.00,
    },
  ];

  for (const sign of signs) {
    await sql`
      INSERT INTO hiking_signs (
        user_id, image_url, description, latitude, longitude, address,
        from_location, to_location, fare_amount, is_verified
      )
      VALUES (
               ${sign.user_id}, ${sign.image_url}, ${sign.description},
               ${sign.latitude}, ${sign.longitude}, ${sign.address},
               ${sign.from_location}, ${sign.to_location}, ${sign.fare_amount}, true
             )
    `;
  }
}

async function populateTaxisNearby() {
  console.log("🚖 Populating nearby taxis...");

  const routes = await sql`SELECT id FROM transit_routes LIMIT 10`;

  const taxis = [
    {
      route_id: routes[0]?.id,
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
      route_id: routes[1]?.id,
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
      route_id: routes[2]?.id,
      from_location: "Wynberg",
      to_location: "Mitchell's Plain",
      image_url: "https://example.com/taxis/taxi3.jpg",
      description: "Toyota HiAce - 16 seater",
      fare: 12.00,
      operating_hours: "05:30 - 21:30",
      current_latitude: -34.0186,
      current_longitude: 18.4745,
    },
    {
      route_id: routes[3]?.id,
      from_location: "Bellville",
      to_location: "Khayelitsha",
      image_url: "https://example.com/taxis/taxi4.jpg",
      description: "Nissan NV200 - 14 seater",
      fare: 20.00,
      operating_hours: "05:00 - 22:30",
      current_latitude: -34.0342,
      current_longitude: 18.6290,
    },
    {
      route_id: routes[4]?.id,
      from_location: "Cape Town CBD",
      to_location: "Khayelitsha",
      image_url: "https://example.com/taxis/taxi5.jpg",
      description: "Toyota Quantum - 18 seater",
      fare: 22.50,
      operating_hours: "04:45 - 23:30",
      current_latitude: -34.0293,
      current_longitude: 18.6920,
    },
    {
      route_id: routes[5]?.id,
      from_location: "Durban Central",
      to_location: "Pinetown",
      image_url: "https://example.com/taxis/taxi6.jpg",
      description: "Mercedes Vito - 12 seater",
      fare: 14.00,
      operating_hours: "05:15 - 21:45",
      current_latitude: -29.8587,
      current_longitude: 31.0218,
    },
    {
      route_id: routes[6]?.id,
      from_location: "Park Station",
      to_location: "Soweto",
      image_url: "https://example.com/taxis/taxi7.jpg",
      description: "Toyota Quantum - 20 seater",
      fare: 16.50,
      operating_hours: "04:30 - 00:00",
      current_latitude: -26.2041,
      current_longitude: 28.0473,
    },
    {
      route_id: routes[7]?.id,
      from_location: "Pretoria CBD",
      to_location: "Mamelodi",
      image_url: "https://example.com/taxis/taxi8.jpg",
      description: "Nissan NV400 - 16 seater",
      fare: 13.00,
      operating_hours: "05:00 - 22:00",
      current_latitude: -25.7479,
      current_longitude: 28.2293,
    },
    {
      route_id: routes[8]?.id,
      from_location: "PE Central",
      to_location: "New Brighton",
      image_url: "https://example.com/taxis/taxi9.jpg",
      description: "Toyota HiAce - 14 seater",
      fare: 11.50,
      operating_hours: "05:30 - 21:00",
      current_latitude: -33.9608,
      current_longitude: 25.6022,
    },
    {
      route_id: routes[9]?.id,
      from_location: "Bloemfontein CBD",
      to_location: "Mangaung",
      image_url: "https://example.com/taxis/taxi10.jpg",
      description: "Mercedes Sprinter - 18 seater",
      fare: 10.00,
      operating_hours: "06:00 - 20:30",
      current_latitude: -29.0852,
      current_longitude: 26.1596,
    },
  ];

  for (const taxi of taxis) {
    await sql`
      INSERT INTO taxis_nearby (
        route_id, from_location, to_location, image_url, description,
        fare, operating_hours, current_latitude, current_longitude
      )
      VALUES (
        ${taxi.route_id}, ${taxi.from_location}, ${taxi.to_location},
        ${taxi.image_url}, ${taxi.description}, ${taxi.fare},
        ${taxi.operating_hours}, ${taxi.current_latitude}, ${taxi.current_longitude}
      )
    `;
  }
}

async function populateUserActivities() {
  console.log("📊 Populating user activities...");

  const users = await sql`SELECT id FROM users LIMIT 10`;
  const ranks = await sql`SELECT id FROM taxi_ranks LIMIT 10`;

  const activities = [
    {
      user_id: users[0]?.id,
      activity_type: "rank_search",
      description: "Searched for taxi ranks near Cape Town CBD",
      rank_id: ranks[0]?.id,
      latitude: -33.9249,
      longitude: 18.4241,
    },
    {
      user_id: users[1]?.id,
      activity_type: "journey_created",
      description: "Created journey from Cape Town CBD to Wynberg",
      rank_id: ranks[1]?.id,
      latitude: -34.0186,
      longitude: 18.4745,
    },
    {
      user_id: users[2]?.id,
      activity_type: "route_viewed",
      description: "Viewed route details for Bellville to Khayelitsha",
      rank_id: ranks[2]?.id,
      latitude: -33.8903,
      longitude: 18.6292,
    },
    {
      user_id: users[3]?.id,
      activity_type: "sign_uploaded",
      description: "Uploaded fare sign photo at Mitchell's Plain",
      rank_id: ranks[3]?.id,
      latitude: -34.0342,
      longitude: 18.6290,
    },
    {
      user_id: users[4]?.id,
      activity_type: "journey_completed",
      description: "Completed journey to Khayelitsha",
      rank_id: ranks[4]?.id,
      latitude: -34.0293,
      longitude: 18.6920,
    },
    {
      user_id: users[5]?.id,
      activity_type: "rank_search",
      description: "Searched for taxi ranks in Durban",
      rank_id: ranks[5]?.id,
      latitude: -29.8587,
      longitude: 31.0218,
    },
    {
      user_id: users[6]?.id,
      activity_type: "route_planning",
      description: "Planned multi-hop journey from Johannesburg",
      rank_id: ranks[6]?.id,
      latitude: -26.2041,
      longitude: 28.0473,
    },
    {
      user_id: users[7]?.id,
      activity_type: "fare_verification",
      description: "Verified fare information at Pretoria CBD",
      rank_id: ranks[7]?.id,
      latitude: -25.7479,
      longitude: 28.2293,
    },
    {
      user_id: users[8]?.id,
      activity_type: "location_check",
      description: "Checked nearby taxis in Port Elizabeth",
      rank_id: ranks[8]?.id,
      latitude: -33.9608,
      longitude: 25.6022,
    },
    {
      user_id: users[9]?.id,
      activity_type: "app_opened",
      description: "Opened app and viewed dashboard",
      rank_id: ranks[9]?.id,
      latitude: -29.0852,
      longitude: 26.1596,
    },
  ];

  for (const activity of activities) {
    await sql`
      INSERT INTO user_activities (
        user_id, activity_type, description, rank_id, latitude, longitude
      )
      VALUES (
        ${activity.user_id}, ${activity.activity_type}, ${activity.description},
        ${activity.rank_id}, ${activity.latitude}, ${activity.longitude}
      )
    `;
  }
}

async function populateAnalyticsEvents() {
  console.log("📈 Populating analytics events...");

  const users = await sql`SELECT id FROM users LIMIT 10`;

  const events = [
    {
      user_id: users[0]?.id,
      event_type: "page_view",
      event_category: "navigation",
      event_action: "view_home",
      event_label: "home_page",
      event_value: 1.0,
    },
    {
      user_id: users[1]?.id,
      event_type: "search",
      event_category: "taxi_ranks",
      event_action: "search_nearby",
      event_label: "location_search",
      event_value: 1.0,
    },
    {
      user_id: users[2]?.id,
      event_type: "journey_start",
      event_category: "journey",
      event_action: "create_journey",
      event_label: "direct_route",
      event_value: 15.50,
    },
    {
      user_id: users[3]?.id,
      event_type: "upload",
      event_category: "content",
      event_action: "upload_sign",
      event_label: "fare_board",
      event_value: 1.0,
    },
    {
      user_id: users[4]?.id,
      event_type: "journey_complete",
      event_category: "journey",
      event_action: "complete_journey",
      event_label: "successful_trip",
      event_value: 22.50,
    },
    {
      user_id: users[5]?.id,
      event_type: "route_share",
      event_category: "social",
      event_action: "share_route",
      event_label: "whatsapp_share",
      event_value: 1.0,
    },
    {
      user_id: users[6]?.id,
      event_type: "app_crash",
      event_category: "error",
      event_action: "crash_report",
      event_label: "navigation_error",
      event_value: 0.0,
    },
    {
      user_id: users[7]?.id,
      event_type: "rating_submit",
      event_category: "feedback",
      event_action: "rate_journey",
      event_label: "5_star_rating",
      event_value: 5.0,
    },
    {
      user_id: users[8]?.id,
      event_type: "notification_open",
      event_category: "engagement",
      event_action: "open_notification",
      event_label: "journey_reminder",
      event_value: 1.0,
    },
    {
      user_id: users[9]?.id,
      event_type: "settings_change",
      event_category: "preferences",
      event_action: "update_settings",
      event_label: "notification_settings",
      event_value: 1.0,
    },
  ];

  for (const event of events) {
    await sql`
      INSERT INTO analytics_events (
        user_id, event_type, event_category, event_action,
        event_label, event_value, session_id
      )
      VALUES (
        ${event.user_id}, ${event.event_type}, ${event.event_category},
        ${event.event_action}, ${event.event_label}, ${event.event_value},
        uuid_generate_v4()
      )
    `;
  }
}

async function populateLocationHistory() {
  console.log("📍 Populating location history...");

  const users = await sql`SELECT id FROM users LIMIT 10`;

  const locations = [
    {
      user_id: users[0]?.id,
      latitude: -33.9249,
      longitude: 18.4241,
      accuracy: 5.0,
      activity_type: "walking",
    },
    {
      user_id: users[1]?.id,
      latitude: -34.0186,
      longitude: 18.4745,
      accuracy: 3.2,
      activity_type: "in_vehicle",
    },
    {
      user_id: users[2]?.id,
      latitude: -33.8903,
      longitude: 18.6292,
      accuracy: 4.1,
      activity_type: "stationary",
    },
    {
      user_id: users[3]?.id,
      latitude: -34.0342,
      longitude: 18.6290,
      accuracy: 6.8,
      activity_type: "walking",
    },
    {
      user_id: users[4]?.id,
      latitude: -34.0293,
      longitude: 18.6920,
      accuracy: 2.9,
      activity_type: "in_vehicle",
    },
    {
      user_id: users[5]?.id,
      latitude: -29.8587,
      longitude: 31.0218,
      accuracy: 4.5,
      activity_type: "walking",
    },
    {
      user_id: users[6]?.id,
      latitude: -26.2041,
      longitude: 28.0473,
      accuracy: 3.7,
      activity_type: "in_vehicle",
    },
    {
      user_id: users[7]?.id,
      latitude: -25.7479,
      longitude: 28.2293,
      accuracy: 5.2,
      activity_type: "stationary",
    },
    {
      user_id: users[8]?.id,
      latitude: -33.9608,
      longitude: 25.6022,
      accuracy: 4.8,
      activity_type: "walking",
    },
    {
      user_id: users[9]?.id,
      latitude: -29.0852,
      longitude: 26.1596,
      accuracy: 3.6,
      activity_type: "in_vehicle",
    },
  ];

  for (const location of locations) {
    await sql`
      INSERT INTO location_history (
        user_id, latitude, longitude, accuracy, activity_type
      )
      VALUES (
        ${location.user_id}, ${location.latitude}, ${location.longitude},
        ${location.accuracy}, ${location.activity_type}
      )
    `;
  }
}

async function populateUserDevices() {
  console.log("📱 Populating User devices...");

  const users = await sql`SELECT id FROM users LIMIT 10`;
  const platforms = ["android", "ios", "web"];

  for (let i = 0; i < 10; i++) {
    await sql`
      INSERT INTO user_devices (user_id, device_token, device_id, device_name, platform, app_version, os_version, device_model, timezone, locale)
      VALUES (
               ${users[i].id},
               ${`device_token_${i + 1}_${Date.now()}`},
               ${`device_id_${i + 1}`},
               ${`User Device ${i + 1}`},
               ${platforms[i % 3]},
               '1.0.0',
               ${platforms[i % 3] === "android" ? "11.0" : platforms[i % 3] === "ios" ? "15.0" : "Chrome 90"},
               ${platforms[i % 3] === "android" ? "Samsung Galaxy" : platforms[i % 3] === "ios" ? "iPhone 12" : "Desktop"},
               'Africa/Johannesburg',
               'en-ZA'
             )
    `;
  }
}

async function populateNotifications() {
  console.log("🔔 Populating notifications...");

  const users = await sql`SELECT id FROM users LIMIT 10`;

  const notifications = [
    {
      user_id: users[0]?.id,
      title: "Journey Reminder",
      message: "Your planned journey to Wynberg starts in 30 minutes",
      type: "journey",
      category: "reminder",
    },
    {
      user_id: users[1]?.id,
      title: "Fare Update",
      message: "Taxi fare from Cape Town CBD to Bellville updated to R18.00",
      type: "fare_update",
      category: "information",
    },
    {
      user_id: users[2]?.id,
      title: "Route Disruption",
      message: "Traffic delays on Wynberg to Mitchell's Plain route",
      type: "alert",
      category: "traffic",
    },
    {
      user_id: users[3]?.id,
      title: "New Taxi Rank",
      message: "New taxi rank opened near your location",
      type: "info",
      category: "rank_update",
    },
    {
      user_id: users[4]?.id,
      title: "Journey Complete",
      message: "Your journey to Khayelitsha has been completed successfully",
      type: "journey_complete",
      category: "completion",
    },
    {
      user_id: users[5]?.id,
      title: "Sign Verification",
      message: "Your uploaded fare sign has been verified by our team",
      type: "verification",
      category: "content",
    },
    {
      user_id: users[6]?.id,
      title: "Weekly Summary",
      message: "You've completed 5 journeys this week, saving R45.50",
      type: "summary",
      category: "analytics",
    },
    {
      user_id: users[7]?.id,
      title: "Rate Your Trip",
      message: "How was your journey to Mamelodi? Please rate your experience",
      type: "rating_request",
      category: "feedback",
    },
    {
      user_id: users[8]?.id,
      title: "App Update",
      message: "New version available with improved route planning features",
      type: "app_update",
      category: "system",
    },
    {
      user_id: users[9]?.id,
      title: "Safety Alert",
      message: "Please exercise caution on the Bloemfontein to Mangaung route",
      type: "safety",
      category: "alert",
    },
  ];

  for (const notification of notifications) {
    await sql`
      INSERT INTO notifications (
        user_id, title, message, type, category, is_read
      )
      VALUES (
        ${notification.user_id}, ${notification.title}, ${notification.message},
        ${notification.type}, ${notification.category}, false
      )
    `;
  }
}

async function populateFiles() {
  console.log("📁 Populating files...");

  const users = await sql`SELECT id FROM users LIMIT 10`;
  const fileTypes = ["image", "document", "audio", "video"];

  for (let i = 0; i < 10; i++) {
    await sql`
      INSERT INTO files (user_id, file_name, original_filename, file_type, file_category, size_bytes, mime_type, file_hash, storage_path, public_url, is_public)
      VALUES (
               ${users[i].id},
               ${`file_${i + 1}_${Date.now()}.jpg`},
               ${`original_file_${i + 1}.jpg`},
               ${fileTypes[i % 4]},
               'user_upload',
               ${1024 * (i + 1) * 100},
               ${fileTypes[i % 4] === "image" ? "image/jpeg" : "application/octet-stream"},
               ${`hash_${i + 1}_${Date.now()}`},
               ${`/storage/files/file_${i + 1}`},
               ${`https://example.com/files/file_${i + 1}.jpg`},
               ${i % 3 === 0}
             )
    `;
  }
}

async function populateReviews() {
  console.log("⭐ Populating reviews...");

  const users = await sql`SELECT id FROM users LIMIT 10`;
  const entityTypes = ["rank", "route", "journey", "taxi"];
  const comments = [
    "Excellent service, very reliable",
    "Good value for money",
    "Could be improved",
    "Outstanding experience",
    "Average service",
    "Highly recommended",
    "Not satisfied with the service",
    "Great staff and facilities",
    "Needs maintenance",
    "Perfect for daily commute",
  ];

  for (let i = 0; i < 10; i++) {
    await sql`
      INSERT INTO reviews (
        user_id,
        entity_type,
        entity_id,
        rating,
        title,
        comment,
        helpful_count,
        is_verified
      ) VALUES (
                 ${users[i].id},
                 ${entityTypes[i % entityTypes.length]},
                 ${(i % 10) + 1},
                 ${Math.floor(Math.random() * 5) + 1},
                 ${`Review ${i + 1} Title`},
                 ${comments[i]},
                 ${Math.floor(Math.random() * 20)},
                 ${i % 2 === 0}
               );
    `;
  }
}

async function populateReviewVotes() {
  console.log("👍 Populating review votes...");

  const users = await sql`SELECT id FROM users LIMIT 10`;
  const reviews = await sql`SELECT id FROM reviews LIMIT 10`;

  for (let i = 0; i < 10; i++) {
    await sql`
            INSERT INTO review_votes (review_id, user_id, vote_type)
            VALUES (
                ${reviews[i].id}, 
                ${users[(i + 1) % users.length].id}, 
                ${i % 2 === 0 ? "helpful" : "not_helpful"}
            )
        `;
  }
}

async function populateApiRateLimits() {
  console.log("🚦 Populating API rate limits with simulated IPs...");

  const users = await sql`SELECT id FROM users LIMIT 10`;
  const endpoints = [
    "/api/ranks",
    "/api/routes",
    "/api/journeys",
    "/api/search",
    "/api/upload",
  ];

  for (let i = 0; i < 10; i++) {
    const user = users[i % users.length];
    const endpoint = endpoints[i % endpoints.length];

    const randomIP = `192.168.1.${Math.floor(Math.random() * 100) + 1}`; // Simulated IP
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1-hour window


    await sql`
      INSERT INTO api_rate_limits (
        identifier,
        user_id,
        endpoint,
        requests_count,
        window_start,
        expires_at
      ) VALUES (
                 ${randomIP},
                 ${user.id},
                 ${endpoint},
                 ${Math.floor(Math.random() * 50) + 1},
                 ${now.toISOString()},
                 ${expiresAt.toISOString()}
               );
    `;
  }
}
