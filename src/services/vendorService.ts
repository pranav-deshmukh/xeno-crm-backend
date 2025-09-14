// services/vendorService.ts
import axios from 'axios';

interface VendorMessage {
  messageId: string;
  campaignId: string;
  customerId: string;
  customerEmail: string;
  message: string;
}

export const sendToVendorAPI = async (messageData: VendorMessage) => {
  try {
    console.log(`📤 Sending message ${messageData.messageId} to vendor API`);
    
    // Simulate vendor API processing time
    const processingDelay = 1000 + Math.random() * 3000; // 1-4 seconds
    await new Promise(resolve => setTimeout(resolve, processingDelay));
    
    // Simulate 90% success rate
    const isSuccess = Math.random() < 0.9;
    const vendorMessageId = `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine delivery status and failure reason
    const deliveryStatus = isSuccess ? 'SENT' : 'FAILED';
    let failureReason;
    
    if (!isSuccess) {
      // Random failure reasons
      const reasons = [
        'Invalid email address',
        'Network timeout',
        'Rate limit exceeded',
        'Temporary server error',
        'Email bounced'
      ];
      failureReason = reasons[Math.floor(Math.random() * reasons.length)];
    }
    
    // Call our delivery receipt API
    const deliveryReceiptPayload = {
      messageId: messageData.messageId,
      campaignId: messageData.campaignId,
      vendorMessageId,
      status: deliveryStatus,
      failureReason,
      deliveryTimestamp: new Date().toISOString()
    };

    await axios.post('http://localhost:8080/api/campaigns/delivery-receipt', deliveryReceiptPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    console.log(`✅ Message ${messageData.messageId} ${deliveryStatus}${failureReason ? ` - ${failureReason}` : ''}`);
    
  } catch (error) {
    console.error(`❌ Vendor API error for message ${messageData.messageId}:`, error);
    
    // Report failure to delivery receipt API as fallback
    try {
      await axios.post('http://localhost:8080/api/delivery-receipt', {
        messageId: messageData.messageId,
        campaignId: messageData.campaignId,
        status: 'FAILED',
        failureReason: 'Vendor API communication error',
        deliveryTimestamp: new Date().toISOString()
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
    } catch (receiptError) {
      console.error('💥 Failed to report delivery failure:', receiptError);
    }
  }
};