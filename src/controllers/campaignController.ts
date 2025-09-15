import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Customer from "../models/Customer";
import Segment from "../models/Segment";
import Campaign from "../models/Campaign";
import CommunicationLog from "../models/CommunicationLog";
import { buildMongoQuery } from "../utils/buildMongoQuery";
import { sendToVendorAPI } from "../services/vendorService";

// =================== CAMPAIGN CONTROLLERS ===================

// Create campaign using existing segment
export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { name, segment_id, custom_message } = req.body;

    // Validate required fields
    if (!name || !segment_id || !custom_message) {
      return res.status(400).json({ 
        error: "Missing required fields: name, segment_id, custom_message" 
      });
    }

    // 1. Get the segment using custom segment_id field
    const segment = await Segment.findOne({ segment_id });
    if (!segment) {
      return res.status(404).json({ error: "Segment not found" });
    }

    // 2. Get target customers based on segment rules
    const query = buildMongoQuery(segment.rules);
    const customers = await Customer.find(query).select('customer_id name email');
    
    if (customers.length === 0) {
      return res.status(400).json({ 
        error: "No customers found matching the segment criteria" 
      });
    }

    // 3. Create campaign
    const campaignId = uuidv4();
    const campaign = new Campaign({
      campaign_id: campaignId,
      name,
      segment_id: segment_id, // Store the custom UUID, not ObjectId
      message_template: custom_message,
      status: "RUNNING",
      total_audience: customers.length,
      sent_count: 0,
      failed_count: 0,
      pending_count: customers.length,
      started_at: new Date()
    });
    await campaign.save();

    // 4. Create communication log entries
    const logEntries = customers.map(customer => ({
      campaign_id: campaignId,
      customer_id: customer.customer_id,
      customer_name: customer.name,
      customer_email: customer.email,
      message: custom_message.replace(/\{\{name\}\}/g, customer.name),
      status: "PENDING" as const,
      created_at: new Date()
    }));

    await CommunicationLog.insertMany(logEntries);

    // 5. Initiate delivery (async)
    setImmediate(() => {
      initiateDelivery(campaignId);
    });

    res.status(201).json({
      message: "Campaign created successfully",
      campaign: {
        campaign_id: campaignId,
        name,
        segment_id,
        segment_name: segment.name,
        audience_size: customers.length,
        status: "RUNNING",
        custom_message
      },
    });

  } catch (err) {
    console.error("Campaign creation error:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// Get all campaigns for history page
export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const campaigns = await Campaign.find().sort({ created_at: -1 });

    // ✅ Manual lookup instead of populate since we use custom UUIDs
    const campaignList = await Promise.all(
      campaigns.map(async (campaign) => {
        // Fetch segment using custom segment_id field
        const segment = await Segment.findOne({ segment_id: campaign.segment_id });
        
        return {
          campaign_id: campaign.campaign_id,
          name: campaign.name,
          segment_name: segment?.name || 'Unknown Segment',
          date: campaign.created_at ? campaign.created_at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          audienceSize: campaign.total_audience || 0,
          sent: campaign.sent_count || 0,
          failed: campaign.failed_count || 0,
          pending: campaign.pending_count || 0,
          status: campaign.status ? campaign.status.toLowerCase() : 'unknown',
          message_template: campaign.message_template || ''
        };
      })
    );

    res.json(campaignList);
  } catch (error) {
    console.error('Campaign list error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Get specific campaign status
export const getCampaignStatus = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findOne({ campaign_id: campaignId });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Get segment details using custom segment_id
    const segment = await Segment.findOne({ segment_id: campaign.segment_id });

    res.json({
      campaign_id: campaignId,
      name: campaign.name,
      segment_name: segment?.name || 'Unknown Segment',
      status: campaign.status,
      total_audience: campaign.total_audience,
      sent: campaign.sent_count,
      failed: campaign.failed_count,
      pending: campaign.pending_count,
      started_at: campaign.started_at,
      completed_at: campaign.completed_at,
      message_template: campaign.message_template
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// Get campaign delivery logs
export const getCampaignLogs = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { page = 1, limit = 50, status } = req.query;

    const query: any = { campaign_id: campaignId };
    if (status && status !== 'all') {
      query.status = (status as string).toUpperCase();
    }

    const logs = await CommunicationLog.find(query)
      .sort({ created_at: -1 })
      .limit(Number(limit) * Number(page))
      .skip((Number(page) - 1) * Number(limit));

    const total = await CommunicationLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};


const initiateDelivery = async (campaignId: string) => {
  try {
    const pendingMessages = await CommunicationLog.find({
      campaign_id: campaignId,
      status: "PENDING"
    });

    console.log(`Starting delivery for campaign ${campaignId}: ${pendingMessages.length} messages`);

    // Send messages to vendor API with staggered timing
    pendingMessages.forEach((logEntry, index) => {
      setTimeout(async () => {
        try {
          await sendToVendorAPI({
            messageId: logEntry._id.toString(),
            campaignId: campaignId,
            customerId: logEntry.customer_id,
            customerEmail: logEntry.customer_email,
            message: logEntry.message
          });
        } catch (error) {
          console.error(`❌ Failed to send message ${logEntry._id}:`, error);
        }
      }, index * 500 + Math.random() * 1000); // Staggered delivery
    });

  } catch (error) {
    console.error("Delivery initiation error:", error);
  }
};