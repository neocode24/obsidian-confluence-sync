# Obsidian Confluence Sync - Fullstack Architecture Document

## 1. Introduction

This document outlines the complete fullstack architecture for Obsidian Confluence Sync, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### 1.1 Starter Template or Existing Project

**Current Status:** Greenfield project started with Story 1.1 basic structure:
- Obsidian Plugin sample template based
- TypeScript + esbuild configuration completed
- `main.ts`, `manifest.json`, `package.json` created

**Constraints:**
- Must comply with Obsidian Plugin API structure
- esbuild bundler usage (already configured)
- TypeScript 4.9+ required

### 1.2 Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-22 | v0.1 | Initial architecture document creation | Winston (Architect) |
| 2025-11-22 | v0.2 | Must-Fix items completed: LinkTransformer (6.7), Rate Limit Strategy (18.1.1), Schema Migration (9.1.1) | Winston (Architect) |

---

## 2. High Level Architecture

### 2.1 Technical Summary

Obsidian Confluence Sync adopts a **Client-Side Monolithic Plugin Architecture**. It is a TypeScript plugin running within the Obsidian app, communicating securely with the Atlassian Confluence API via MCP (Model Context Protocol) using OAuth authentication. The plugin queries Confluence pages, converts HTML to Markdown, and saves them to the user's local Vault with YAML Frontmatter metadata. Core technologies include TypeScript, esbuild bundler, and Obsidian Plugin API, with external integration through the Atlassian MCP Server. This architecture achieves the PRD's core goals of knowledge integration, data integrity, and cross-platform accessibility, implementing atomic file writes to prevent iCloud synchronization conflicts.

### 2.2 Platform and Infrastructure Choice

This project is a **pure client-side application** that does not require traditional cloud platforms.

**Platform:** Client-Side Only (Obsidian Desktop/Mobile Apps)

