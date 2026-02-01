# RunMQTT

A Windows desktop application for MQTT-based command execution and automation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Electron](https://img.shields.io/badge/electron-28.x-blue.svg)

## Features

- 🔌 **MQTT Client** - Connect to any MQTT broker (Mosquitto, HiveMQ, etc.)
- ⚡ **Command Bindings** - Execute system commands based on MQTT messages
- 🔔 **Notifications** - Display Windows toast notifications triggered by MQTT
- 📋 **Activity Log** - Real-time view of messages, commands, and notifications
- 🔧 **JSONPath Support** - Extract values from JSON payloads using `{$.path}`
- 💾 **Persistent Config** - Settings saved automatically

## Action Types

| Action | Description |
|--------|-------------|
| **Run Program** | Launch executables with arguments |
| **Shell Command** | Execute PowerShell or CMD commands |
| **Batch Script** | Run multi-line batch scripts |
| **Set Volume** | Control system volume |
| **Send Keys** | Simulate keyboard input |

## Placeholders

Use placeholders in your command configurations:

```
{payload}       → Full MQTT message payload
{topic}         → MQTT topic name
{$.path.to.value} → Extract value from JSON payload
```

**Example:** If payload is `{"temp": 72, "unit": "F"}`:
- `{$.temp}` → `72`
- `Temperature: {$.temp}{$.unit}` → `Temperature: 72F`

## Installation

### From Release

Download `RunMQTT-Portable.exe` from the [Releases](../../releases) page.

### From Source

```bash
# Clone repository
git clone https://github.com/yourusername/runmqtt.git
cd runmqtt

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for Windows
npm run dist:win
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run electron:dev

# Run tests
npm test

# Build production
npm run build

# Create Windows executable
npm run dist:win
```

## Project Structure

```
runmqtt/
├── electron/           # Main process files
│   ├── main.js         # Electron main entry
│   ├── preload.js      # Preload script (IPC bridge)
│   ├── mqtt-client.js  # MQTT connection handler
│   ├── command-executor.js  # Command execution
│   └── config-manager.js    # Settings persistence
├── src/                # Renderer process files
│   ├── main.js         # UI logic
│   └── index.css       # Styles
├── tests/              # Unit tests
├── assets/             # Icons and images
└── index.html          # Main UI
```

## Configuration

Settings are stored in your user data directory:
- Windows: `%APPDATA%/runmqtt/config.json`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.
