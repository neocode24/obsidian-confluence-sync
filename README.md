# Obsidian Confluence Sync

Obsidian plugin for syncing Confluence pages to your local vault with ontology-based knowledge graph support.

## Features

- **Single Source of Truth**: Sync Confluence pages to Obsidian (one-way sync)
- **Knowledge Graph**: Build ontology-based connections using Obsidian's backlinks and graph view
- **Content Fidelity**: Preserve PlantUML diagrams and Draw.io drawings in their original formats
- **Local Customization**: Add your own notes and tags without losing them on re-sync
- **Multi-Tenant Support**: Manage multiple Confluence instances
- **OAuth Security**: Secure authentication via MCP (no API keys)

## Installation

### Manual Installation

1. Download the latest release from GitHub
2. Extract the files to your Obsidian plugins folder: `<vault>/.obsidian/plugins/obsidian-confluence-sync/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Development Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/neocode24/obsidian-confluence-sync.git
   cd obsidian-confluence-sync
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. For development with auto-reload:
   ```bash
   npm run dev
   ```

5. Copy `main.js`, `manifest.json`, and `styles.css` (if exists) to your vault's plugins folder:
   ```bash
   cp main.js manifest.json <vault>/.obsidian/plugins/obsidian-confluence-sync/
   ```

## Usage

### Initial Setup

1. Open Obsidian Settings → Confluence Sync
2. Add your Confluence instance URL
3. Authenticate via OAuth (MCP)
4. Configure sync filters (optional):
   - Select specific Spaces
   - Filter by Labels
   - Choose page hierarchies

### Syncing Pages

- **Manual Sync**: Open Command Palette (Cmd/Ctrl+P) and run "Sync Confluence Pages"
- **Background Check**: Plugin checks for changes when Obsidian starts
- **Selective Sync**: Only changed pages are updated

### File Structure

Synced pages are stored with the following structure:

```markdown
---
title: Page Title
confluence_id: 123456789
confluence_space: TEAM-ALPHA
confluence_url: https://...
author: your-name
created: 2024-01-15
updated: 2024-11-22
tags: [tag1, tag2]
---

<!-- CONFLUENCE CONTENT START -->
[Original Confluence content]
<!-- CONFLUENCE CONTENT END -->

---

## My Notes (Local Only)
[Your custom notes, tags, and backlinks]
```

## Development

### Project Structure

```
obsidian-confluence-sync/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── settings.ts          # Settings UI
│   ├── sync/
│   │   ├── confluence-client.ts
│   │   ├── sync-engine.ts
│   │   └── change-detector.ts
│   ├── converters/
│   │   ├── markdown-converter.ts
│   │   ├── metadata-builder.ts
│   │   └── link-transformer.ts
│   ├── utils/
│   │   ├── slug.ts
│   │   └── file-manager.ts
│   └── ui/
│       ├── notification.ts
│       └── progress-modal.ts
├── test/
├── docs/
├── manifest.json
├── package.json
└── tsconfig.json
```

### Building

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Testing

```bash
# Run tests
npm test

# Run linter
npm run lint
```

## Roadmap

See [PRD](docs/prd.md) for detailed feature roadmap.

### Epic 1: Foundation & Core Sync Infrastructure ✅ (In Progress)
- Project initialization
- MCP OAuth integration
- Basic markdown conversion
- File management

### Epic 2: Content Fidelity & Local Customization
- Content region separation
- PlantUML/Draw.io preservation
- Attachment downloads
- Link transformation

### Epic 3: User Experience & Advanced Features
- Selective sync filters
- Background change detection
- Multi-tenant management
- Performance optimization

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/neocode24/obsidian-confluence-sync/issues)
- **Discussions**: [GitHub Discussions](https://github.com/neocode24/obsidian-confluence-sync/discussions)

## Acknowledgments

- Built with [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- MCP integration for secure OAuth
- Inspired by the need for unified personal knowledge management

---

**Status**: 🚧 Active Development - MVP Phase

Generated with [Claude Code](https://claude.com/claude-code)
