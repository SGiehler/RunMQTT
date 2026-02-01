const mqtt = require('mqtt');
const EventEmitter = require('events');

class MqttClient extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.connected = false;
        this.subscriptions = new Set();
    }

    async connect(config) {
        return new Promise((resolve, reject) => {
            if (this.client) {
                this.disconnect();
            }

            const options = {
                clientId: config.clientId || `mqtt-controller-${Date.now()}`,
                clean: true,
                connectTimeout: 10000,
                reconnectPeriod: 5000
            };

            if (config.username) {
                options.username = config.username;
                options.password = config.password;
            }

            try {
                this.client = mqtt.connect(config.brokerUrl, options);

                this.client.on('connect', () => {
                    this.connected = true;
                    this.emit('connected');

                    // Resubscribe to all topics
                    for (const topic of this.subscriptions) {
                        this.client.subscribe(topic);
                    }

                    resolve();
                });

                this.client.on('error', (error) => {
                    this.emit('error', error);
                    if (!this.connected) {
                        reject(error);
                    }
                });

                this.client.on('close', () => {
                    this.connected = false;
                    this.emit('disconnected');
                });

                this.client.on('message', (topic, message) => {
                    const payload = message.toString();
                    this.emit('message', topic, payload);
                });

                this.client.on('offline', () => {
                    this.connected = false;
                    this.emit('disconnected');
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.client) {
            this.client.end(true);
            this.client = null;
            this.connected = false;
            this.emit('disconnected');
        }
    }

    subscribe(topic) {
        this.subscriptions.add(topic);
        if (this.client && this.connected) {
            this.client.subscribe(topic);
        }
        return { success: true };
    }

    unsubscribe(topic) {
        this.subscriptions.delete(topic);
        if (this.client && this.connected) {
            this.client.unsubscribe(topic);
        }
        return { success: true };
    }

    updateSubscriptions(bindings) {
        // Get all unique topics from bindings
        const newTopics = new Set(bindings.map(b => b.topic));

        // Unsubscribe from removed topics
        for (const topic of this.subscriptions) {
            if (!newTopics.has(topic)) {
                this.unsubscribe(topic);
            }
        }

        // Subscribe to new topics
        for (const topic of newTopics) {
            if (!this.subscriptions.has(topic)) {
                this.subscribe(topic);
            }
        }
    }

    getStatus() {
        return {
            connected: this.connected,
            subscriptions: Array.from(this.subscriptions)
        };
    }
}

module.exports = MqttClient;
