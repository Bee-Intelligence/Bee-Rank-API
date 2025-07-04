import { sql } from "../../../config/db";
import {createIndexes} from "../indexes/indexes";

export async function createAllTables() {
  try {
    console.log("📋 Creating tables...");
    // Enable extensions first
    await sql`CREATE
        EXTENSION IF NOT EXISTS "uuid-ossp"`;
    // Create users' table first (referenced by other tables)
    await sql`
            CREATE TABLE IF NOT EXISTS users
            (
                id
                UUID
                PRIMARY
                KEY
                DEFAULT
                uuid_generate_v4
            (
            ),
                email VARCHAR
            (
                255
            ) UNIQUE NOT NULL,
                password_hash VARCHAR
            (
                255
            ),
                first_name VARCHAR
            (
                255
            ),
                last_name VARCHAR
            (
                255
            ),
                phone VARCHAR
            (
                20
            ),
                profile_image_url TEXT,
                role VARCHAR
            (
                50
            ) DEFAULT 'USER' CHECK
            (
                role
                IN
            (
                'USER',
                'ADMIN',
                'OPERATOR'
            )),
                is_email_verified BOOLEAN DEFAULT false,
                is_phone_verified BOOLEAN DEFAULT false,
                is_first_time_launch BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a taxi_ranks table
    await sql`
            CREATE TABLE IF NOT EXISTS taxi_ranks
            (
                id
                SERIAL
                PRIMARY
                KEY,
                name
                VARCHAR
            (
                255
            ) NOT NULL,
                description TEXT,
                latitude DECIMAL
            (
                10,
                8
            ) NOT NULL,
                longitude DECIMAL
            (
                11,
                8
            ) NOT NULL,
                address TEXT NOT NULL,
                city VARCHAR
            (
                255
            ) NOT NULL,
                province VARCHAR
            (
                255
            ) NOT NULL,
                capacity INTEGER DEFAULT 10,
                facilities JSONB DEFAULT '{}',
                operating_hours JSONB DEFAULT '{"monday": "06:00-22:00", "tuesday": "06:00-22:00", "wednesday": "06:00-22:00", "thursday": "06:00-22:00", "friday": "06:00-22:00", "saturday": "06:00-22:00", "sunday": "06:00-22:00"}',
                contact_number VARCHAR
            (
                20
            ),
                accessibility_features JSONB DEFAULT '[]',
                fare_structure JSONB DEFAULT '{}',
                safety_rating DECIMAL
            (
                3,
                2
            ) DEFAULT 0.0,
                popularity_score INTEGER DEFAULT 0,
                routes JSONB DEFAULT '[]',
                distance DECIMAL
            (
                8,
                3
            ),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a transit_routes table
    await sql`
            CREATE TABLE IF NOT EXISTS transit_routes
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE SET NULL,
                rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE CASCADE,
                origin_rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE CASCADE,
                destination_rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE CASCADE,
                route_name VARCHAR
            (
                255
            ),
                from_location VARCHAR
            (
                255
            ) NOT NULL,
                to_location VARCHAR
            (
                255
            ) NOT NULL,
                fare DECIMAL
            (
                10,
                2
            ) NOT NULL,
                duration_minutes INTEGER,
                distance_km DECIMAL
            (
                8,
                2
            ),
                bus_line TEXT,
                departure_time TIME,
                arrival_time TIME,
                route_type VARCHAR
            (
                50
            ) DEFAULT 'taxi' CHECK
            (
                route_type
                IN
            (
                'taxi',
                'bus',
                'mixed',
                'walking'
            )),
                is_direct BOOLEAN DEFAULT true,
                frequency_minutes INTEGER DEFAULT 30,
                operating_days INTEGER [] DEFAULT '{1,2,3,4,5,6,7}',
                route_points JSONB DEFAULT '[]',
                metadata JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a journey table
    await sql`
      CREATE TABLE IF NOT EXISTS journeys
      (
        id
        SERIAL
        PRIMARY
        KEY,
        journey_id
        UUID
        UNIQUE
        NOT
        NULL
        DEFAULT
        uuid_generate_v4
      (
      ),
        user_id UUID REFERENCES users
      (
        id
      ) ON DELETE CASCADE,
        origin_rank_id INTEGER REFERENCES taxi_ranks
      (
        id
      ),
        destination_rank_id INTEGER REFERENCES taxi_ranks
      (
        id
      ),
        total_fare DECIMAL
      (
        10,
        2
      ) NOT NULL,
        total_duration_minutes INTEGER,
        total_distance_km DECIMAL
      (
        8,
        2
      ),
        hop_count INTEGER DEFAULT 1,
        route_path INTEGER [],
        waypoints JSONB DEFAULT '[]',
        journey_type VARCHAR
      (
        50
      ) DEFAULT 'direct' CHECK
      (
        journey_type
        IN
      (
        'direct',
        'connected',
        'no_route_found'
      )),
        status VARCHAR
      (
        50
      ) DEFAULT 'planned' CHECK
      (
        status
        IN
      (
        'planned',
        'active',
        'completed',
        'cancelled'
      )),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,
        rating INTEGER CHECK
      (
        rating
        >=
        1
        AND
        rating
        <=
        5
      ),
        feedback TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    // Create the route_connections table
    await sql`
            CREATE TABLE IF NOT EXISTS route_connections
            (
                id
                SERIAL
                PRIMARY
                KEY,
                journey_id
                UUID
                REFERENCES
                journeys
            (
                journey_id
            ) ON DELETE CASCADE,
                route_id INTEGER REFERENCES transit_routes
            (
                id
            )
              ON DELETE CASCADE,
                sequence_order INTEGER NOT NULL,
                connection_rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            ),
                segment_fare DECIMAL
            (
                10,
                2
            ),
                segment_duration_minutes INTEGER,
                segment_distance_km DECIMAL
            (
                8,
                2
            ),
                waiting_time_minutes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a taxis_nearby table
    await sql`
            CREATE TABLE IF NOT EXISTS taxis_nearby
            (
                id
                SERIAL
                PRIMARY
                KEY,
                route_id
                INTEGER
                REFERENCES
                transit_routes
            (
                id
            ),
                from_location VARCHAR
            (
                255
            ),
                to_location VARCHAR
            (
                255
            ),
                image_url TEXT NOT NULL,
                description TEXT,
                fare DECIMAL
            (
                10,
                2
            ),
                operating_hours VARCHAR
            (
                255
            ),
                current_latitude DECIMAL
            (
                10,
                8
            ),
                current_longitude DECIMAL
            (
                11,
                8
            ),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a hiking_signs table
    await sql`
            CREATE TABLE IF NOT EXISTS hiking_signs
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE SET NULL,
                image_url TEXT NOT NULL,
                description TEXT,
                latitude DECIMAL
            (
                10,
                8
            ) NOT NULL,
                longitude DECIMAL
            (
                11,
                8
            ) NOT NULL,
                address TEXT,
                from_location VARCHAR
            (
                255
            ),
                to_location VARCHAR
            (
                255
            ),
                fare_amount DECIMAL
            (
                10,
                2
            ),
                sign_type VARCHAR
            (
                50
            ) DEFAULT 'fare_board',
                last_updated_by UUID REFERENCES users
            (
                id
            ),
                verification_count INTEGER DEFAULT 0,
                is_verified BOOLEAN DEFAULT false,
                verification_date TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create the user_activities table
    await sql`
            CREATE TABLE IF NOT EXISTS user_activities
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                activity_type VARCHAR
            (
                255
            ) NOT NULL,
                description TEXT,
                entity_type VARCHAR
            (
                50
            ),
                entity_id INTEGER,
                rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE SET NULL,
                sign_id INTEGER REFERENCES hiking_signs
            (
                id
            )
              ON DELETE SET NULL,
                route_id INTEGER REFERENCES transit_routes
            (
                id
            )
              ON DELETE SET NULL,
                journey_id UUID REFERENCES journeys
            (
                journey_id
            )
              ON DELETE SET NULL,
                session_id UUID,
                latitude DECIMAL
            (
                10,
                8
            ),
                longitude DECIMAL
            (
                11,
                8
            ),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create the analytics_events table
    await sql`
            CREATE TABLE IF NOT EXISTS analytics_events
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE SET NULL,
                event_type VARCHAR
            (
                255
            ) NOT NULL,
                event_category VARCHAR
            (
                100
            ),
                event_action VARCHAR
            (
                100
            ),
                event_label VARCHAR
            (
                255
            ),
                event_value DECIMAL
            (
                10,
                2
            ),
                session_id UUID,
                ip_address INET,
                user_agent TEXT,
                referrer TEXT,
                device_type VARCHAR
            (
                50
            ),
                browser VARCHAR
            (
                100
            ),
                os VARCHAR
            (
                100
            ),
                screen_resolution VARCHAR
            (
                20
            ),
                timezone VARCHAR
            (
                50
            ),
                language VARCHAR
            (
                10
            ),
                country VARCHAR
            (
                50
            ),
                region VARCHAR
            (
                100
            ),
                city VARCHAR
            (
                100
            ),
                latitude DECIMAL
            (
                10,
                8
            ),
                longitude DECIMAL
            (
                11,
                8
            ),
                metadata JSONB DEFAULT '{}',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a location_history table
    await sql`
            CREATE TABLE IF NOT EXISTS location_history
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                latitude DECIMAL
            (
                10,
                8
            ) NOT NULL,
                longitude DECIMAL
            (
                11,
                8
            ) NOT NULL,
                accuracy DECIMAL
            (
                10,
                2
            ),
                altitude DECIMAL
            (
                8,
                2
            ),
                speed DECIMAL
            (
                5,
                2
            ),
                heading DECIMAL
            (
                5,
                2
            ),
                activity_type VARCHAR
            (
                50
            ),
                battery_level INTEGER,
                is_mock_location BOOLEAN DEFAULT false,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create the user_devices table
    await sql`
            CREATE TABLE IF NOT EXISTS user_devices
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                device_token VARCHAR
            (
                500
            ) UNIQUE NOT NULL,
                device_id VARCHAR
            (
                255
            ),
                device_name VARCHAR
            (
                255
            ),
                platform VARCHAR
            (
                20
            ) NOT NULL CHECK
            (
                platform
                IN
            (
                'ios',
                'android',
                'web'
            )),
                app_version VARCHAR
            (
                50
            ),
                os_version VARCHAR
            (
                50
            ),
                device_model VARCHAR
            (
                100
            ),
                push_enabled BOOLEAN DEFAULT true,
                subscribed_topics JSONB DEFAULT '[]',
                timezone VARCHAR
            (
                50
            ),
                locale VARCHAR
            (
                10
            ),
                is_active BOOLEAN DEFAULT true,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a notification table
    await sql`
            CREATE TABLE IF NOT EXISTS notifications
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                title VARCHAR
            (
                255
            ) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR
            (
                50
            ) DEFAULT 'info',
                category VARCHAR
            (
                100
            ),
                action_url TEXT,
                image_url TEXT,
                data JSONB DEFAULT '{}',
                is_read BOOLEAN DEFAULT false,
                read_at TIMESTAMP,
                sent_at TIMESTAMP,
                expires_at TIMESTAMP,
                priority INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a file table
    await sql`
            CREATE TABLE IF NOT EXISTS files
            (
              id SERIAL PRIMARY KEY,
              user_id UUID REFERENCES users(id) ON DELETE SET NULL,
              file_name VARCHAR(255) NOT NULL,
              original_filename VARCHAR(255) NOT NULL,
              file_type VARCHAR(100) NOT NULL,
              size_bytes BIGINT NOT NULL,
              file_category VARCHAR(100) DEFAULT 'general',
              file_url TEXT,
              file_data BYTEA,
              file_hash TEXT,
              mime_type VARCHAR(100),
              storage_path TEXT,
              public_url TEXT,
              is_public BOOLEAN DEFAULT false,
              download_count INTEGER DEFAULT 0,
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `;
    // Create a review table
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,  -- e.g., 'rank', 'route', 'journey', 'taxi'
        entity_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        pros TEXT,
        cons TEXT,
        helpful_count INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        is_anonymous BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    // Create a review_votes table
    await sql`
            CREATE TABLE IF NOT EXISTS review_votes
            (
                id
                SERIAL
                PRIMARY
                KEY,
                review_id
                INTEGER
                REFERENCES
                reviews
            (
                id
            ) ON DELETE CASCADE,
                user_id UUID REFERENCES users
            (
                id
            )
              ON DELETE CASCADE,
                vote_type VARCHAR
            (
                25
            ) CHECK
            (
                vote_type
                IN
            (
                'helpful',
                'not_helpful'
            )),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE
            (
                review_id,
                user_id
            )
                )
        `;
    // Create api_rate_limits table
    await sql`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
       id SERIAL PRIMARY KEY,
       identifier VARCHAR(255) NOT NULL,                       -- e.g., IP, API key, or user hash
       user_id UUID REFERENCES users(id) ON DELETE CASCADE,
       endpoint VARCHAR(255) NOT NULL,                         -- e.g., /api/ranks
       requests_count INTEGER DEFAULT 1,                       -- fixed name
       window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       expires_at TIMESTAMP NOT NULL,                          -- when rate limit resets
       metadata JSONB DEFAULT '{}',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       UNIQUE (identifier, endpoint)
      );
    `;
    // create setting table
    await sql`
            CREATE TABLE IF NOT EXISTS system_settings
            (
                id
                SERIAL
                PRIMARY
                KEY,
                setting_key
                VARCHAR
            (
                255
            ) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type VARCHAR
            (
                50
            ) DEFAULT 'string',
                description TEXT,
                is_public BOOLEAN DEFAULT false,
                updated_by UUID REFERENCES users
            (
                id
            ),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;

    console.log("✅ All tables created successfully");
  } catch (error) {
    console.error("❌ Failed to create tables:", error);
    throw error;
  }
}
export async function createTables() {
  try {
    console.log("📋 Creating tables...");
    // Enable extensions first
    await sql`CREATE
        EXTENSION IF NOT EXISTS "uuid-ossp"`;
    // Create users' table first (referenced by other tables)
    await sql`
            CREATE TABLE IF NOT EXISTS users
            (
                id
                UUID
                PRIMARY
                KEY
                DEFAULT
                uuid_generate_v4
            (
            ),
                email VARCHAR
            (
                255
            ) UNIQUE NOT NULL,
                password_hash VARCHAR
            (
                255
            ),
                first_name VARCHAR
            (
                255
            ),
                last_name VARCHAR
            (
                255
            ),
                phone VARCHAR
            (
                20
            ),
                profile_image_url TEXT,
                role VARCHAR
            (
                50
            ) DEFAULT 'USER' CHECK
            (
                role
                IN
            (
                'USER',
                'ADMIN',
                'OPERATOR'
            )),
                is_email_verified BOOLEAN DEFAULT false,
                is_phone_verified BOOLEAN DEFAULT false,
                is_first_time_launch BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a taxi_ranks table
    await sql`
            CREATE TABLE IF NOT EXISTS taxi_ranks
            (
                id
                SERIAL
                PRIMARY
                KEY,
                name
                VARCHAR
            (
                255
            ) NOT NULL,
                description TEXT,
                latitude DECIMAL
            (
                10,
                8
            ) NOT NULL,
                longitude DECIMAL
            (
                11,
                8
            ) NOT NULL,
                address TEXT NOT NULL,
                city VARCHAR
            (
                255
            ) NOT NULL,
                province VARCHAR
            (
                255
            ) NOT NULL,
                capacity INTEGER DEFAULT 10,
                facilities JSONB DEFAULT '{}',
                operating_hours JSONB DEFAULT '{"monday": "06:00-22:00", "tuesday": "06:00-22:00", "wednesday": "06:00-22:00", "thursday": "06:00-22:00", "friday": "06:00-22:00", "saturday": "06:00-22:00", "sunday": "06:00-22:00"}',
                contact_number VARCHAR
            (
                20
            ),
                accessibility_features JSONB DEFAULT '[]',
                fare_structure JSONB DEFAULT '{}',
                safety_rating DECIMAL
            (
                3,
                2
            ) DEFAULT 0.0,
                popularity_score INTEGER DEFAULT 0,
                routes JSONB DEFAULT '[]',
                distance DECIMAL
            (
                8,
                3
            ),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP


                )
        `;
    // Create a transit_routes table
    await sql`
            CREATE TABLE IF NOT EXISTS transit_routes
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE SET NULL,
                rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE CASCADE,
                origin_rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE CASCADE,
                destination_rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE CASCADE,
                route_name VARCHAR
            (
                255
            ),
                from_location VARCHAR
            (
                255
            ) NOT NULL,
                to_location VARCHAR
            (
                255
            ) NOT NULL,
                fare DECIMAL
            (
                10,
                2
            ) NOT NULL,
                duration_minutes INTEGER,
                distance_km DECIMAL
            (
                8,
                2
            ),
                bus_line TEXT,
                departure_time TIME,
                arrival_time TIME,
                route_type VARCHAR
            (
                50
            ) DEFAULT 'taxi' CHECK
            (
                route_type
                IN
            (
                'taxi',
                'bus',
                'mixed',
                'walking'
            )),
                is_direct BOOLEAN DEFAULT true,
                frequency_minutes INTEGER DEFAULT 30,
                operating_days INTEGER [] DEFAULT '{1,2,3,4,5,6,7}',
                route_points JSONB DEFAULT '[]',
                metadata JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

                )
        `;
    // Create a journey table
    await sql`
      CREATE TABLE IF NOT EXISTS journeys
      (
        id
        SERIAL
        PRIMARY
        KEY,
        journey_id
        UUID
        UNIQUE
        NOT
        NULL
        DEFAULT
        uuid_generate_v4
      (
      ),
        user_id UUID REFERENCES users
      (
        id
      ) ON DELETE CASCADE,
        origin_rank_id INTEGER REFERENCES taxi_ranks
      (
        id
      ),
        destination_rank_id INTEGER REFERENCES taxi_ranks
      (
        id
      ),
        total_fare DECIMAL
      (
        10,
        2
      ) NOT NULL,
        total_duration_minutes INTEGER,
        total_distance_km DECIMAL
      (
        8,
        2
      ),
        hop_count INTEGER DEFAULT 1,
        route_path INTEGER [],
        waypoints JSONB DEFAULT '[]',
        journey_type VARCHAR
      (
        50
      ) DEFAULT 'direct' CHECK
      (
        journey_type
        IN
      (
        'direct',
        'connected',
        'no_route_found'
      )),
        status VARCHAR
      (
        50
      ) DEFAULT 'planned' CHECK
      (
        status
        IN
      (
        'planned',
        'active',
        'completed',
        'cancelled'
      )),
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,
        rating INTEGER CHECK
      (
        rating
        >=
        1
        AND
        rating
        <=
        5
      ),
        feedback TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    // Create the route_connections table
    await sql`
            CREATE TABLE IF NOT EXISTS route_connections
            (
                id
                SERIAL
                PRIMARY
                KEY,
                journey_id
                UUID
                REFERENCES
                journeys
            (
                journey_id
            ) ON DELETE CASCADE,
                route_id INTEGER REFERENCES transit_routes
            (
                id
            )
              ON DELETE CASCADE,
                sequence_order INTEGER NOT NULL,
                connection_rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            ),
                segment_fare DECIMAL
            (
                10,
                2
            ),
                segment_duration_minutes INTEGER,
                segment_distance_km DECIMAL
            (
                8,
                2
            ),
                waiting_time_minutes INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a taxis_nearby table
    await sql`
            CREATE TABLE IF NOT EXISTS taxis_nearby
            (
                id
                SERIAL
                PRIMARY
                KEY,
                route_id
                INTEGER
                REFERENCES
                transit_routes
            (
                id
            ),
                from_location VARCHAR
            (
                255
            ),
                to_location VARCHAR
            (
                255
            ),
                image_url TEXT NOT NULL,
                description TEXT,
                fare DECIMAL
            (
                10,
                2
            ),
                operating_hours VARCHAR
            (
                255
            ),
                current_latitude DECIMAL
            (
                10,
                8
            ),
                current_longitude DECIMAL
            (
                11,
                8
            ),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

                )
        `;
    // Create a hiking_signs table
    await sql`
            CREATE TABLE IF NOT EXISTS hiking_signs
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE SET NULL,
                image_url TEXT NOT NULL,
                description TEXT,
                latitude DECIMAL
            (
                10,
                8
            ) NOT NULL,
                longitude DECIMAL
            (
                11,
                8
            ) NOT NULL,
                address TEXT,
                from_location VARCHAR
            (
                255
            ),
                to_location VARCHAR
            (
                255
            ),
                fare_amount DECIMAL
            (
                10,
                2
            ),
                sign_type VARCHAR
            (
                50
            ) DEFAULT 'fare_board',
                last_updated_by UUID REFERENCES users
            (
                id
            ),
                verification_count INTEGER DEFAULT 0,
                is_verified BOOLEAN DEFAULT false,
                verification_date TIMESTAMP,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create the user_activities table
    await sql`
            CREATE TABLE IF NOT EXISTS user_activities
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                activity_type VARCHAR
            (
                255
            ) NOT NULL,
                description TEXT,
                entity_type VARCHAR
            (
                50
            ),
                entity_id INTEGER,
                rank_id INTEGER REFERENCES taxi_ranks
            (
                id
            )
              ON DELETE SET NULL,
                sign_id INTEGER REFERENCES hiking_signs
            (
                id
            )
              ON DELETE SET NULL,
                route_id INTEGER REFERENCES transit_routes
            (
                id
            )
              ON DELETE SET NULL,
                journey_id UUID REFERENCES journeys
            (
                journey_id
            )
              ON DELETE SET NULL,
                session_id UUID,
                latitude DECIMAL
            (
                10,
                8
            ),
                longitude DECIMAL
            (
                11,
                8
            ),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

                )
        `;
    // Create the analytics_events table
    await sql`
            CREATE TABLE IF NOT EXISTS analytics_events
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE SET NULL,
                event_type VARCHAR
            (
                255
            ) NOT NULL,
                event_category VARCHAR
            (
                100
            ),
                event_action VARCHAR
            (
                100
            ),
                event_label VARCHAR
            (
                255
            ),
                event_value DECIMAL
            (
                10,
                2
            ),
                session_id UUID,
                ip_address INET,
                user_agent TEXT,
                referrer TEXT,
                device_type VARCHAR
            (
                50
            ),
                browser VARCHAR
            (
                100
            ),
                os VARCHAR
            (
                100
            ),
                screen_resolution VARCHAR
            (
                20
            ),
                timezone VARCHAR
            (
                50
            ),
                language VARCHAR
            (
                10
            ),
                country VARCHAR
            (
                50
            ),
                region VARCHAR
            (
                100
            ),
                city VARCHAR
            (
                100
            ),
                latitude DECIMAL
            (
                10,
                8
            ),
                longitude DECIMAL
            (
                11,
                8
            ),
                metadata JSONB DEFAULT '{}',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a location_history table
    await sql`
            CREATE TABLE IF NOT EXISTS location_history
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                latitude DECIMAL
            (
                10,
                8
            ) NOT NULL,
                longitude DECIMAL
            (
                11,
                8
            ) NOT NULL,
                accuracy DECIMAL
            (
                10,
                2
            ),
                altitude DECIMAL
            (
                8,
                2
            ),
                speed DECIMAL
            (
                5,
                2
            ),
                heading DECIMAL
            (
                5,
                2
            ),
                activity_type VARCHAR
            (
                50
            ),
                battery_level INTEGER,
                is_mock_location BOOLEAN DEFAULT false,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create the user_devices table
    await sql`
            CREATE TABLE IF NOT EXISTS user_devices
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                device_token VARCHAR
            (
                500
            ) UNIQUE NOT NULL,
                device_id VARCHAR
            (
                255
            ),
                device_name VARCHAR
            (
                255
            ),
                platform VARCHAR
            (
                20
            ) NOT NULL CHECK
            (
                platform
                IN
            (
                'ios',
                'android',
                'web'
            )),
                app_version VARCHAR
            (
                50
            ),
                os_version VARCHAR
            (
                50
            ),
                device_model VARCHAR
            (
                100
            ),
                push_enabled BOOLEAN DEFAULT true,
                subscribed_topics JSONB DEFAULT '[]',
                timezone VARCHAR
            (
                50
            ),
                locale VARCHAR
            (
                10
            ),
                is_active BOOLEAN DEFAULT true,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a notification table
    await sql`
            CREATE TABLE IF NOT EXISTS notifications
            (
                id
                SERIAL
                PRIMARY
                KEY,
                user_id
                UUID
                REFERENCES
                users
            (
                id
            ) ON DELETE CASCADE,
                title VARCHAR
            (
                255
            ) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR
            (
                50
            ) DEFAULT 'info',
                category VARCHAR
            (
                100
            ),
                action_url TEXT,
                image_url TEXT,
                data JSONB DEFAULT '{}',
                is_read BOOLEAN DEFAULT false,
                read_at TIMESTAMP,
                sent_at TIMESTAMP,
                expires_at TIMESTAMP,
                priority INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;
    // Create a file table
    await sql`
            CREATE TABLE IF NOT EXISTS files
            (
              id SERIAL PRIMARY KEY,
              user_id UUID REFERENCES users(id) ON DELETE SET NULL,
              file_name VARCHAR(255) NOT NULL,
              original_filename VARCHAR(255) NOT NULL,
              file_type VARCHAR(100) NOT NULL,
              size_bytes BIGINT NOT NULL,
              file_category VARCHAR(100) DEFAULT 'general',
              file_url TEXT,
              file_data BYTEA,
              file_hash TEXT,
              mime_type VARCHAR(100),
              storage_path TEXT,
              public_url TEXT,
              is_public BOOLEAN DEFAULT false,
              download_count INTEGER DEFAULT 0,
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `;
    // Create a review table
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,  -- e.g., 'rank', 'route', 'journey', 'taxi'
        entity_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        pros TEXT,
        cons TEXT,
        helpful_count INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        is_anonymous BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    // Create a review_votes table
    await sql`
            CREATE TABLE IF NOT EXISTS review_votes
            (
                id
                SERIAL
                PRIMARY
                KEY,
                review_id
                INTEGER
                REFERENCES
                reviews
            (
                id
            ) ON DELETE CASCADE,
                user_id UUID REFERENCES users
            (
                id
            )
              ON DELETE CASCADE,
                vote_type VARCHAR
            (
                25
            ) CHECK
            (
                vote_type
                IN
            (
                'helpful',
                'not_helpful'
            )),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE
            (
                review_id,
                user_id
            )
                )
        `;
    // Create api_rate_limits table
    await sql`
      CREATE TABLE IF NOT EXISTS api_rate_limits (
       id SERIAL PRIMARY KEY,
       identifier VARCHAR(255) NOT NULL,                       -- e.g., IP, API key, or user hash
       user_id UUID REFERENCES users(id) ON DELETE CASCADE,
       endpoint VARCHAR(255) NOT NULL,                         -- e.g., /api/ranks
       requests_count INTEGER DEFAULT 1,                       -- fixed name
       window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       expires_at TIMESTAMP NOT NULL,                          -- when rate limit resets
       metadata JSONB DEFAULT '{}',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       UNIQUE (identifier, endpoint)
      );
    `;
    // create setting table
    await sql`
            CREATE TABLE IF NOT EXISTS system_settings
            (
                id
                SERIAL
                PRIMARY
                KEY,
                setting_key
                VARCHAR
            (
                255
            ) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type VARCHAR
            (
                50
            ) DEFAULT 'string',
                description TEXT,
                is_public BOOLEAN DEFAULT false,
                updated_by UUID REFERENCES users
            (
                id
            ),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
        `;

    console.log("✅ All tables created successfully");
  } catch (error) {
    console.error("❌ Failed to create tables:", error);
    throw error;
  }
}

export async function initializeDatabase() {
  try {
    await createAllTables();
    await createIndexes();
    console.log("🎉 Database initialization completed successfully");
  } catch (error) {
    console.error("💥 Database initialization failed:", error);
    throw error;
  }
}
