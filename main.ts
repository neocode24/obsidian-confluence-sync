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

		// Check if notifications are enabled
		if (!this.settings.showNotifications) {
			console.log('[ConfluenceSyncPlugin] Background check skipped - notifications disabled');
			return;
		}

		try {
			const syncHistory = new SyncHistory(this.app);
			const backgroundDetector = new BackgroundChangeDetector(
				this.confluenceClient,
				syncHistory,
				this.settings.filters
			);

			const changedCount = await backgroundDetector.checkForChanges();

			// Show notification with action buttons if changes detected
			if (changedCount > 0) {
				this.showChangeNotification(changedCount);
			}
		} catch (error) {
			// Silent failure - don't bother user
			console.log('[ConfluenceSyncPlugin] Background check failed:', error);
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
			new Notice('⚠️ Confluence OAuth 설정이 필요합니다. 설정 탭에서 먼저 연결하세요.');
			return;
		}

		// Check if connected
		if (!this.confluenceClient.isConnected()) {
			new Notice('⚠️ Confluence에 연결되지 않았습니다. 설정 탭에서 먼저 연결하세요.');
			return;
		}

		// Show sync start notification
		if (this.settings.showNotifications) {
			new Notice('🔄 Confluence 동기화를 시작합니다...');
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
			const result = await syncEngine.syncAll();

			// Show completion notification
			if (this.settings.showNotifications) {
				if (result.success) {
					new Notice(`✅ 동기화 완료: ${result.updatedPages}개 페이지 업데이트, ${result.skippedPages}개 스킵`);
				} else {
					new Notice(`⚠️ 동기화 완료 (일부 오류): ${result.successCount}개 성공, ${result.failureCount}개 실패`);
				}
			}
		} catch (error) {
			console.error('[ConfluenceSyncPlugin] Sync error:', error);
			new Notice(`❌ 동기화 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}