**Key Services:**
- Obsidian Plugin API (UI, File System, Settings)
- Atlassian MCP Server (OAuth & Confluence API proxy)
- iCloud Drive (user's cross-device Vault sync)

**Deployment Host and Regions:**
- **Development:** Local development environment (macOS)
- **Deployment:** GitHub Releases (manual install) → Obsidian Community Plugins (auto install)
- **Runtime:** User's local devices (Mac, iPad, iPhone)

**Rationale:**
- Obsidian plugins run client-side only, no separate server infrastructure needed
- MCP Server is a separate process already configured by Atlassian
- iCloud leverages existing infrastructure users are already using

### 2.3 Repository Structure

**Structure:** Monorepo (Single Repository)

**Monorepo Tool:** Not needed (single plugin project)

**Package Organization:**
- Single package structure
- All source code organized by module in `src/` directory
- Tests separated in `test/` directory
- Documentation managed in `docs/` directory

**Rationale:**
- Already decided as Monorepo in PRD
- Single plugin project with no additional microservices or backend
- Tools like Nx, Turborepo would be over-engineering
- npm workspaces also unnecessary (no shared packages)

### 2.4 High Level Architecture Diagram

```mermaid
graph TB
    subgraph "User Device (Mac/iPad/iPhone)"
        subgraph "Obsidian App"
            UI[Plugin UI<br/>Settings, Modals, Notifications]
            Plugin[Confluence Sync Plugin<br/>TypeScript]
            VaultAPI[Obsidian Vault API<br/>File I/O]
            PluginData[Plugin Data API<br/>Settings Storage]
        end

        subgraph "Local File System"
            Vault[Obsidian Vault<br/>Markdown Files]
            SyncHistory[sync-history.json<br/>Timestamp Tracking]
        end

        iCloud[iCloud Drive<br/>Cross-Device Sync]
    end

    subgraph "External Services"
        MCP[Atlassian MCP Server<br/>OAuth Proxy]
        Confluence[Confluence Cloud<br/>REST API]
    end

    UI -->|User Actions| Plugin
    Plugin -->|Settings CRUD| PluginData
    Plugin -->|OAuth Flow| MCP
    MCP -->|OAuth Token| Plugin
    Plugin -->|API Calls<br/>with Token| MCP
    MCP -->|Proxied Requests| Confluence
    Confluence -->|Page Data<br/>HTML, Metadata| MCP
    MCP -->|Response| Plugin
    Plugin -->|Write Files| VaultAPI
    VaultAPI -->|Atomic Write| Vault
    Plugin -->|Read/Write| SyncHistory
    Vault -.->|Auto Sync| iCloud
    iCloud -.->|Other Devices| Vault
```

### 2.5 Architectural Patterns

- **Plugin-Based Architecture:** Leverages Obsidian's plugin system for extensible structure - _Rationale:_ Naturally integrates with Obsidian ecosystem, provides standard lifecycle management

- **Layered Architecture:** Separation of UI Layer → Business Logic Layer → Data Access Layer - _Rationale:_ Separation of concerns improves testability and maintainability

- **Repository Pattern:** Abstracts file system access logic through FileManager - _Rationale:_ Minimizes impact of Obsidian API changes, enables testing with Mocks

- **Strategy Pattern:** Applies different conversion strategies for various formats in Markdown Converter - _Rationale:_ Separates conversion logic for special content types like PlantUML, Draw.io

- **Observer Pattern:** Background change detection and notifications - _Rationale:_ Asynchronously notifies users of Confluence changes

- **Facade Pattern:** Simplifies Confluence API access through MCP Client - _Rationale:_ Provides simple interface for complex OAuth flow and API calls

- **Template Method Pattern:** Defines common steps in synchronization workflow - _Rationale:_ Reuses common logic across different sync scenarios like full/incremental sync

- **Atomic Operations Pattern:** Atomic file writes to prevent iCloud conflicts - _Rationale:_ Meets NFR7 requirement, prevents data loss

---

## 3. Tech Stack

### 3.1 Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.3.2 | Plugin development language | Obsidian Plugin API type safety, improved maintainability |
| Frontend Framework | Obsidian Plugin API | latest | UI and plugin lifecycle | Obsidian ecosystem standard, native integration |
| UI Component Library | Obsidian UI Components | latest | Settings, Modal, Notice etc | Obsidian design system consistency, no additional dependencies |
| State Management | Plugin Instance Properties | N/A | Plugin state management | Simple state structure, no separate library needed |
| Backend Language | TypeScript | 5.3.2 | Business logic (sync engine) | Same language as frontend for type consistency |
| Backend Framework | N/A (Pure TypeScript) | N/A | Serverless client logic | No separate backend server needed |
| API Style | REST (Confluence API) | N/A | Confluence data retrieval | Uses Confluence REST API via Atlassian MCP |
| Database | JSON Files (Local FS) | N/A | sync-history.json, settings storage | Lightweight, local persistence, no DB overhead |
| Cache | In-Memory Object | N/A | Page ID → File name mapping | Fast lookup within sync session, no persistent cache needed |
| File Storage | Obsidian Vault (Local FS) | N/A | Markdown file storage | Obsidian's native storage |
| Authentication | MCP OAuth 2.0 | N/A | Confluence authentication | NFR2 security policy compliance, API Key prohibited |
| Frontend Testing | Vitest | ^1.0.0 | Unit tests (converters, utils) | Fast execution, TypeScript native support |
| Backend Testing | Vitest | ^1.0.0 | Business logic tests | Unified testing environment |
| E2E Testing | Manual Testing | N/A | Obsidian plugin integration tests | Deferred to Phase 2 in PRD (complexity) |
| Build Tool | npm scripts | 10.x | Build orchestration | Simple build pipeline |
| Bundler | esbuild | 0.19.9 | TypeScript → JavaScript bundling | Fast build speed, Obsidian plugin standard |
| IaC Tool | N/A | N/A | No infrastructure | Client-only application |
| CI/CD | GitHub Actions | N/A | Automated builds, releases | GitHub native integration, free tier |
| Monitoring | Console Logging | N/A | Development debugging | Production monitoring unnecessary (local app) |
| Logging | Custom Logger (file-based) | N/A | .obsidian/plugins/.../logs/ | Story 3.7 requirement, user debugging support |
| CSS Framework | Obsidian CSS Variables | N/A | Theme consistency | Obsidian theme system compliance |
| HTML→MD Converter | Turndown | ^7.2.0 | Confluence HTML → Markdown | PRD specified, stable conversion library |
| Slug Generator | slugify | ^1.6.6 | URL-safe filename generation | PRD specified, multilingual support |
| YAML Parser | js-yaml | ^4.1.0 | Frontmatter parsing/generation | PRD specified, standard YAML library |
| MCP Client | @modelcontextprotocol/sdk | ^0.5.0 | MCP server communication | Atlassian MCP integration |

---

## 4. Data Models

### 4.1 ConfluencePage

**Purpose:** Represents page data retrieved from Confluence API

**Key Attributes:**
- `id: string` - Confluence page ID (number as string)
- `title: string` - Page title
- `spaceKey: string` - Space identifier (e.g., "TEAM")
- `content: string` - Confluence Storage Format HTML
- `version: number` - Page version number
- `lastModified: string` - ISO-8601 timestamp
- `author: string` - Author account ID
- `url: string` - Full page URL
- `labels: string[]` - List of page labels
- `parentId?: string` - Parent page ID (optional, for hierarchy)
- `attachments?: Attachment[]` - Attachment list

#### TypeScript Interface

```typescript
interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  content: string;
  version: number;
  lastModified: string;
  author: string;
  url: string;
  labels: string[];
  parentId?: string;
  attachments?: Attachment[];
}
```

#### Relationships
- Has many `Attachment` (attachments)
- Has optional parent `ConfluencePage` (hierarchy)
- Maps to one `SyncRecord` (sync history)
- Maps to one Obsidian Markdown File (after sync)

### 4.2 Attachment

**Purpose:** Confluence page attachments (images, PDFs, etc.)

**Key Attributes:**
- `id: string` - Attachment ID
- `title: string` - Filename (e.g., "diagram.png")
- `mediaType: string` - MIME type (e.g., "image/png")
- `fileSize: number` - Size in bytes
- `downloadUrl: string` - Download URL
- `pageId: string` - Parent page ID

#### TypeScript Interface

```typescript
interface Attachment {
  id: string;
  title: string;
  mediaType: string;
  fileSize: number;
  downloadUrl: string;
  pageId: string;
}
```

#### Relationships
- Belongs to one `ConfluencePage`
- Maps to one local file in `attachments/{page-slug}/`

### 4.3 SyncRecord

**Purpose:** Sync history stored in sync-history.json

**Key Attributes:**
- `pageId: string` - Confluence page ID
- `lastSyncTime: string` - Last sync time (ISO-8601)
- `lastModified: string` - Confluence's lastModified (for comparison)
- `fileName: string` - Generated Markdown filename (slug)
- `filePath: string` - Full path within Vault
- `checksum?: string` - File integrity verification (optional)

#### TypeScript Interface

```typescript
interface SyncRecord {
  pageId: string;
  lastSyncTime: string;
  lastModified: string;
  fileName: string;
  filePath: string;
  checksum?: string;
}

// sync-history.json file structure
interface SyncHistory {
  [pageId: string]: SyncRecord;
}
```

#### Relationships
- Maps to one `ConfluencePage`
- Maps to one Obsidian Markdown File

### 4.4 MarkdownFile

**Purpose:** Structure of Markdown files saved to Obsidian Vault

**Key Attributes:**
- `frontmatter: FileFrontmatter` - YAML Frontmatter metadata
- `confluenceContent: string` - Confluence original area (between markers)
- `localNotes: string` - User's local notes area

#### TypeScript Interface

```typescript
interface FileFrontmatter {
  title: string;
  confluence_id: string;
  confluence_space: string;
  confluence_url: string;
  author: string;
  created: string;
  updated: string;
  tags: string[];
}

interface MarkdownFile {
  frontmatter: FileFrontmatter;
  confluenceContent: string;
  localNotes: string;
}
```

#### Relationships
- Generated from one `ConfluencePage`
- Has one `SyncRecord`
- Contains references to local `Attachment` files

### 4.5 PluginSettings

**Purpose:** Plugin settings stored in Obsidian Plugin Data

**Key Attributes:**
- `tenants: TenantConfig[]` - Multi-Confluence tenant settings
- `syncPath: string` - Sync path within Vault (default: "confluence/")
- `attachmentsPath: string` - Attachment save path (default: "attachments/")
- `filters: SyncFilters` - Sync filter settings
- `backgroundCheck: boolean` - Enable background check
- `backgroundInterval: number` - Check interval (minutes)
- `showNotifications: boolean` - Show notifications
- `logLevel: LogLevel` - Logging level

#### TypeScript Interface

```typescript
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface TenantConfig {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  // OAuth token managed by MCP, not stored here
}

interface SyncFilters {
  spaces: string[]; // Space keys
  labels: string[]; // Label names
  pageTreeRoot?: string; // Specific page subtree only
}

interface PluginSettings {
  tenants: TenantConfig[];
  syncPath: string;
  attachmentsPath: string;
  filters: SyncFilters;
  backgroundCheck: boolean;
  backgroundInterval: number;
  showNotifications: boolean;
  logLevel: LogLevel;
}

// Default settings
const DEFAULT_SETTINGS: PluginSettings = {
  tenants: [],
  syncPath: 'confluence/',
  attachmentsPath: 'attachments/',
  filters: { spaces: [], labels: [] },
  backgroundCheck: true,
  backgroundInterval: 30,
  showNotifications: true,
  logLevel: 'INFO',
};
```

#### Relationships
- Has many `TenantConfig`
- Used by `SyncEngine` to filter pages
- Persisted via Obsidian Plugin Data API

---

## 5. API Specification

This project does not provide its own REST/GraphQL API but **consumes the Confluence REST API**. This section covers **Confluence API endpoints to be used**.

### 5.1 Confluence REST API (via MCP)

The plugin calls Confluence Cloud REST API v2 through the Atlassian MCP Server. All requests include MCP OAuth token.

**Base URL:** `https://{tenant}.atlassian.net/wiki/api/v2/`

**Authentication:** OAuth 2.0 Bearer Token (managed by MCP)

**Headers:**
```http
Authorization: Bearer {oauth_token}
Content-Type: application/json
Accept: application/json
```

#### 5.1.1 Search Pages (CQL Query)

Retrieve list of Confluence pages created by current user using CQL.

**Endpoint:** `GET /wiki/api/v2/search`

**Query Parameters:**
- `cql` (required): CQL query string
  - Default: `creator = currentUser() AND type = page`
  - With filters: `creator = currentUser() AND type = page AND space IN (SPACE1, SPACE2) AND label IN (label1, label2)`
- `limit` (optional): Result count (default: 25, max: 100)
- `cursor` (optional): Pagination cursor
- `expand` (optional): Fields to expand (e.g., `body.storage,version,metadata.labels`)

**Request Example:**
```http
GET /wiki/api/v2/search?cql=creator%20%3D%20currentUser()%20AND%20type%20%3D%20page&limit=50&expand=body.storage,version,metadata.labels
```

**Error Responses:**
- `401 Unauthorized`: OAuth token expired or invalid
- `403 Forbidden`: Insufficient permissions
- `400 Bad Request`: CQL syntax error

#### 5.1.2 Get Page by ID

Retrieve detailed information for a specific page.

**Endpoint:** `GET /wiki/api/v2/pages/{pageId}`

**Path Parameters:**
- `pageId` (required): Confluence page ID

**Query Parameters:**
- `body-format` (optional): `storage` (default), `view`, `export_view`
- `get-draft` (optional): `true`/`false` (include draft)
- `expand` (optional): `children.page,children.attachment,version`

#### 5.1.3 Get Page Attachments

Retrieve list of attachments for a page.

**Endpoint:** `GET /wiki/api/v2/pages/{pageId}/attachments`

#### 5.1.4 Download Attachment

Download attachment binary data.

**Endpoint:** `GET /wiki/download/attachments/{pageId}/{filename}`

#### 5.1.5 Get Current User

Retrieve current authenticated user information.

**Endpoint:** `GET /wiki/api/v2/user/current`

### 5.2 MCP Client Interface

The plugin does not call Confluence API directly but through **MCP Client**.

```typescript
interface MCPClient {
  initiateOAuth(tenantUrl: string): Promise<string>;
  exchangeToken(authCode: string): Promise<OAuthToken>;
  refreshToken(refreshToken: string): Promise<OAuthToken>;
  request<T>(endpoint: string, options?: RequestOptions): Promise<T>;
}
```

---

## 6. Components

**Total Components:** 11

### 6.1 ConfluenceClient

**Responsibility:** Confluence API calls and OAuth management via MCP

**Key Interfaces:**
- `searchPages(cql: string): Promise<ConfluencePage[]>`
- `getPage(pageId: string): Promise<ConfluencePage>`
- `getAttachments(pageId: string): Promise<Attachment[]>`
- `downloadAttachment(pageId: string, filename: string): Promise<Blob>`

**Dependencies:** MCPClient (external SDK)

**Technology Stack:** TypeScript, @modelcontextprotocol/sdk

### 6.2 MarkdownConverter

**Responsibility:** Convert Confluence Storage Format HTML to Obsidian Markdown

**Key Interfaces:**
- `convertPage(page: ConfluencePage): Promise<string>`
- `extractPlantUML(html: string): PlantUMLBlock[]`
- `extractDrawio(html: string): DrawioBlock[]`

**Dependencies:** Turndown, LinkTransformer

**Technology Stack:** TypeScript, turndown ^7.2.0

### 6.3 MetadataBuilder

**Responsibility:** Generate YAML Frontmatter metadata

**Key Interfaces:**
- `buildFrontmatter(page: ConfluencePage): FileFrontmatter`
- `serializeFrontmatter(frontmatter: FileFrontmatter): string`

**Dependencies:** js-yaml

**Technology Stack:** TypeScript, js-yaml ^4.1.0

### 6.4 FileManager

**Responsibility:** Obsidian Vault file system operations (Repository pattern)

**Key Interfaces:**
- `writeFile(filePath: string, content: string): Promise<void>`
- `readFile(filePath: string): Promise<string>`
- `generateSlug(title: string): string`

**Dependencies:** Obsidian Vault API, slugify

**Technology Stack:** TypeScript, Obsidian API, slugify ^1.6.6

### 6.5 SyncEngine

**Responsibility:** Synchronization workflow orchestration

**Key Interfaces:**
- `syncAll(): Promise<SyncResult>`
- `syncChangedPages(): Promise<SyncResult>`

**Dependencies:** ConfluenceClient, ChangeDetector, MarkdownConverter, MetadataBuilder, FileManager, ContentSeparator

**Technology Stack:** TypeScript

### 6.6 ChangeDetector

**Responsibility:** Detect changes between Confluence and local files

**Key Interfaces:**
- `detectChanges(remotePages: ConfluencePage[]): Promise<PageChanges>`
- `loadSyncHistory(): Promise<SyncHistory>`
- `saveSyncHistory(history: SyncHistory): Promise<void>`

**Dependencies:** FileManager

**Technology Stack:** TypeScript

### 6.7 LinkTransformer

**Responsibility:** Transform Confluence page links to Obsidian wikilinks

**Key Interfaces:**
- `transformPageLinks(html: string, pageIdMap: Map<string, string>): string`
- `extractConfluenceLinks(html: string): ConfluenceLink[]`
- `buildPageIdMap(syncHistory: SyncHistory): Map<string, string>`

**Dependencies:** None (pure transformation logic)

**Technology Stack:** TypeScript

**Implementation Notes:**
```typescript
interface ConfluenceLink {
  pageId: string;
  originalUrl: string;
  linkText: string;
}

class LinkTransformer {
  // Confluence 링크 패턴: /wiki/spaces/SPACE/pages/123456/Page+Title
  private readonly CONFLUENCE_LINK_PATTERN =
    /\/wiki\/spaces\/[^\/]+\/pages\/(\d+)/g;

  transformPageLinks(html: string, pageIdMap: Map<string, string>): string {
    return html.replace(this.CONFLUENCE_LINK_PATTERN, (match, pageId) => {
      const fileName = pageIdMap.get(pageId);

      if (fileName) {
        // 변환 성공: Obsidian 위키링크
        return `[[${fileName}]]`;
      } else {
        // 변환 실패: 원본 URL 유지 + TODO 주석
        return `${match} <!-- TODO: Link to unsynced page ${pageId} -->`;
      }
    });
  }

  extractConfluenceLinks(html: string): ConfluenceLink[] {
    const links: ConfluenceLink[] = [];
    const regex = /<a href="(\/wiki\/spaces\/[^"]+\/pages\/(\d+)[^"]*)"[^>]*>([^<]+)<\/a>/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
      links.push({
        pageId: match[2],
        originalUrl: match[1],
        linkText: match[3]
      });
    }

    return links;
  }

  buildPageIdMap(syncHistory: SyncHistory): Map<string, string> {
    const map = new Map<string, string>();

    for (const [pageId, record] of Object.entries(syncHistory.pages)) {
      map.set(pageId, record.fileName.replace('.md', ''));
    }

    return map;
  }
}
```

### 6.8 ContentSeparator

**Responsibility:** Separate/merge Confluence original and local notes areas

**Key Interfaces:**
- `wrapContent(frontmatter: FileFrontmatter, confluenceMarkdown: string): string`
- `updateConfluenceContent(existingFile: string, newContent: string): string`

**Dependencies:** MetadataBuilder

**Technology Stack:** TypeScript

### 6.9 SettingsTab

**Responsibility:** Render Obsidian Settings UI

**Key Interfaces:**
- `display(): void`
- `onTenantAdd(): void`

**Dependencies:** Obsidian Setting API, ConfluenceClient

**Technology Stack:** TypeScript, Obsidian API

### 6.10 NotificationHandler

**Responsibility:** Background change detection and user notifications

**Key Interfaces:**
- `scheduleBackgroundCheck(): void`
- `showChangeNotification(changes: PageChanges): void`

**Dependencies:** ChangeDetector, SyncEngine, Obsidian Notice API

**Technology Stack:** TypeScript, Obsidian API

### 6.11 ProgressModal

**Responsibility:** Display sync progress Modal

**Key Interfaces:**
- `show(total: number): void`
- `updateProgress(current: number, message: string): void`

**Dependencies:** Obsidian Modal API

**Technology Stack:** TypeScript, Obsidian API

---

## 7. External APIs

### 7.1 Atlassian MCP Server (Official)

**Purpose:** OAuth 2.0 authentication and API proxy for Confluence Cloud API

**Documentation:** https://github.com/modelcontextprotocol/servers

**Base URL(s):**
- MCP Server: Local process (runs on user machine)
- Confluence API (Proxied): `https://{tenant}.atlassian.net/wiki/api/v2/`

**Authentication:** OAuth 2.0 (Authorization Code Flow with PKCE)

**Rate Limits:**
- Confluence API: Approximately 1000-5000 requests per hour (varies by tenant tier)
- MCP Server: No limit (local execution)

**Key Endpoints Used:**
1. OAuth Authorization (MCP handles browser OAuth flow automatically)
2. Search Pages (via MCP)
3. Get Page Details (via MCP)
4. Get Attachments (via MCP)
5. Download Attachment (via MCP)

**Integration Notes:**

**Critical Security Policy Compliance:**
- ✅ **API Key usage prohibited** (company security policy)
- ✅ **OAuth 2.0 via MCP usage** (Atlassian officially provided)
- ✅ Tokens securely managed by MCP, plugin does not need to store tokens directly

### 7.2 No Other External APIs

This plugin only uses Atlassian MCP/Confluence API. No other external service integrations.

---

## 8. Core Workflows

### 8.1 Workflow 1: Initial Setup and OAuth Authentication

User installs plugin for the first time and connects Confluence tenant.

```mermaid
sequenceDiagram
    actor User
    participant Settings as SettingsTab
    participant Client as ConfluenceClient
    participant MCP as Atlassian MCP Server
    participant Browser
    participant Confluence as Confluence Cloud

    User->>Settings: Enter tenant URL
    User->>Settings: Click "Connect Confluence"

    Settings->>Client: initiateOAuth(tenantUrl)
    Client->>MCP: Start MCP process (Stdio Transport)
    MCP-->>Client: Connection success

    Client->>MCP: callTool("confluence_auth_start")
    MCP->>Browser: Open OAuth URL
    Browser->>Confluence: User login page
    User->>Browser: Login and consent
    Confluence->>Browser: Authorization Code (redirect)
    Browser->>MCP: Pass code

    MCP->>Confluence: POST /oauth/token (Code → Token exchange)
    Confluence->>MCP: Access Token + Refresh Token
    MCP->>MCP: Store tokens securely
    MCP-->>Client: Authentication success

    Client-->>Settings: Connection complete
    Settings->>User: "✅ Confluence Connected" Notice
```

### 8.2 Workflow 2: Manual Full Sync

User executes full sync from command palette.

### 8.3 Workflow 3: Background Change Detection and Notification

Background detection of changes when Obsidian starts and notification display.

### 8.4 Workflow 4: Re-sync Existing Page (Local Notes Preservation)

Re-syncing existing page while preserving local notes.

### 8.5 Workflow 5: Attachment Download

Syncing page with attachments.

---

## 9. Database Schema

This project uses **JSON file-based local storage** instead of traditional databases.

### 9.1 sync-history.json

Core data file tracking sync history.

**File Location:** `.obsidian/plugins/confluence-sync/sync-history.json`

**Structure:**

```json
{
  "version": "1.0",
  "lastUpdate": "2024-11-22T15:30:00.000Z",
  "pages": {
    "123456789": {
      "pageId": "123456789",
      "lastSyncTime": "2024-11-22T15:30:00.000Z",
      "lastModified": "2024-11-20T14:22:00.000Z",
      "fileName": "api-design-guide.md",
      "filePath": "confluence/api-design-guide.md",
      "checksum": "a3f5c9e2b1d4...",
      "spaceKey": "TEAM",
      "title": "API Design Guide"
    }
  },
  "statistics": {
    "totalPages": 150,
    "lastFullSync": "2024-11-20T10:00:00.000Z",
    "syncCount": 12
  }
}
```

**Indexing and Queries:**
- **Primary Key:** `pageId`
- **Query Patterns:**
  - Per-page change detection: `O(1)` - direct `pages[pageId]` access
  - Space filtering: `O(n)` - full iteration (fast enough for ~150 pages)

**Performance Considerations:**
- **Memory Loading:** Load entire file to memory on plugin start
- **Batch Updates:** Save once after sync completion (minimize I/O)
- **File Size Estimate:**
  - ~200 bytes per page
  - 1000 pages = ~200 KB (small enough)
  - 10000 pages = ~2 MB (still manageable)

### 9.1.1 Schema Migration Strategy

**Version Management:**

```typescript
interface SyncHistoryV1 {
  version: "1.0";
  lastUpdate: string;
  pages: Record<string, SyncRecordV1>;
}

interface SyncHistoryV2 {
  version: "2.0";
  lastUpdate: string;
  pages: Record<string, SyncRecordV2>;
  metadata: {
    totalPages: number;
    lastFullSync: string;
    syncCount: number;
  };
}

// Future versions...
type SyncHistory = SyncHistoryV1 | SyncHistoryV2;
```

**Migration Implementation:**

```typescript
class SyncHistoryManager {
  private readonly CURRENT_VERSION = "2.0";

  async loadSyncHistory(): Promise<SyncHistoryV2> {
    const filePath = '.obsidian/plugins/confluence-sync/sync-history.json';

    if (!await this.vault.adapter.exists(filePath)) {
      return this.createEmptyHistory();
    }

    const content = await this.vault.adapter.read(filePath);
    const data = JSON.parse(content) as SyncHistory;

    // Auto-migrate to latest version
    return this.migrateToLatest(data);
  }

  private migrateToLatest(data: SyncHistory): SyncHistoryV2 {
    if (data.version === this.CURRENT_VERSION) {
      return data as SyncHistoryV2;
    }

    // Chain migrations: v1.0 → v2.0 → v3.0 → ...
    let migrated: any = data;

    if (migrated.version === "1.0") {
      migrated = this.migrateV1toV2(migrated as SyncHistoryV1);
    }

    // Future migrations:
    // if (migrated.version === "2.0") {
    //   migrated = this.migrateV2toV3(migrated as SyncHistoryV2);
    // }

    return migrated;
  }

  private migrateV1toV2(oldData: SyncHistoryV1): SyncHistoryV2 {
    console.log('Migrating sync-history from v1.0 to v2.0...');

    const newData: SyncHistoryV2 = {
      version: "2.0",
      lastUpdate: oldData.lastUpdate,
      pages: {},
      metadata: {
        totalPages: Object.keys(oldData.pages).length,
        lastFullSync: oldData.lastUpdate,
        syncCount: 1 // Unknown, default to 1
      }
    };

    // Migrate each page record
    for (const [pageId, record] of Object.entries(oldData.pages)) {
      newData.pages[pageId] = {
        ...record,
        // Add new fields with defaults
        spaceKey: 'UNKNOWN', // v2.0 added spaceKey
        title: record.fileName.replace('.md', '') // Extract from filename
      };
    }

    console.log(`Migration complete. ${newData.metadata.totalPages} pages migrated.`);
    return newData;
  }

  private createEmptyHistory(): SyncHistoryV2 {
    return {
      version: this.CURRENT_VERSION,
      lastUpdate: new Date().toISOString(),
      pages: {},
      metadata: {
        totalPages: 0,
        lastFullSync: new Date().toISOString(),
        syncCount: 0
      }
    };
  }

  async saveSyncHistory(history: SyncHistoryV2): Promise<void> {
    const filePath = '.obsidian/plugins/confluence-sync/sync-history.json';

    // Always save with current version
    history.version = this.CURRENT_VERSION;
    history.lastUpdate = new Date().toISOString();

    const content = JSON.stringify(history, null, 2);
    await this.vault.adapter.write(filePath, content);
  }
}
```

**Backward Compatibility:**

```typescript
// v1.0 Schema
interface SyncRecordV1 {
  pageId: string;
  lastSyncTime: string;
  lastModified: string;
  fileName: string;
  filePath: string;
  checksum?: string;
}

// v2.0 Schema (added fields)
interface SyncRecordV2 extends SyncRecordV1 {
  spaceKey: string; // NEW: For multi-space filtering
  title: string;    // NEW: For search/display
}
```

**Migration Testing:**

```typescript
// test/unit/SyncHistoryManager.test.ts
describe('SyncHistoryManager Migration', () => {
  it('should migrate v1.0 to v2.0', async () => {
    const v1Data: SyncHistoryV1 = {
      version: "1.0",
      lastUpdate: "2024-01-01T00:00:00Z",
      pages: {
        "123456": {
          pageId: "123456",
          lastSyncTime: "2024-01-01T00:00:00Z",
          lastModified: "2024-01-01T00:00:00Z",
          fileName: "test-page.md",
          filePath: "confluence/test-page.md"
        }
      }
    };

    const manager = new SyncHistoryManager(mockVault);
    const v2Data = manager['migrateV1toV2'](v1Data);

    expect(v2Data.version).toBe("2.0");
    expect(v2Data.pages["123456"].spaceKey).toBe("UNKNOWN");
    expect(v2Data.pages["123456"].title).toBe("test-page");
    expect(v2Data.metadata.totalPages).toBe(1);
  });
});
```

---

## 10. Frontend Architecture

### 10.1 Component Architecture

Obsidian plugin uses **Obsidian API's native UI components** without React, Vue, etc.

**Component Organization:**
```
src/ui/
├── settings/
│   ├── SettingsTab.ts
│   ├── TenantSection.ts
│   └── FilterSection.ts
├── modals/
│   ├── ProgressModal.ts
│   └── ErrorModal.ts
└── notifications/
    └── NotificationHandler.ts
```

### 10.2 State Management Architecture

Uses **plugin instance properties** for state management without complex libraries (Redux, Zustand).

```typescript
export default class ConfluenceSyncPlugin extends Plugin {
  settings: PluginSettings;
  confluenceClient: ConfluenceClient;
  syncEngine: SyncEngine;

  private syncState: {
    isRunning: boolean;
    currentPage: number;
    totalPages: number;
  } | null = null;
}
```

### 10.3 Styling and Theming

Uses **Obsidian CSS Variables** to maintain theme consistency.

```css
.confluence-sync-settings {
  padding: var(--size-4-4);
}

.tenant-card {
  background-color: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
}
```

---

## 11. Backend Architecture

### 11.1 Service Architecture

"Backend" in Obsidian plugin refers to **client-side business logic**.

**Service Organization:**
```
src/
├── sync/
│   ├── SyncEngine.ts
│   ├── ChangeDetector.ts
│   └── ContentSeparator.ts
├── converters/
│   ├── MarkdownConverter.ts
│   └── strategies/
│       ├── PlantUMLStrategy.ts
│       └── DrawioStrategy.ts
└── api/
    └── ConfluenceClient.ts
```

### 11.2 Core Service Implementations

#### SyncEngine (Orchestrator)

```typescript
export class SyncEngine {
  async syncAll(): Promise<SyncResult> {
    const pages = await this.confluenceClient.searchPages(cql);
    const changes = await this.changeDetector.detectChanges(pages);

    // Batch processing (10 at a time)
    for (let i = 0; i < changes.modified.length; i += 10) {
      const batch = changes.modified.slice(i, i + 10);
      await Promise.allSettled(batch.map(p => this.syncPage(p)));
    }
  }
}
```

#### FileManager (Atomic Writes)

```typescript
async writeFile(filePath: string, content: string): Promise<void> {
  const tempPath = filePath + '.tmp';

  await this.vault.adapter.write(tempPath, content);
  await this.vault.adapter.rename(tempPath, filePath); // Atomic
}
```

---

## 12. Unified Project Structure

```
obsidian-confluence-sync/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── main.ts
│   ├── api/
│   │   └── ConfluenceClient.ts
│   ├── sync/
│   │   ├── SyncEngine.ts
│   │   ├── ChangeDetector.ts
│   │   └── ContentSeparator.ts
│   ├── converters/
│   │   ├── MarkdownConverter.ts
│   │   ├── MetadataBuilder.ts
│   │   └── strategies/
│   ├── utils/
│   │   ├── FileManager.ts
│   │   ├── slug.ts
│   │   └── logger.ts
│   └── ui/
│       ├── settings/
│       ├── modals/
│       └── notifications/
├── test/
│   ├── unit/
│   ├── integration/
│   └── mocks/
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   └── user-guide.md
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── vitest.config.ts
├── styles.css
└── CLAUDE.md
```

---

## 13. Development Workflow

### 13.1 Local Development Setup

```bash
# Prerequisites
node --version  # v18.0.0+
npm --version   # v9.0.0+

# Setup
git clone https://github.com/neocode24/obsidian-confluence-sync.git
cd obsidian-confluence-sync
npm install

# Development
npm run dev      # Watch mode
npm run build    # Production build
npm test         # Run tests
```

### 13.2 Development Commands

```bash
npm run dev           # Development build with watch
npm run build         # Production build
npm run type-check    # TypeScript type checking
npm run lint          # ESLint
npm test              # Run tests
npm run test:coverage # Coverage report
```

---

## 14. Deployment Architecture

### 14.1 Deployment Strategy

**Phase 1: Manual Installation (MVP)**
- **Platform:** GitHub Releases
- **Files:** `main.js`, `manifest.json`, `styles.css`
- **User Installation:** Download → Copy to `.obsidian/plugins/confluence-sync/` → Reload

**Phase 2: Obsidian Community Plugins**
- **Platform:** Obsidian Community Plugins repository
- **Approval:** Submit PR to https://github.com/obsidianmd/obsidian-releases
- **User Installation:** Settings → Community Plugins → Browse → Install

### 14.2 CI/CD Pipeline

**Trigger:** Git Tag push (e.g., `v0.1.0`)

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['*']

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: npm run build
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            main.js
            manifest.json
            styles.css
```

### 14.3 Version Management

**Semantic Versioning:** `MAJOR.MINOR.PATCH`

- `0.1.0` → MVP initial release
- `0.2.0` → New feature (PlantUML support)
- `0.2.1` → Bug fix
- `1.0.0` → Community Plugins registration

---

## 15. Security and Performance

### 15.1 Security Requirements

#### Authentication Security

**OAuth 2.0 via MCP:**
- ✅ API Key usage prohibited (company policy)
- ✅ OAuth tokens managed by MCP (plugin does not access tokens)
- ✅ Automatic token refresh

#### Data Storage Security

```typescript
interface PluginSettings {
  tenants: TenantConfig[];  // ✅ URLs only (public info)
  // ❌ NO oauthToken storage!
}
```

#### Content Security

**XSS Prevention:**
```typescript
private sanitizeMarkdown(markdown: string): string {
  return markdown
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '');
}
```

### 15.2 Performance Optimization

**Bundle Size Target:** < 500 KB

**Current Estimate:**
- TypeScript code: ~50 KB
- Turndown: ~30 KB
- MCP SDK: ~100 KB
- **Total:** ~200-300 KB ✅

**Performance Targets:**

| Metric | Target |
|--------|--------|
| Plugin load time | < 500ms |
| Bundle size | < 500 KB |
| Page conversion | < 200ms |
| 100 page sync | < 5 min |
| Memory usage | < 200 MB |

---

## 16. Testing Strategy

### 16.1 Testing Pyramid

```
        E2E (Manual)
       /              \
      /  Integration    \
     /    (MCP Mock)     \
    /                     \
   /    Unit Tests         \
  /   (Pure Logic)          \
 /_________________________\
