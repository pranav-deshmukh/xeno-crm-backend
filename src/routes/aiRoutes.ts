import express from 'express';
import { generateMessageSuggestions } from '../controllers/aiController';

const router = express.Router();

// AI message generation endpoints
router.post('/generate-messages', generateMessageSuggestions);     // POST /api/ai/generate-messages       // GET /api/ai/objective-templates

export default router;
