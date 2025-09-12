import { Router } from "express";
import { previewSegment } from "../controllers/segmentController";

const router = Router();

router.post("/preview", previewSegment);

export default router;
