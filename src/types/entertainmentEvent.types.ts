export interface EntertainmentEvent {
    id: string;
    title: string;
    description: string;
    event_type: 'theatre' | 'musical' | 'dj' | 'concert' | 'comedy';
    venue: string;
    address: string;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
    event_date: string;
    event_time: string;
    price_min: number;
    price_max: number;
    image_url?: string;
    website_url?: string;
    contact_info?: string;
    is_featured: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateEntertainmentEventRequest {
    title: string;
    description: string;
    eventType: 'theatre' | 'musical' | 'dj' | 'concert' | 'comedy';
    venue: string;
    address: string;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
    eventDate: string;
    eventTime: string;
    priceMin: number;
    priceMax: number;
    imageUrl?: string;
    websiteUrl?: string;
    contactInfo?: string;
    isFeatured?: boolean;
    isActive?: boolean;
}

export interface UpdateEntertainmentEventRequest {
    title?: string;
    description?: string;
    eventType?: 'theatre' | 'musical' | 'dj' | 'concert' | 'comedy';
    venue?: string;
    address?: string;
    city?: string;
    province?: string;
    latitude?: number;
    longitude?: number;
    eventDate?: string;
    eventTime?: string;
    priceMin?: number;
    priceMax?: number;
    imageUrl?: string;
    websiteUrl?: string;
    contactInfo?: string;
    isFeatured?: boolean;
    isActive?: boolean;
}

export interface EntertainmentEventFilters {
    eventType?: string;
    city?: string;
    province?: string;
    dateFrom?: string;
    dateTo?: string;
    priceMin?: number;
    priceMax?: number;
    isFeatured?: boolean;
    isActive?: boolean;
}

export interface UserEventBookmark {
    id: string;
    user_id: string;
    event_id: string;
    created_at: string;
}

export interface EntertainmentEventWithDistance extends EntertainmentEvent {
    distance?: number;
}

export interface EntertainmentEventWithBookmark extends EntertainmentEvent {
    is_bookmarked?: boolean;
}