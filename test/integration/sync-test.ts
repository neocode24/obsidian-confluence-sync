/**
 * Integration test for real Confluence sync
 *
 * This test connects to a real Confluence instance and syncs a page.
 * Run manually with: npm run test:integration
 */

import { ConfluenceClient } from '../../src/api/ConfluenceClient';
import { SyncEngine } from '../../src/sync/SyncEngine';
import { FileManager } from '../../src/utils/FileManager';

// Mock Vault for testing
class MockVault {
  private files = new Map<string, string>();
  private folders = new Set<string>();

  async create(path: string, data: string): Promise<any> {
    console.log(`[MockVault] Creating file: ${path}`);
    this.files.set(path, data);
    return { path };
  }

  async modify(file: any, data: string): Promise<void> {
    console.log(`[MockVault] Modifying file: ${file.path}`);
    this.files.set(file.path, data);
  }

  async read(file: any): Promise<string> {
    return this.files.get(file.path) || '';
  }

  getAbstractFileByPath(path: string): any {
    if (this.files.has(path)) {
      return { path };
    }
    if (this.folders.has(path)) {
      return { path };
    }
    return null;
  }

  async createFolder(path: string): Promise<void> {
    console.log(`[MockVault] Creating folder: ${path}`);
    this.folders.add(path);
  }

  getCreatedFiles(): Map<string, string> {
    return this.files;
  }
}

async function testSync() {
  console.log('=== Confluence Sync Integration Test ===\n');

  // Check environment variables
  const clientId = process.env.CONFLUENCE_CLIENT_ID;
  const clientSecret = process.env.CONFLUENCE_CLIENT_SECRET;
  const tenantUrl = process.env.CONFLUENCE_TENANT_URL || 'https://ktspace.atlassian.net';

  if (!clientId || !clientSecret) {
    console.error('❌ Error: CONFLUENCE_CLIENT_ID and CONFLUENCE_CLIENT_SECRET environment variables required');
    console.log('\nUsage:');
    console.log('  export CONFLUENCE_CLIENT_ID="your-client-id"');
    console.log('  export CONFLUENCE_CLIENT_SECRET="your-client-secret"');
    console.log('  npm run test:integration');
    process.exit(1);
  }

  try {
    // 1. Initialize Confluence Client
    console.log('1. Initializing Confluence Client...');
    const confluenceClient = new ConfluenceClient({
      clientId,
      clientSecret,
      redirectUri: 'http://localhost:8080/callback',
      scope: 'read:confluence-content.all write:confluence-content read:confluence-space.summary offline_access'
    });

    await confluenceClient.initialize({
      id: 'test-tenant',
      name: 'Test Tenant',
      url: tenantUrl,
      enabled: true
    });

    console.log('✓ Client initialized\n');

    // 2. Search for child pages of the specific page
    console.log('2. Searching for child pages of page 329651191 (Jay)...');
    const cql = 'parent = 329651191';
    const pages = await confluenceClient.searchPages(cql, 1); // Get only 1 page for test

    if (pages.length === 0) {
      console.log('⚠️  No child pages found. Searching for the parent page itself...');
      const parentPages = await confluenceClient.searchPages('id = 329651191', 1);

      if (parentPages.length === 0) {
        console.error('❌ Parent page not found. Please check page ID and permissions.');
        process.exit(1);
      }

      console.log(`✓ Found parent page: ${parentPages[0].title}`);
      console.log(`  ID: ${parentPages[0].id}`);
      console.log(`  Space: ${parentPages[0].spaceKey}`);
      console.log(`  URL: ${parentPages[0].url}\n`);

      console.log('Using parent page for sync test...\n');
      pages.push(...parentPages);
    } else {
      console.log(`✓ Found ${pages.length} child page(s)\n`);
      pages.forEach((page, i) => {
        console.log(`  [${i + 1}] ${page.title}`);
        console.log(`      ID: ${page.id}`);
        console.log(`      Space: ${page.spaceKey}`);
        console.log(`      URL: ${page.url}\n`);
      });
    }

    // 3. Create mock vault and file manager
    console.log('3. Initializing FileManager...');
    const mockVault = new MockVault();
    const fileManager = new FileManager(mockVault as any);
    console.log('✓ FileManager initialized\n');

    // 4. Create SyncEngine
    console.log('4. Initializing SyncEngine...');
    const syncEngine = new SyncEngine(
      confluenceClient,
      fileManager,
      'confluence/'
    );
    console.log('✓ SyncEngine initialized\n');

    // 5. Sync the first page
    console.log('5. Syncing page...');
    const testPage = pages[0];
    console.log(`   Title: ${testPage.title}`);
    console.log(`   Converting to Markdown...\n`);

    // Manually sync one page for detailed output
    const { MarkdownConverter } = await import('../../src/converters/MarkdownConverter');
    const { MetadataBuilder } = await import('../../src/converters/MetadataBuilder');
    const { generateSlug } = await import('../../src/utils/slug');

    const converter = new MarkdownConverter();
    const metadataBuilder = new MetadataBuilder();

    const markdown = await converter.convertPage(testPage);
    const frontmatter = metadataBuilder.buildFrontmatter(testPage);
    const content = metadataBuilder.combineContent(frontmatter, markdown);
    const slug = generateSlug(testPage.title);
    const fileName = await fileManager.ensureUniqueFileName(slug, 'confluence/');

    console.log('✓ Conversion complete:');
    console.log(`   Slug: ${slug}`);
    console.log(`   Filename: ${fileName}`);
    console.log(`   Content length: ${content.length} characters`);
    console.log(`   Markdown length: ${markdown.length} characters\n`);

    // 6. Save file
    console.log('6. Saving file...');
    const filePath = `confluence/${fileName}`;
    await fileManager.writeFile(filePath, content);
    console.log(`✓ File saved: ${filePath}\n`);

    // 7. Display result
    console.log('=== Sync Result ===\n');
    const savedFiles = mockVault.getCreatedFiles();
    console.log(`Total files created: ${savedFiles.size}\n`);

    for (const [path, fileContent] of savedFiles.entries()) {
      console.log(`File: ${path}`);
      console.log(`Size: ${fileContent.length} bytes`);
      console.log('\nFrontmatter:');
      const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        console.log(frontmatterMatch[1]);
      }
      console.log('\nFirst 500 characters of markdown:');
      const markdownStart = fileContent.indexOf('---\n\n') + 5;
      console.log(fileContent.substring(markdownStart, markdownStart + 500));
      console.log('\n...\n');
    }

    console.log('✅ Integration test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
testSync();