```

**Test Ratio:**
- Unit Tests: 70%
- Integration Tests: 25%
- E2E Tests: 5% (Manual, Phase 2)

### 16.2 Test Organization

```
test/
├── unit/
│   ├── converters/
│   ├── utils/
│   └── sync/
├── integration/
│   ├── ConfluenceClient.test.ts
│   └── SyncEngine.test.ts
├── fixtures/
└── mocks/
    ├── MCPClientMock.ts
    └── VaultMock.ts
```

### 16.3 Test Coverage Goals

- **Overall:** 80%+
- **Core logic:** 90%+ (converters, sync)
- **UI:** 50%+ (supplemented by manual testing)

---

## 17. Coding Standards

### 17.1 Critical Project-Specific Rules

- **OAuth via MCP Only:** Never use API Key, Personal Access Token. All Confluence API calls through MCP Client only

- **Never Store Tokens:** Never store OAuth tokens, Refresh tokens anywhere in `data.json`, `sync-history.json`, logs. Delegate to MCP

- **Atomic File Writes:** All file writes use temp file then rename pattern (prevent iCloud conflicts, NFR7)

- **Preserve Local Notes:** On re-sync, only update between `<!-- CONFLUENCE CONTENT START/END -->` markers. Never modify local notes area (NFR6)

- **Error Handling:** All async functions require try-catch blocks. Allow partial failures (continue even if some pages fail)

- **Obsidian API Only:** Use Obsidian Vault API for file I/O, not Node.js `fs` module

- **Type Safety:** Explicit types for all function parameters and return values. Prohibit `any` type

- **Logging Sanitization:** Never output tokens, API Keys, passwords to logs. Apply automatic filtering

### 17.2 Naming Conventions

| Element | Rule | Example |
|---------|------|---------|
| Classes | PascalCase | `SyncEngine` |
| Functions | camelCase | `syncAll()` |
| Variables | camelCase | `pageId` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_SETTINGS` |
| Files | PascalCase.ts | `SyncEngine.ts` |

