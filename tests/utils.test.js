/**
 * Utility functions tests
 */

describe('Topic Matching', () => {
    // Simulate the matchTopic function from main.js
    function matchTopic(pattern, topic) {
        if (pattern === topic) return true;

        const patternParts = pattern.split('/');
        const topicParts = topic.split('/');

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i] === '#') {
                return true;
            }
            if (patternParts[i] === '+') {
                continue;
            }
            if (patternParts[i] !== topicParts[i]) {
                return false;
            }
        }

        return patternParts.length === topicParts.length;
    }

    test('should match exact topics', () => {
        expect(matchTopic('home/lights', 'home/lights')).toBe(true);
        expect(matchTopic('home/lights', 'home/other')).toBe(false);
    });

    test('should match single-level wildcard (+)', () => {
        expect(matchTopic('home/+/status', 'home/living/status')).toBe(true);
        expect(matchTopic('home/+/status', 'home/kitchen/status')).toBe(true);
        expect(matchTopic('home/+/status', 'home/living/power')).toBe(false);
    });

    test('should match multi-level wildcard (#)', () => {
        expect(matchTopic('home/#', 'home/lights')).toBe(true);
        expect(matchTopic('home/#', 'home/lights/living/status')).toBe(true);
        expect(matchTopic('sensors/#', 'sensors/temp/outdoor')).toBe(true);
    });

    test('should not match different topic lengths without wildcard', () => {
        expect(matchTopic('home/lights', 'home/lights/status')).toBe(false);
        expect(matchTopic('home/lights/status', 'home/lights')).toBe(false);
    });
});

describe('Payload Matching', () => {
    // Simulate the matchPayload function from main.js
    function matchPayload(matchType, matchValue, payload) {
        switch (matchType) {
            case 'any':
                return true;
            case 'exact':
                return payload === matchValue;
            case 'contains':
                return payload.includes(matchValue);
            case 'regex':
                try {
                    return new RegExp(matchValue).test(payload);
                } catch {
                    return false;
                }
            default:
                return true;
        }
    }

    test('should match any payload', () => {
        expect(matchPayload('any', '', 'anything')).toBe(true);
        expect(matchPayload('any', '', '')).toBe(true);
    });

    test('should match exact payload', () => {
        expect(matchPayload('exact', 'ON', 'ON')).toBe(true);
        expect(matchPayload('exact', 'ON', 'OFF')).toBe(false);
        expect(matchPayload('exact', 'ON', 'on')).toBe(false);
    });

    test('should match payload containing substring', () => {
        expect(matchPayload('contains', 'error', 'An error occurred')).toBe(true);
        expect(matchPayload('contains', 'error', 'Success')).toBe(false);
    });

    test('should match payload with regex', () => {
        expect(matchPayload('regex', '^[0-9]+$', '123')).toBe(true);
        expect(matchPayload('regex', '^[0-9]+$', 'abc')).toBe(false);
        expect(matchPayload('regex', 'ON|OFF', 'ON')).toBe(true);
        expect(matchPayload('regex', 'ON|OFF', 'MAYBE')).toBe(false);
    });

    test('should handle invalid regex gracefully', () => {
        expect(matchPayload('regex', '[invalid', 'test')).toBe(false);
    });
});

describe('Placeholder Replacement', () => {
    // Simplified version of replacePlaceholders
    function replacePlaceholders(text, topic, payload) {
        let result = text
            .replace(/\{topic\}/g, topic)
            .replace(/\{payload\}/g, payload);

        // JSONPath replacement (simplified - just testing the regex)
        const jsonPathRegex = /\{(\$[^}]+)\}/g;
        let match;

        while ((match = jsonPathRegex.exec(text)) !== null) {
            try {
                const jsonPayload = JSON.parse(payload);
                // Simplified: just extract first-level property for testing
                const path = match[1].replace('$.', '');
                const value = jsonPayload[path];
                result = result.replace(match[0], value !== undefined ? String(value) : '');
            } catch {
                result = result.replace(match[0], '');
            }
        }

        return result;
    }

    test('should replace {payload} placeholder', () => {
        expect(replacePlaceholders('Message: {payload}', 'topic', 'Hello'))
            .toBe('Message: Hello');
    });

    test('should replace {topic} placeholder', () => {
        expect(replacePlaceholders('Topic: {topic}', 'home/lights', 'ON'))
            .toBe('Topic: home/lights');
    });

    test('should replace multiple placeholders', () => {
        expect(replacePlaceholders('{topic} = {payload}', 'sensors/temp', '25'))
            .toBe('sensors/temp = 25');
    });

    test('should handle JSON payload with simple JSONPath', () => {
        const payload = JSON.stringify({ temp: 25, unit: 'C' });
        expect(replacePlaceholders('Temperature: {$.temp}', 'topic', payload))
            .toBe('Temperature: 25');
    });

    test('should handle invalid JSON gracefully', () => {
        expect(replacePlaceholders('Value: {$.temp}', 'topic', 'not-json'))
            .toBe('Value: ');
    });
});
