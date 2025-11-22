import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfluenceClient, TenantConfig } from '../../../src/api/ConfluenceClient';
import {
	OAuthError,
	NetworkError,
	ConfluenceAPIError,
	PermissionError,
	MCPConnectionError
} from '../../../src/types/errors';
import searchResponse from '../../fixtures/confluence-search-response.json';

// Mock Obsidian requestUrl
vi.mock('obsidian', () => ({
	Notice: vi.fn(),
	requestUrl: vi.fn()
}));

describe('ConfluenceClient - searchPages', () => {
	let client: ConfluenceClient;
	let mockTenant: TenantConfig;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Create client with mock OAuth config
		client = new ConfluenceClient({
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			redirectUri: 'http://localhost:8080/callback',
			scope: 'read:confluence-content.all'
		});

		// Setup authenticated tenant
		mockTenant = {
			id: 'tenant-1',
			name: 'Test Tenant',
			url: 'https://test.atlassian.net',
			enabled: true,
			cloudId: 'test-cloud-id-123',
			oauthToken: {
				accessToken: 'mock-access-token',
				refreshToken: 'mock-refresh-token',
				expiresAt: Date.now() + 3600000 // 1 hour from now
			}
		};

		client.restoreTenant(mockTenant);
	});

	describe('Success cases', () => {
		it('should successfully search pages with default CQL query', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				json: searchResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0),
				text: ''
			} as any);

			const pages = await client.searchPages();

			expect(pages).toHaveLength(2);
			expect(pages[0]).toMatchObject({
				id: '123456789',
				title: 'API Design Guide',
				spaceKey: 'TEAM',
				version: 5,
				labels: ['api', 'design'],
				parentId: '987654321'
			});
			expect(pages[1]).toMatchObject({
				id: '987654321',
				title: 'Architecture Overview',
				spaceKey: 'DOCS',
				version: 12,
				labels: ['architecture']
			});

			// Verify API call
			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'Authorization': 'Bearer mock-access-token',
						'Accept': 'application/json'
					})
				})
			);
		});

		it('should use custom CQL query', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				json: { results: [] },
				headers: {},
				arrayBuffer: new ArrayBuffer(0),
				text: ''
			} as any);

			const customCql = 'creator = currentUser() AND space = TEAM';
			await client.searchPages(customCql);

			const callArgs = vi.mocked(requestUrl).mock.calls[0][0];
			// URLSearchParams uses + for spaces instead of %20
			const url = typeof callArgs === 'string' ? callArgs : callArgs.url;
			expect(url).toContain('cql=creator');
			expect(url).toContain('space');
			expect(url).toContain('TEAM');
		});

		it('should respect limit parameter', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				json: { results: [] },
				headers: {},
				arrayBuffer: new ArrayBuffer(0),
				text: ''
			} as any);

			await client.searchPages(undefined, 25);

			const callArgs = vi.mocked(requestUrl).mock.calls[0][0];
			const url = typeof callArgs === 'string' ? callArgs : callArgs.url;
			expect(url).toContain('limit=25');
		});

		it('should handle empty results', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				json: { results: [] },
				headers: {},
				arrayBuffer: new ArrayBuffer(0),
				text: ''
			} as any);

			const pages = await client.searchPages();
			expect(pages).toEqual([]);
		});
	});

	describe('Error handling', () => {
		it('should throw OAuthError on 401 Unauthorized', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockRejectedValue({
				status: 401,
				message: 'Unauthorized'
			});

			await expect(client.searchPages()).rejects.toThrow(OAuthError);
			await expect(client.searchPages()).rejects.toThrow('Authentication failed');
		});

		it('should throw PermissionError on 403 Forbidden', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockRejectedValue({
				status: 403,
				message: 'Forbidden'
			});

			await expect(client.searchPages()).rejects.toThrow(PermissionError);
			await expect(client.searchPages()).rejects.toThrow('Permission denied');
		});

		it('should throw ConfluenceAPIError on 400 Bad Request', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockRejectedValue({
				status: 400,
				message: 'Bad Request'
			});

			const badCql = 'invalid cql query';
			await expect(client.searchPages(badCql)).rejects.toThrow(ConfluenceAPIError);
			await expect(client.searchPages(badCql)).rejects.toThrow('Invalid CQL query');
		});

		it('should throw ConfluenceAPIError on 429 Rate Limit', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockRejectedValue({
				status: 429,
				message: 'Too Many Requests'
			});

			await expect(client.searchPages()).rejects.toThrow(ConfluenceAPIError);
			await expect(client.searchPages()).rejects.toThrow('Rate limit exceeded');
		});

		it('should throw NetworkError on network failure', async () => {
			const { requestUrl } = await import('obsidian');
			vi.mocked(requestUrl).mockRejectedValue(new Error('network timeout'));

			await expect(client.searchPages()).rejects.toThrow(NetworkError);
		});

		it('should throw MCPConnectionError when tenant not initialized', async () => {
			const newClient = new ConfluenceClient({
				clientId: 'test',
				clientSecret: 'test',
				redirectUri: 'http://localhost:8080/callback',
				scope: 'read:confluence-content.all'
			});

			await expect(newClient.searchPages()).rejects.toThrow(MCPConnectionError);
			await expect(newClient.searchPages()).rejects.toThrow('Tenant not initialized');
		});

		it('should throw OAuthError when not authenticated', async () => {
			// Create tenant without OAuth token
			const unauthTenant: TenantConfig = {
				id: 'tenant-2',
				name: 'Unauth Tenant',
				url: 'https://test.atlassian.net',
				enabled: true,
				cloudId: 'test-cloud-id'
				// No oauthToken
			};

			client.restoreTenant(unauthTenant);

			await expect(client.searchPages()).rejects.toThrow(OAuthError);
			await expect(client.searchPages()).rejects.toThrow('Not authenticated');
		});
	});

	describe('Response parsing', () => {
		it('should filter out non-page content types', async () => {
			const { requestUrl } = await import('obsidian');
			const mixedResponse = {
				results: [
					{
						content: {
							id: '111',
							type: 'page',
							title: 'Valid Page',
							space: { key: 'TEST' },
							body: { storage: { value: '<p>Content</p>' } },
							version: { number: 1, createdAt: '2024-01-01T00:00:00Z' },
							authorId: 'user1',
							_links: { webui: '/wiki/spaces/TEST/pages/111' },
							metadata: { labels: { results: [] } }
						}
					},
					{
						content: {
							id: '222',
							type: 'blogpost',
							title: 'Invalid Blogpost'
						}
					}
				]
			};

			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				json: mixedResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0),
				text: ''
			} as any);

			const pages = await client.searchPages();
			expect(pages).toHaveLength(1);
			expect(pages[0].id).toBe('111');
		});

		it('should handle missing optional fields gracefully', async () => {
			const { requestUrl } = await import('obsidian');
			const minimalResponse = {
				results: [
					{
						content: {
							id: '333',
							type: 'page',
							title: 'Minimal Page',
							body: {},
							version: {},
							_links: {}
						}
					}
				]
			};

			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				json: minimalResponse,
				headers: {},
				arrayBuffer: new ArrayBuffer(0),
				text: ''
			} as any);

			const pages = await client.searchPages();
			expect(pages).toHaveLength(1);
			expect(pages[0]).toMatchObject({
				id: '333',
				title: 'Minimal Page',
				spaceKey: 'UNKNOWN',
				content: '',
				version: 1,
				labels: [],
				attachments: []
			});
		});
	});
});