---

## 18. Error Handling Strategy

### 18.1 Error Class Hierarchy

```typescript
export class ConfluenceSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public recoverable: boolean = false
  ) {
    super(message);
  }
}

export class MCPConnectionError extends ConfluenceSyncError { }
export class OAuthError extends ConfluenceSyncError { }
export class PageConversionError extends ConfluenceSyncError { }
export class FileWriteError extends ConfluenceSyncError { }
export class NetworkError extends ConfluenceSyncError { }

export class RateLimitError extends ConfluenceSyncError {
  constructor(
    message: string,
    public retryAfter: number, // seconds
    public remainingRequests: number = 0
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', { retryAfter, remainingRequests }, true);
  }
}
```

### 18.1.1 Rate Limit Handling Strategy

**Confluence API Rate Limits:**
- 1000-5000 requests per hour (tenant tier dependent)
- HTTP 429 response when limit exceeded
- Response headers:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `Retry-After`: Seconds to wait before retry

**Implementation:**

```typescript
class ConfluenceClient {
  private rateLimitRemaining: number = 5000;
  private rateLimitReset: Date | null = null;

  async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    // Pre-check rate limit
    if (this.rateLimitRemaining < 10) {
      const waitTime = this.calculateWaitTime();
      if (waitTime > 0) {
        throw new RateLimitError(
          `Rate limit approaching. ${this.rateLimitRemaining} requests remaining.`,
          waitTime,
          this.rateLimitRemaining
        );
      }
    }

    try {
      const response = await this.mcpClient.request<T>(endpoint, options);
      this.updateRateLimitInfo(response.headers);
      return response.data;
    } catch (error) {
      if (error.statusCode === 429) {
        const retryAfter = parseInt(error.headers['retry-after']) || 60;
        this.rateLimitRemaining = 0;
        throw new RateLimitError(
          'Confluence API rate limit exceeded',
          retryAfter,
          0
        );
      }
      throw error;
    }
  }

  private updateRateLimitInfo(headers: Record<string, string>) {
    if (headers['x-ratelimit-remaining']) {
      this.rateLimitRemaining = parseInt(headers['x-ratelimit-remaining']);
    }
    if (headers['x-ratelimit-reset']) {
      this.rateLimitReset = new Date(parseInt(headers['x-ratelimit-reset']) * 1000);
    }
  }

  private calculateWaitTime(): number {
    if (!this.rateLimitReset) return 0;
    const now = new Date();
    return Math.max(0, (this.rateLimitReset.getTime() - now.getTime()) / 1000);
  }
}
```

