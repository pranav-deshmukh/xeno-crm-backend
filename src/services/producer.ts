import redis from './redisClient';

export class MessageProducer {
  async publishCustomer(customerData: any) {
    const messageId = await redis.xadd(
      'customer_stream',
      '*',
      'type', 'CREATE_CUSTOMER',
      'data', JSON.stringify(customerData),
      'timestamp', Date.now().toString()
    );
    return messageId;
  }

  async publishOrder(orderData: any) {
    const messageId = await redis.xadd(
      'order_stream',
      '*',
      'type', 'CREATE_ORDER',
      'data', JSON.stringify(orderData),
      'timestamp', Date.now().toString()
    );
    return messageId;
  }
}