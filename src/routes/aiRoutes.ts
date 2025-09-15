import express from 'express';
import { generateMessageSuggestions, generateSegmentRules } from '../controllers/aiController';

const router = express.Router();

// AI message generation endpoints
router.post('/generate-messages', generateMessageSuggestions);     // POST /api/ai/generate-messages       // GET /api/ai/objective-templates
router.post('/generate-segment-rules', generateSegmentRules);     // POST /api/ai/generate-messages       // GET /api/ai/objective-templates

export default router;