**Exponential Backoff Retry:**

```typescript
class SyncEngine {
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (error instanceof RateLimitError && error.recoverable) {
          const backoffTime = Math.min(
            error.retryAfter * 1000,
            Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          );

          console.warn(
            `Rate limit hit. Retrying after ${backoffTime / 1000}s (attempt ${attempt + 1}/${maxRetries})`
          );

          await this.sleep(backoffTime);
          continue;
        }

        // Non-recoverable error, throw immediately
        throw error;
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**User Notification:**

```typescript
private handleRateLimitError(error: RateLimitError) {
  const minutes = Math.ceil(error.retryAfter / 60);

  new Notice(
    `⏱️ Confluence API 요청 한도 도달\n\n` +
    `${minutes}분 후 다시 시도하거나, 동기화를 일시 중지하세요.\n\n` +
    `남은 요청 수: ${error.remainingRequests}`,
    0 // Don't auto-dismiss
  );
}
```

### 18.2 User-Friendly Messages

```typescript
private getUserMessage(error: Error): string {
  if (error instanceof MCPConnectionError) {
    return '❌ MCP Server connection failed\n\nCheck if MCP Server is running.';
  }

  if (error instanceof OAuthError) {
    return '❌ Confluence authentication failed\n\nRetry connection in Settings.';
  }

  // ... other error types
}
```

### 18.3 Graceful Degradation

```typescript
// Allow partial failures
const results = await Promise.allSettled(
  pages.map(page => this.syncPage(page))
);

