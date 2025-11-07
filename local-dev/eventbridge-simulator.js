const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

class LocalEventBridge {
  constructor() {
    this.subscribers = new Map();
    this.client = new EventBridgeClient({
      endpoint: 'http://localhost:4566',
      region: 'us-east-2',
      credentials: { accessKeyId: 'fake', secretAccessKey: 'fake' }
    });
  }

  subscribe(eventType, handler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType).push(handler);
  }

  async publish(event) {
    console.log(`📡 Publishing event: ${event.DetailType}`);
    
    // Simulate EventBridge
    const subscribers = this.subscribers.get(event.DetailType) || [];
    for (const handler of subscribers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`❌ Event handler error:`, error.message);
      }
    }
  }
}

// Domain event handlers
const eventBridge = new LocalEventBridge();

// Score events → Leaderboard updates
eventBridge.subscribe('ScoreCalculated', async (event) => {
  console.log('🏆 Updating leaderboard for score:', event.Detail.scoreId);
  // Simulate leaderboard calculation
});

// Event events → Athlete notifications
eventBridge.subscribe('EventPublished', async (event) => {
  console.log('📢 Notifying athletes of published event:', event.Detail.eventId);
});

module.exports = eventBridge;
