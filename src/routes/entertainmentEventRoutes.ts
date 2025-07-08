import express from 'express';
import { EntertainmentEventController } from '../controllers/EntertainmentEventController';
import { authenticate } from '../middleware/auth';
import { trackAnalytics } from '../middleware/analyticsMiddleware';

const router = express.Router();

// Lazy instantiation of controller
const getController = () => new EntertainmentEventController();

// Public routes (no authentication required)
router.get('/', trackAnalytics('entertainment_events_list'), (req, res) => getController().getAllEvents(req, res));
router.get('/search', trackAnalytics('entertainment_events_search'), (req, res) => getController().searchEvents(req, res));
router.get('/stats', trackAnalytics('entertainment_events_stats'), (req, res) => getController().getEventStats(req, res));
router.get('/nearby', trackAnalytics('entertainment_events_nearby'), (req, res) => getController().getNearbyEvents(req, res));
router.get('/type/:type', trackAnalytics('entertainment_events_by_type'), (req, res) => getController().getEventsByType(req, res));
router.get('/:id', trackAnalytics('entertainment_event_detail'), (req, res) => getController().getEventById(req, res));

// Protected routes (authentication required)
router.use(authenticate); // All routes below require authentication

// User bookmark routes
router.get('/user/bookmarks', trackAnalytics('user_entertainment_bookmarks'), (req, res) => getController().getUserBookmarks(req, res));
router.post('/:eventId/bookmark', trackAnalytics('add_entertainment_bookmark'), (req, res) => getController().addBookmark(req, res));
router.delete('/:eventId/bookmark', trackAnalytics('remove_entertainment_bookmark'), (req, res) => getController().removeBookmark(req, res));

// Admin routes (create, update, delete events)
// Note: You might want to add role-based middleware here for admin-only access
router.post('/', trackAnalytics('create_entertainment_event'), (req, res) => getController().createEvent(req, res));
router.put('/:id', trackAnalytics('update_entertainment_event'), (req, res) => getController().updateEvent(req, res));
router.delete('/:id', trackAnalytics('delete_entertainment_event'), (req, res) => getController().deleteEvent(req, res));

export default router;