// Continue even if some fail
for (const result of results) {
  if (result.status === 'fulfilled') {
    successCount++;
  } else {
    failureCount++;
    errors.push(result.reason.message);
  }
}
```

---

## Checklist Results Report

### Executive Summary

**Overall Architecture Readiness:** ⭐⭐⭐⭐½ **High (90%)**

**Project Type:** Client-Side Plugin (Frontend-Only)

**Critical Strengths:**
1. ✅ 보안 정책 완벽 준수 (OAuth via MCP, API Key 금지)
2. ✅ NFR 요구사항 명시적 기술 솔루션 제시
3. ✅ 원자적 파일 쓰기 패턴으로 iCloud 충돌 방지
4. ✅ 콘텐츠 영역 분리로 로컬 노트 보존
5. ✅ 명확한 컴포넌트 책임 분리 및 인터페이스 정의

**Critical Risks:**
1. 🔴 **MCP 데스크톱 제한**: Mobile OAuth 불가 → 데스크톱에서만 동기화 가능
2. 🟡 **JSON 파일 확장성**: 1만 페이지 이상 시 성능 저하 가능성
3. 🟡 **Rate Limit 리스크**: 대량 첨부파일 다운로드 시 Confluence API Rate Limit 초과 가능

### Must-Fix Before Development

**Status:** ✅ All items completed (2025-11-22)

1. ✅ **LinkTransformer 컴포넌트 명세 추가** (Section 6.7)
   - 완전한 인터페이스 정의 및 구현 코드 예제 추가
   - Confluence 링크 파싱 정규식 패턴 제공
   - Page ID → 파일명 매핑 로직 구현

2. ✅ **Rate Limit 처리 전략 추가** (Section 18.1.1)
   - `RateLimitError` 에러 클래스 추가 (retryAfter, remainingRequests 포함)
   - Exponential Backoff 재시도 로직 구현
   - `X-RateLimit-Remaining` 헤더 모니터링 로직
   - 사용자 친화적 알림 메시지

3. ✅ **스키마 마이그레이션 전략 추가** (Section 9.1.1)
   - SyncHistoryV1 → V2 마이그레이션 체인 구현
   - 자동 마이그레이션 로직 (플러그인 로드 시)
   - 테스트 코드 예제 제공
   - Backward Compatibility 보장

### Development Readiness

**✅ READY FOR IMPLEMENTATION**

아키텍처는 개발 착수에 충분히 성숙했습니다. Must-Fix 항목은 1-2일 내 보완 가능하며, Story 1.1 (Project Initialization)은 즉시 시작 가능합니다.

**Validation Date:** 2025-11-22
**Validator:** Winston (Architect)
**Full Report:** See detailed checklist results in project documentation

---

**Generated with [Claude Code](https://claude.com/claude-code)**
