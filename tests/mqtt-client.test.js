const EventEmitter = require('events');

// Mock the mqtt module before requiring MqttClient
jest.mock('mqtt', () => {
    const mockClient = {
        on: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        publish: jest.fn(),
        end: jest.fn()
    };
    return {
        connect: jest.fn(() => mockClient),
        _mockClient: mockClient
    };
});

// Mock the fs module
jest.mock('fs', () => ({
    readFileSync: jest.fn((path) => `content of ${path}`)
}));

const mqtt = require('mqtt');
const fs = require('fs');
const MqttClient = require('../electron/mqtt-client');

describe('MqttClient', () => {
    let client;

    beforeEach(() => {
        jest.clearAllMocks();
        client = new MqttClient();
    });

    describe('Constructor', () => {
        test('should extend EventEmitter', () => {
            expect(client).toBeInstanceOf(EventEmitter);
        });

        test('should initialize with default values', () => {
            expect(client.client).toBeNull();
            expect(client.connected).toBe(false);
            expect(client.subscriptions).toBeInstanceOf(Set);
            expect(client.subscriptions.size).toBe(0);
        });
    });

    describe('connect', () => {
        let mockClient;

        beforeEach(() => {
            mockClient = mqtt._mockClient;
            // Setup mock implementation for client events
            mockClient.on.mockImplementation((event, callback) => {
                if (event === 'connect') {
                    // simulate successful connection
                    process.nextTick(callback);
                }
                return mockClient;
            });
        });

        test('should connect with basic options', async () => {
            const config = {
                brokerUrl: 'mqtt://localhost:1883',
                username: 'user',
                password: 'pass',
                clientId: 'my-client'
            };

            await client.connect(config);

            expect(mqtt.connect).toHaveBeenCalledWith('mqtt://localhost:1883', expect.objectContaining({
                username: 'user',
                password: 'pass',
                clientId: 'my-client'
            }));
        });

        test('should auto-adjust broker URL protocol and apply TLS options when tlsEnabled is true', async () => {
            const config = {
                brokerUrl: 'mqtt://localhost:1883',
                tlsEnabled: true,
                rejectUnauthorized: false,
                caPath: '/path/to/ca.crt',
                certPath: '/path/to/client.crt',
                keyPath: '/path/to/client.key'
            };

            await client.connect(config);

            expect(mqtt.connect).toHaveBeenCalledWith('mqtts://localhost:1883', expect.objectContaining({
                rejectUnauthorized: false,
                ca: 'content of /path/to/ca.crt',
                cert: 'content of /path/to/client.crt',
                key: 'content of /path/to/client.key'
            }));
        });

        test('should handle missing protocol by prepending mqtts:// when tlsEnabled is true', async () => {
            const config = {
                brokerUrl: 'localhost:8883',
                tlsEnabled: true
            };

            await client.connect(config);

            expect(mqtt.connect).toHaveBeenCalledWith('mqtts://localhost:8883', expect.any(Object));
        });
    });

    describe('subscribe', () => {
        test('should add topic to subscriptions', () => {
            client.subscribe('test/topic');
            expect(client.subscriptions.has('test/topic')).toBe(true);
        });

        test('should return success result', () => {
            const result = client.subscribe('test/topic');
            expect(result).toEqual({ success: true });
        });
    });

    describe('unsubscribe', () => {
        test('should remove topic from subscriptions', () => {
            client.subscribe('test/topic');
            client.unsubscribe('test/topic');
            expect(client.subscriptions.has('test/topic')).toBe(false);
        });

        test('should return success result', () => {
            client.subscribe('test/topic');
            const result = client.unsubscribe('test/topic');
            expect(result).toEqual({ success: true });
        });
    });

    describe('getStatus', () => {
        test('should return connected status', () => {
            const status = client.getStatus();
            expect(status).toHaveProperty('connected', false);
        });

        test('should return subscriptions as array', () => {
            client.subscribe('topic1');
            client.subscribe('topic2');
            const status = client.getStatus();
            expect(status.subscriptions).toEqual(['topic1', 'topic2']);
        });
    });

    describe('updateSubscriptions', () => {
        test('should add new topics from bindings', () => {
            const bindings = [
                { topic: 'home/lights' },
                { topic: 'home/sensors' }
            ];
            client.updateSubscriptions(bindings);
            expect(client.subscriptions.has('home/lights')).toBe(true);
            expect(client.subscriptions.has('home/sensors')).toBe(true);
        });

        test('should remove topics not in bindings', () => {
            client.subscribe('old/topic');
            const bindings = [{ topic: 'new/topic' }];
            client.updateSubscriptions(bindings);
            expect(client.subscriptions.has('old/topic')).toBe(false);
            expect(client.subscriptions.has('new/topic')).toBe(true);
        });
    });

    describe('disconnect', () => {

        test('should set client to null', () => {
            client.client = { end: jest.fn() };
            client.disconnect();
            expect(client.client).toBeNull();
        });

    });

    describe('Event Emission', () => {
        test('should emit events correctly', () => {
            const connectedHandler = jest.fn();
            const messageHandler = jest.fn();

            client.on('connected', connectedHandler);
            client.on('message', messageHandler);

            client.emit('connected');
            client.emit('message', 'test/topic', 'payload');

            expect(connectedHandler).toHaveBeenCalled();
            expect(messageHandler).toHaveBeenCalledWith('test/topic', 'payload');
        });
    });
});
