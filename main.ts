import { App, Plugin, PluginManifest, Notice } from 'obsidian';
import { ConfluenceSettingsTab } from './src/ui/settings/SettingsTab';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { ConfluenceClient } from './src/api/ConfluenceClient';
import { SyncEngine } from './src/sync/SyncEngine';
import { FileManager } from './src/utils/FileManager';
import { CQLBuilder } from './src/utils/CQLBuilder';
import { BackgroundChangeDetector } from './src/sync/BackgroundChangeDetector';
import { SyncHistory } from './src/sync/SyncHistory';

export default class ConfluenceSyncPlugin extends Plugin {
	settings: PluginSettings;
	confluenceClient: ConfluenceClient | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}

	async onload() {
		console.log('Loading Confluence Sync plugin');

		// Load settings
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new ConfluenceSettingsTab(this.app, this));

		// Initialize Confluence Client if OAuth is configured
		if (this.settings.oauthConfig?.clientId && this.settings.oauthConfig?.clientSecret) {
			this.confluenceClient = new ConfluenceClient(this.settings.oauthConfig);

			// Set token refresh callback to save updated tokens
			this.confluenceClient.setTokenRefreshCallback(async (updatedTenant) => {
				this.settings.tenants[0] = updatedTenant;
				await this.saveSettings();
				console.log('[Plugin] Token refreshed and saved to settings');
			});

			// Restore tenant state if saved
			if (this.settings.tenants.length > 0 && this.settings.tenants[0].oauthToken) {
				this.confluenceClient.restoreTenant(this.settings.tenants[0]);
			}
		}

		// Add sync command
		this.addCommand({
			id: 'sync-confluence-pages',
			name: 'Sync Confluence Pages',
			callback: async () => {
				await this.syncConfluencePages();
			}
		});

		// Add test command
		this.addCommand({
			id: 'test-confluence-sync',
			name: 'Test Confluence Sync',
			callback: () => {
				new Notice('Confluence Sync plugin is working! 🎉');
			}
		});

		// Background change detection on startup
		if (this.settings.backgroundCheck && this.settings.backgroundCheckOnStartup) {
			this.runBackgroundCheck();
		}

		new Notice('Confluence Sync plugin loaded successfully!');
	}

	onunload() {
		console.log('Unloading Confluence Sync plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 백그라운드 변경 감지 실행
	 */
	private async runBackgroundCheck(): Promise<void> {
		// Check if Confluence client is initialized and connected
		if (!this.confluenceClient || !this.confluenceClient.isConnected()) {
			console.log('[ConfluenceSyncPlugin] Background check skipped - not connected');
			return;
		}

		try {
			const syncHistory = new SyncHistory(this.app);
			const backgroundDetector = new BackgroundChangeDetector(
				this.confluenceClient,
				syncHistory,
				this.settings.filters
			);

			await backgroundDetector.checkForChanges();
		} catch (error) {
			// Silent failure - don't bother user
			console.log('[ConfluenceSyncPlugin] Background check failed:', error);
		}
	}

	/**
	 * Confluence 페이지 동기화 실행
	 */
	private async syncConfluencePages(): Promise<void> {
		// Check if Confluence client is initialized
		if (!this.confluenceClient) {
			new Notice('⚠️ Confluence OAuth 설정이 필요합니다. 설정 탭에서 먼저 연결하세요.');
			return;
		}

		// Check if connected
		if (!this.confluenceClient.isConnected()) {
			new Notice('⚠️ Confluence에 연결되지 않았습니다. 설정 탭에서 먼저 연결하세요.');
			return;
		}

		try {
			// Build CQL query from filters
			const cqlBuilder = new CQLBuilder();

			// Validate filters if enabled
			if (this.settings.filters?.enabled) {
				const isValid = cqlBuilder.validateFilters(this.settings.filters);
				if (!isValid) {
					new Notice('⚠️ 필터 설정이 유효하지 않습니다. 설정을 확인해주세요.');
					return;
				}
			}

			const cqlQuery = cqlBuilder.buildSearchQuery(this.settings.filters);
			console.log('[ConfluenceSyncPlugin] CQL Query:', cqlQuery);

			// Create FileManager and SyncEngine
			const fileManager = new FileManager(this.app.vault);
			const syncEngine = new SyncEngine(
				this.app,
				this.confluenceClient,
				fileManager,
				this.settings.syncPath,
				this.settings.forceFullSync,
				cqlQuery
			);

			// Execute sync
			await syncEngine.syncAll();
		} catch (error) {
			console.error('[ConfluenceSyncPlugin] Sync error:', error);
			new Notice(`❌ 동기화 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
