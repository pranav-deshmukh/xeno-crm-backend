import redis from './redisClient';
import Customer from '../models/Customer';
import Order from '../models/Order';

type RedisStreamMessage = [string, string[]]; // [messageId, fields]
type RedisStreamData = [string, RedisStreamMessage[]]; // [streamName, messages]
type RedisStreamResponse = RedisStreamData[] | null;

export class MessageConsumer {
  private isRunning = false;

  async start() {
    this.isRunning = true;
    
    // Create consumer groups
    try {
      await redis.xgroup('CREATE', 'customer_stream', 'customer_processors', '0', 'MKSTREAM');
    } catch (error) {
      console.log('Customer consumer group already exists');
    }

    try {
      await redis.xgroup('CREATE', 'order_stream', 'order_processors', '0', 'MKSTREAM');
    } catch (error) {
      console.log('Order consumer group already exists');
    }

    // Start consuming
    this.consumeCustomers();
    this.consumeOrders();
  }

  private async consumeCustomers() {
    while (this.isRunning) {
      try {
        const messages = await redis.xreadgroup(
          'GROUP', 'customer_processors', 'worker-1',
          'COUNT', 1,
          'BLOCK', 1000,
          'STREAMS', 'customer_stream', '>'
        )as RedisStreamResponse;

        if (messages && messages.length > 0) {
          for (const [_, msgs] of messages) {
            for (const [messageId, fields] of msgs) {
              await this.processCustomerMessage(messageId, fields);
            }
          }
        }
      } catch (error) {
        console.error('Error consuming customer messages:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async consumeOrders() {
    while (this.isRunning) {
      try {
        const messages = await redis.xreadgroup(
          'GROUP', 'order_processors', 'worker-1',
          'COUNT', 1,
          'BLOCK', 1000,
          'STREAMS', 'order_stream', '>'
        )as RedisStreamResponse;

        if (messages && messages.length > 0) {
          for (const [_, msgs] of messages) {
            for (const [messageId, fields] of msgs) {
              await this.processOrderMessage(messageId, fields);
            }
          }
        }
      } catch (error) {
        console.error('Error consuming order messages:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processCustomerMessage(messageId: string, fields: string[]) {
    try {
      const fieldsObj = this.parseFields(fields);
      const customerData = JSON.parse(fieldsObj.data);

      // Check if customer already exists
      const existing = await Customer.findOne({
        customer_id: customerData.customer_id,
      });

      if (!existing) {
        const customer = new Customer(customerData);
        await customer.save();
        console.log(`Customer ${customerData.customer_id} saved successfully`);
      } else {
        console.log(`Customer ${customerData.customer_id} already exists, skipping`);
      }

      // Acknowledge the message
      await redis.xack('customer_stream', 'customer_processors', messageId);
    } catch (error) {
      console.error(`Error processing customer message ${messageId}:`, error);
      // In production, you might want to move failed messages to a dead letter queue
    }
  }

  private async processOrderMessage(messageId: string, fields: string[]) {
    try {
      const fieldsObj = this.parseFields(fields);
      const orderData = JSON.parse(fieldsObj.data);

      const order = new Order(orderData);
      await order.save();

      // Update customer stats
      const customer = await Customer.findOne({
        customer_id: orderData.customer_id,
      });

      if (customer) {
        customer.total_spent += orderData.amount;
        customer.total_orders += 1;
        customer.last_order_date = orderData.order_date;
        await customer.save();
      }

      console.log(`Order ${orderData.order_id} processed successfully`);
      
      // Acknowledge the message
      await redis.xack('order_stream', 'order_processors', messageId);
    } catch (error) {
      console.error(`Error processing order message ${messageId}:`, error);
    }
  }

  private parseFields(fields: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]] = fields[i + 1];
    }
    return obj;
  }

  stop() {
    this.isRunning = false;
  }
}