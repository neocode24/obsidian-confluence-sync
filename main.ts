import { App, Plugin, PluginManifest, Notice } from 'obsidian';
import { ConfluenceSettingsTab } from './src/ui/settings/SettingsTab';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { ConfluenceClient } from './src/api/ConfluenceClient';
import { SyncEngine } from './src/sync/SyncEngine';
import { FileManager } from './src/utils/FileManager';
import { CQLBuilder } from './src/utils/CQLBuilder';
import { BackgroundChangeDetector } from './src/sync/BackgroundChangeDetector';
import { SyncHistory } from './src/sync/SyncHistory';
import { Logger } from './src/utils/Logger';

export default class ConfluenceSyncPlugin extends Plugin {
	settings: PluginSettings;
	confluenceClient: ConfluenceClient | null = null;
	private logger: Logger;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.logger = new Logger('ConfluenceSyncPlugin', 'INFO');
	}

	async onload() {
		this.logger.info('Loading Confluence Sync plugin');

		// Set vault for file logging
		Logger.setVault(this.app.vault);

		// Load settings
		await this.loadSettings();

		// Set logger level from settings
		this.logger.setLogLevel(this.settings.logLevel);
		this.logger.debug('Settings loaded', { logLevel: this.settings.logLevel });

		// Add settings tab
		this.addSettingTab(new ConfluenceSettingsTab(this.app, this));

		// Initialize Confluence Client if OAuth is configured
		if (this.settings.oauthConfig?.clientId && this.settings.oauthConfig?.clientSecret) {
			this.confluenceClient = new ConfluenceClient(this.settings.oauthConfig, this.settings.logLevel);
			this.logger.info('Confluence client initialized');

			// Set token refresh callback to save updated tokens
			this.confluenceClient.setTokenRefreshCallback(async (updatedTenant) => {
				this.settings.tenants[0] = updatedTenant;
				await this.saveSettings();
				this.logger.debug('OAuth token refreshed and saved');
			});

			// Restore tenant state if saved
			if (this.settings.tenants.length > 0 && this.settings.tenants[0].oauthToken) {
				this.confluenceClient.restoreTenant(this.settings.tenants[0]);
				this.logger.info('Tenant state restored', { url: this.settings.tenants[0].url });
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
			this.logger.info('Starting background change detection on startup');
			this.runBackgroundCheck();
		}

		this.logger.info('Confluence Sync plugin loaded successfully');
		new Notice('Confluence Sync plugin loaded successfully!');
	}

	onunload() {
		this.logger.info('Unloading Confluence Sync plugin');
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
			this.logger.debug('Background check skipped - not connected');
			return;
		}

		// Check if notifications are enabled
		if (!this.settings.showNotifications) {
			this.logger.debug('Background check skipped - notifications disabled');
			return;
		}

		try {
			const syncHistory = new SyncHistory(this.app);
			const backgroundDetector = new BackgroundChangeDetector(
				this.confluenceClient,
				syncHistory,
				this.settings.filters,
				this.settings.logLevel
			);

			const changedCount = await backgroundDetector.checkForChanges();

			// Show notification with action buttons if changes detected
			if (changedCount > 0) {
				this.logger.info('Background check found changes', { changedCount });
				this.showChangeNotification(changedCount);
			} else {
				this.logger.debug('Background check completed - no changes');
			}
		} catch (error) {
			// Silent failure - don't bother user
			this.logger.warn('Background check failed', error);
		}
	}

	/**
	 * 변경사항 알림 표시 (액션 버튼 포함)
	 */
	private showChangeNotification(count: number): void {
		const notice = new Notice('', 15000); // 15초 동안 표시

		// 알림 메시지
		const messageEl = notice.noticeEl.createDiv();
		messageEl.setText(`🔔 Confluence에 ${count}개 페이지 업데이트됨`);
		messageEl.style.marginBottom = '8px';

		// 버튼 컨테이너
		const buttonContainer = notice.noticeEl.createDiv();
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '8px';

		// "지금 동기화" 버튼
		const syncButton = buttonContainer.createEl('button', {
			text: '지금 동기화',
			cls: 'mod-cta'
		});
		syncButton.addEventListener('click', async () => {
			notice.hide();
			await this.syncConfluencePages();
		});

		// "나중에" 버튼
		const laterButton = buttonContainer.createEl('button', {
			text: '나중에'
		});
		laterButton.addEventListener('click', () => {
			notice.hide();
		});
	}

	/**
	 * Confluence 페이지 동기화 실행
	 */
	private async syncConfluencePages(): Promise<void> {
		// Check if Confluence client is initialized
		if (!this.confluenceClient) {
			this.logger.warn('Sync attempted without Confluence client');
			new Notice('⚠️ Confluence OAuth 설정이 필요합니다. 설정 탭에서 먼저 연결하세요.');
			return;
		}

		// Check if connected
		if (!this.confluenceClient.isConnected()) {
			this.logger.warn('Sync attempted without connection');
			new Notice('⚠️ Confluence에 연결되지 않았습니다. 설정 탭에서 먼저 연결하세요.');
			return;
		}

		// Show sync start notification
		if (this.settings.showNotifications) {
			new Notice('🔄 Confluence 동기화를 시작합니다...');
		}

		this.logger.info('Starting Confluence sync');

		try {
			// Build CQL query from filters
			const cqlBuilder = new CQLBuilder();

			// Validate filters if enabled
			if (this.settings.filters?.enabled) {
				const isValid = cqlBuilder.validateFilters(this.settings.filters);
				if (!isValid) {
					this.logger.warn('Invalid filter settings');
					new Notice('⚠️ 필터 설정이 유효하지 않습니다. 설정을 확인해주세요.');
					return;
				}
			}

			const cqlQuery = cqlBuilder.buildSearchQuery(this.settings.filters);
			this.logger.debug('CQL Query built', { cqlQuery });

			// Create FileManager and SyncEngine
			const fileManager = new FileManager(this.app.vault);
			const syncEngine = new SyncEngine(
				this.app,
				this.confluenceClient,
				fileManager,
				this.settings.syncPath,
				this.settings.forceFullSync,
				cqlQuery,
				this.settings.logLevel
			);

			// Execute sync
			const result = await syncEngine.syncAll();

			// Log results
			this.logger.info('Sync completed', {
				success: result.success,
				totalPages: result.totalPages,
				updatedPages: result.updatedPages,
				skippedPages: result.skippedPages,
				successCount: result.successCount,
				failureCount: result.failureCount
			});

			// Show completion notification
			if (this.settings.showNotifications) {
				if (result.success) {
					new Notice(`✅ 동기화 완료: ${result.updatedPages}개 페이지 업데이트, ${result.skippedPages}개 스킵`);
				} else {
					new Notice(`⚠️ 동기화 완료 (일부 오류): ${result.successCount}개 성공, ${result.failureCount}개 실패`);
				}
			}
		} catch (error) {
			this.logger.error('Sync failed', error);
			new Notice(`❌ 동기화 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
