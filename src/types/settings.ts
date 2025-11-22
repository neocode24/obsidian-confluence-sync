import { TenantConfig } from '../api/ConfluenceClient';

export interface PluginSettings {
	tenants: TenantConfig[];
	syncPath: string;
	attachmentsPath: string;
	showNotifications: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	tenants: [],
	syncPath: 'confluence/',
	attachmentsPath: 'attachments/',
	showNotifications: true
};
