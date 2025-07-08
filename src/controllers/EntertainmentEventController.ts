import { Request, Response } from 'express';
import { EntertainmentEventService, CreateEntertainmentEventData, UpdateEntertainmentEventData } from '../services/business/events/EntertainmentEventService';
import { ServiceManager } from '../services/core/manager/ServiceManager';

export class EntertainmentEventController {
    private getEntertainmentEventService(): EntertainmentEventService {
        const serviceManager = ServiceManager.getInstance();
        console.log('🔍 ServiceManager initialized:', serviceManager.isServiceInitialized());
        console.log('🔍 Available services:', Array.from(serviceManager.getAllServices().keys()));
        
        const service = serviceManager.getService('entertainmentEvent') as EntertainmentEventService;
        console.log('🔍 Retrieved service:', service ? 'Found' : 'Not found');
        
        if (!service) {
            throw new Error('EntertainmentEventService not available');
        }
        return service;
    }

    /**
     * Get all entertainment events with optional filtering
     */
    public getAllEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = (page - 1) * limit;

            console.log('🔍 About to get entertainment event service...');
            const entertainmentEventService = this.getEntertainmentEventService();
            console.log('🔍 Got service:', entertainmentEventService ? 'Success' : 'Failed');
            
            if (!entertainmentEventService) {
                throw new Error('EntertainmentEventService is null');
            }
            
            // For now, get all events - we can add filtering later
            const events = await entertainmentEventService.getAllEvents(limit, offset);
            
            res.status(200).json({
                success: true,
                data: events,
                pagination: {
                    page,
                    limit,
                    hasMore: events.length === limit
                }
            });
        } catch (error) {
            console.error('Error getting entertainment events:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve entertainment events',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get entertainment event by ID
     */
    public getEventById = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Event ID is required'
                });
                return;
            }

            const event = await this.getEntertainmentEventService().getEventById(id);
            
            if (!event) {
                res.status(404).json({
                    success: false,
                    message: 'Entertainment event not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: event
            });
        } catch (error) {
            console.error('Error getting entertainment event by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve entertainment event',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Create new entertainment event
     */
    public createEvent = async (req: Request, res: Response): Promise<void> => {
        try {
            const eventData: CreateEntertainmentEventData = {
                title: req.body.title,
                description: req.body.description,
                type: req.body.type,
                venue: req.body.venue,
                address: req.body.address,
                date: req.body.date,
                time: req.body.time,
                price: req.body.price,
                image: req.body.image,
                rating: req.body.rating,
                latitude: req.body.latitude,
                longitude: req.body.longitude
            };
            
            // Basic validation
            if (!eventData.title || !eventData.type || !eventData.date) {
                res.status(400).json({
                    success: false,
                    message: 'Title, event type, and event date are required'
                });
                return;
            }

            const newEvent = await this.getEntertainmentEventService().createEvent(eventData);
            
            res.status(201).json({
                success: true,
                data: newEvent,
                message: 'Entertainment event created successfully'
            });
        } catch (error) {
            console.error('Error creating entertainment event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create entertainment event',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Update entertainment event
     */
    public updateEvent = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updateData: UpdateEntertainmentEventData = req.body;
            
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Event ID is required'
                });
                return;
            }

            const updatedEvent = await this.getEntertainmentEventService().updateEvent(id, updateData);
            
            if (!updatedEvent) {
                res.status(404).json({
                    success: false,
                    message: 'Entertainment event not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: updatedEvent,
                message: 'Entertainment event updated successfully'
            });
        } catch (error) {
            console.error('Error updating entertainment event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update entertainment event',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Delete entertainment event
     */
    public deleteEvent = async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            
            if (!id) {
                res.status(400).json({
                    success: false,
                    message: 'Event ID is required'
                });
                return;
            }

            const deleted = await this.getEntertainmentEventService().deleteEvent(id);
            
            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: 'Entertainment event not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Entertainment event deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting entertainment event:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete entertainment event',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get nearby entertainment events
     */
    public getNearbyEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { latitude, longitude } = req.query;
            const radius = parseFloat(req.query.radius as string) || 10; // Default 10km
            
            if (!latitude || !longitude) {
                res.status(400).json({
                    success: false,
                    message: 'Latitude and longitude are required'
                });
                return;
            }

            const lat = parseFloat(latitude as string);
            const lng = parseFloat(longitude as string);

            if (isNaN(lat) || isNaN(lng)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid latitude or longitude values'
                });
                return;
            }

            const events = await this.getEntertainmentEventService().getNearbyEvents(lat, lng, radius);
            
            res.status(200).json({
                success: true,
                data: events,
                meta: {
                    searchRadius: radius,
                    center: { latitude: lat, longitude: lng },
                    count: events.length
                }
            });
        } catch (error) {
            console.error('Error getting nearby entertainment events:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve nearby entertainment events',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get user's bookmarked events
     */
    public getUserBookmarks = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id; // Assuming auth middleware sets req.user
            
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const bookmarks = await this.getEntertainmentEventService().getUserBookmarkedEvents(userId);
            
            res.status(200).json({
                success: true,
                data: bookmarks
            });
        } catch (error) {
            console.error('Error getting user bookmarks:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve bookmarks',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Add event to user's bookmarks
     */
    public addBookmark = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const { eventId } = req.params;
            
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            if (!eventId) {
                res.status(400).json({
                    success: false,
                    message: 'Event ID is required'
                });
                return;
            }

            const success = await this.getEntertainmentEventService().bookmarkEvent(eventId, userId);
            
            if (!success) {
                res.status(400).json({
                    success: false,
                    message: 'Failed to add bookmark - event may not exist or already bookmarked'
                });
                return;
            }

            res.status(201).json({
                success: true,
                message: 'Event bookmarked successfully'
            });
        } catch (error) {
            console.error('Error adding bookmark:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add bookmark',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Remove event from user's bookmarks
     */
    public removeBookmark = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const { eventId } = req.params;
            
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            if (!eventId) {
                res.status(400).json({
                    success: false,
                    message: 'Event ID is required'
                });
                return;
            }

            const success = await this.getEntertainmentEventService().unbookmarkEvent(eventId, userId);
            
            if (!success) {
                res.status(404).json({
                    success: false,
                    message: 'Bookmark not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Bookmark removed successfully'
            });
        } catch (error) {
            console.error('Error removing bookmark:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to remove bookmark',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get events by type
     */
    public getEventsByType = async (req: Request, res: Response): Promise<void> => {
        try {
            const { type } = req.params;
            
            if (!type) {
                res.status(400).json({
                    success: false,
                    message: 'Event type is required'
                });
                return;
            }

            const events = await this.getEntertainmentEventService().getEventsByType(type);
            
            res.status(200).json({
                success: true,
                data: events
            });
        } catch (error) {
            console.error('Error getting events by type:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve events by type',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Search events
     */
    public searchEvents = async (req: Request, res: Response): Promise<void> => {
        try {
            const { query } = req.query;
            
            if (!query || typeof query !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
                return;
            }

            const events = await this.getEntertainmentEventService().searchEvents(query);
            
            res.status(200).json({
                success: true,
                data: events
            });
        } catch (error) {
            console.error('Error searching events:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search events',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get event statistics
     */
    public getEventStats = async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await this.getEntertainmentEventService().getEventStats();
            
            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error getting event stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve event statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}