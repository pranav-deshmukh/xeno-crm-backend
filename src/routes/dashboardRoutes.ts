// routes/dashboard.ts
import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController';

const router = express.Router();

// GET /api/dashboard/stats - Get all dashboard statistics
router.get('/stats', getDashboardStats);

export default router;