import { Request, Response } from "express";
import CommunicationLog from "../models/CommunicationLog";
import Campaign from "../models/Campaign";


interface DeliveryUpdate {
  messageId: string;
  campaignId: string;
  vendorMessageId?: string;
  status: 'SENT' | 'FAILED';
  failureReason?: string;
  deliveryTimestamp: Date;
}

class DeliveryReceiptProcessor {
  private updateQueue: DeliveryUpdate[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private batchInterval = 2000;

  constructor() {
    setInterval(() => {
      this.processBatch();
    }, this.batchInterval);
  }

  addToQueue(update: DeliveryUpdate) {
    this.updateQueue.push(update);
    console.log(`Added to queue. Queue size: ${this.updateQueue.length}`);
  }

  private async processBatch() {
    if (this.isProcessing || this.updateQueue.length === 0) return;

    this.isProcessing = true;
    
    try {
      const batch = this.updateQueue.splice(0, this.batchSize);
      if (batch.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`Processing batch of ${batch.length} delivery updates`);

      // 1. Update individual message logs
      const logBulkOps = batch.map(update => ({
        updateOne: {
          filter: { _id: update.messageId },
          update: {
            $set: {
              status: update.status,
              vendor_message_id: update.vendorMessageId,
              delivery_timestamp: update.deliveryTimestamp,
              ...(update.failureReason && { failure_reason: update.failureReason })
            }
          }
        }
      }));

      await CommunicationLog.bulkWrite(logBulkOps);

      // 2. Update campaign counters
      const campaignUpdates = batch.reduce((acc, update) => {
        if (!acc[update.campaignId]) {
          acc[update.campaignId] = { sent: 0, failed: 0 };
        }
        if (update.status === 'SENT') {
          acc[update.campaignId].sent++;
        } else {
          acc[update.campaignId].failed++;
        }
        return acc;
      }, {} as Record<string, { sent: number; failed: number }>);

      // Update each campaign's counters
      for (const [campaignId, counts] of Object.entries(campaignUpdates)) {
        await Campaign.updateOne(
          { campaign_id: campaignId },
          {
            $inc: {
              sent_count: counts.sent,
              failed_count: counts.failed,
              pending_count: -(counts.sent + counts.failed)
            }
          }
        );

        // Check if campaign completed
        const campaign = await Campaign.findOne({ campaign_id: campaignId });
        if (campaign && campaign.pending_count <= 0) {
          await Campaign.updateOne(
            { campaign_id: campaignId },
            {
              $set: {
                status: "COMPLETED",
                completed_at: new Date()
              }
            }
          );
        }
      }

      console.log(`Batch update completed: ${batch.length} messages processed`);

    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

const deliveryProcessor = new DeliveryReceiptProcessor();

export const handleDeliveryReceipt = async (req: Request, res: Response) => {
  try {
    const { messageId, campaignId, vendorMessageId, status, failureReason, deliveryTimestamp } = req.body;

    deliveryProcessor.addToQueue({
      messageId,
      campaignId,
      vendorMessageId,
      status,
      failureReason,
      deliveryTimestamp: new Date(deliveryTimestamp)
    });

    res.status(200).json({ 
      message: "Delivery receipt received",
      messageId 
    });

  } catch (error) {
    console.error('Delivery receipt error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
};