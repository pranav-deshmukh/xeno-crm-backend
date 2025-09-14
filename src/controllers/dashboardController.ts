// controllers/dashboardController.ts
import { Request, Response } from "express";
import Customer from "../models/Customer";
import Segment from "../models/Segment";
import Campaign from "../models/Campaign";
import CommunicationLog from "../models/CommunicationLog";

// Helper function to get delivery rate statistics
const getDeliveryRateStats = async () => {
  try {
    const result = await Campaign.aggregate([
      {
        $group: {
          _id: null,
          totalSent: { $sum: "$sent_count" },
          totalAudience: { $sum: "$total_audience" },
          totalCampaigns: { $sum: 1 }
        }
      }
    ]);

    if (result.length === 0) {
      return { avgRate: 0, totalSent: 0, totalAudience: 0 };
    }

    const { totalSent, totalAudience } = result[0];
    const avgRate = totalAudience > 0 ? (totalSent / totalAudience) * 100 : 0;

    return {
      avgRate: parseFloat(avgRate.toFixed(2)),
      totalSent,
      totalAudience
    };
  } catch (error) {
    console.error('Error calculating delivery stats:', error);
    return { avgRate: 0, totalSent: 0, totalAudience: 0 };
  }
};

// Helper function to get recent campaigns
const getRecentCampaigns = async () => {
  try {
    const campaigns = await Campaign.find()
      .sort({ created_at: -1 })
      .limit(5)
      .lean(); // Use lean() for better performance

    // Get segment names for each campaign
    const campaignList = await Promise.all(
      campaigns.map(async (campaign) => {
        const segment = await Segment.findOne({ segment_id: campaign.segment_id }).lean();
        
        return {
          campaign_id: campaign.campaign_id,
          name: campaign.name,
          status: campaign.status ? campaign.status.toLowerCase() : 'unknown',
          sent: campaign.sent_count || 0,
          failed: campaign.failed_count || 0,
          audience: campaign.total_audience || 0,
          date: campaign.created_at 
            ? campaign.created_at.toISOString().split('T')[0] 
            : new Date().toISOString().split('T')[0],
          segment_name: segment?.name || 'Unknown Segment'
        };
      })
    );

    return campaignList;
  } catch (error) {
    console.error('Error fetching recent campaigns:', error);
    return [];
  }
};

// Helper function to get top segments by audience size
const getTopSegments = async () => {
  try {
    const segments = await Segment.find()
      .sort({ audience_size: -1 })
      .limit(5)
      .select('name audience_size description created_at')
      .lean();

    return segments.map(segment => ({
      name: segment.name,
      size: segment.audience_size || 0,
      description: segment.description || '',
      // Simulate engagement based on audience size and recency
      engagement: getEngagementLevel(segment.audience_size, segment.created_at)
    }));
  } catch (error) {
    console.error('Error fetching top segments:', error);
    return [];
  }
};

// Helper function to simulate engagement level
const getEngagementLevel = (audienceSize: number, createdAt: Date): 'high' | 'medium' | 'low' => {
  const daysSinceCreation = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  
  if (audienceSize > 10000 && daysSinceCreation < 30) return 'high';
  if (audienceSize > 5000 && daysSinceCreation < 60) return 'medium';
  return 'low';
};

// Helper function to get channel performance (simulated data)
const getChannelPerformance = () => {
  return [
    { channel: 'Email', deliveryRate: 96.2, icon: 'mail' },
    { channel: 'SMS', deliveryRate: 91.8, icon: 'smartphone' },
    { channel: 'WhatsApp', deliveryRate: 98.5, icon: 'message-circle' }
  ];
};

// Main dashboard stats controller
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    console.log('🔍 Fetching dashboard statistics...');

    // Run all queries in parallel for better performance
    const [
      totalCustomers,
      totalSegments, 
      totalCampaigns,
      deliveryStats,
      recentCampaigns,
      topSegments
    ] = await Promise.all([
      Customer.countDocuments(),
      Segment.countDocuments(),
      Campaign.countDocuments(),
      getDeliveryRateStats(),
      getRecentCampaigns(),
      getTopSegments()
    ]);

    // Get additional metrics
    const channelPerformance = getChannelPerformance();

    // Calculate trends (simulated for now)
    const trends = {
      customersGrowth: 12.5,
      segmentsGrowth: 8.2,
      campaignsGrowth: -5.1,
      deliveryRateGrowth: 3.4
    };

    const responseData = {
      // Core metrics
      totalCustomers: totalCustomers || 0,
      totalSegments: totalSegments || 0,
      totalCampaigns: totalCampaigns || 0,
      avgDeliveryRate: deliveryStats?.avgRate || 0,
      
      // Recent activity
      recentCampaigns: recentCampaigns || [],
      topSegments: topSegments || [],
      
      // Additional insights
      channelPerformance: channelPerformance,
      totalSent: deliveryStats?.totalSent || 0,
      totalAudience: deliveryStats?.totalAudience || 0,
      
      // Growth trends
      trends: trends,
      
      // Metadata
      generatedAt: new Date().toISOString(),
      dataFreshness: 'real-time'
    };

    console.log('✅ Dashboard stats compiled successfully');
    console.log(`📊 Stats: ${totalCustomers} customers, ${totalCampaigns} campaigns, ${deliveryStats?.avgRate?.toFixed(1)}% delivery rate`);

    res.json(responseData);

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.json({ 
      error: (error as Error).message,
      // Fallback data
      totalCustomers: 0,
      totalSegments: 0,
      totalCampaigns: 0,
      avgDeliveryRate: 0,
      recentCampaigns: [],
      topSegments: [],
      generatedAt: new Date().toISOString()
    });
  }
};

// Additional endpoint for real-time campaign updates
export const getCampaignUpdates = async (req: Request, res: Response) => {
  try {
    const runningCampaigns = await Campaign.find({ status: 'RUNNING' })
      .select('campaign_id name sent_count failed_count pending_count total_audience')
      .lean();

    const updates = runningCampaigns.map(campaign => ({
      campaign_id: campaign.campaign_id,
      name: campaign.name,
      progress: campaign.total_audience > 0 
        ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_audience) * 100)
        : 0,
      sent: campaign.sent_count,
      failed: campaign.failed_count,
      pending: campaign.pending_count
    }));

    res.json({ 
      runningCampaigns: updates,
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    res.json({ 
      error: (error as Error).message,
      runningCampaigns: []
    });
  }
};