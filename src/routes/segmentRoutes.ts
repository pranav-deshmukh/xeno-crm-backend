import { Router } from "express";
import { previewSegment,getSegmentById, getSegments, saveSegment } from "../controllers/segmentController";

const router = Router();

router.post("/preview", previewSegment);
router.post("/save", saveSegment);
router.get("/:id", getSegmentById);
router.get("/", getSegments);

export default router;
