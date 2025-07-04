-- =====================================================
-- PERFORMANCE INDEXES FOR BEE RANK DATABASE (NO TRANSACTIONS)
-- =====================================================

-- Users Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Taxi Ranks Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_location ON taxi_ranks(latitude, longitude);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_city ON taxi_ranks(city);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_province ON taxi_ranks(province);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_active ON taxi_ranks(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_name ON taxi_ranks USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_address ON taxi_ranks USING gin(to_tsvector('english', address));

-- Transit Routes Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_origin ON transit_routes(origin_rank_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_destination ON transit_routes(destination_rank_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_active ON transit_routes(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_rank ON transit_routes(rank_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_user ON transit_routes(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_type ON transit_routes(route_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_fare ON transit_routes(fare);

-- Journeys Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_user ON journeys(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_status ON journeys(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_origin ON journeys(origin_rank_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_destination ON journeys(destination_rank_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_created_at ON journeys(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_journey_id ON journeys(journey_id);

-- Route Connections Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_route_connections_journey ON route_connections(journey_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_route_connections_sequence ON route_connections(journey_id, sequence_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_route_connections_route ON route_connections(route_id);

-- Taxis Nearby Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxis_nearby_location ON taxis_nearby(current_latitude, current_longitude);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxis_nearby_route ON taxis_nearby(route_id);

-- Hiking Signs Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hiking_signs_location ON hiking_signs(latitude, longitude);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hiking_signs_user ON hiking_signs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hiking_signs_verified ON hiking_signs(is_verified);

-- User Activities Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_entity ON user_activities(entity_type, entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);

-- Analytics Events Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Location History Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_history_user ON location_history(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_history_recorded_at ON location_history(recorded_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_location_history_user_time ON location_history(user_id, recorded_at);

-- Notifications Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Device Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_devices_token ON user_devices(device_token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_devices_active ON user_devices(is_active);

-- Files Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_type ON files(file_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_hash ON files(file_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_public ON files(is_public);

-- Reviews Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_entity ON reviews(entity_type, entity_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Composite Indexes for Common Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_taxi_ranks_active_city ON taxi_ranks(is_active, city) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transit_routes_active_origin_dest ON transit_routes(is_active, origin_rank_id, destination_rank_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journeys_user_status ON journeys(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activities_user_type_date ON user_activities(user_id, activity_type, created_at);
