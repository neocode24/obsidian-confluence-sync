import { TenantConfig, OAuthConfig } from '../api/ConfluenceClient';
import { SyncFilters } from './filters';

export interface PluginSettings {
	tenants: TenantConfig[];
	syncPath: string;
	attachmentsPath: string;
	showNotifications: boolean;
	forceFullSync: boolean;
	oauthConfig?: OAuthConfig;
	filters?: SyncFilters;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	tenants: [],
	syncPath: 'confluence/',
	attachmentsPath: 'attachments/',
	showNotifications: true,
	forceFullSync: false,
	oauthConfig: {
		// For development: Set your OAuth app credentials here
		// clientId: 'your-client-id',
		// clientSecret: 'your-client-secret',
		clientId: '',
		clientSecret: '',
		redirectUri: 'http://localhost:8080/callback',
		scope: 'read:confluence-content.all write:confluence-content read:confluence-space.summary offline_access'
	},
	filters: {
		enabled: false,
		spaceKeys: [],
		labels: [],
		rootPageIds: []
	}
};
