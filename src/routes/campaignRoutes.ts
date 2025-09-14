import express from "express";
import { 
  createCampaign, 
  getCampaigns, 
  getCampaignStatus 
} from "../controllers/campaignController";
import { handleDeliveryReceipt } from "../controllers/deliveryController";

const router = express.Router();

router.post("/create", createCampaign);
router.get("/get", getCampaigns);
router.get("/campaigns/:campaignId/status", getCampaignStatus);

router.post("/delivery-receipt", handleDeliveryReceipt);

export default router;