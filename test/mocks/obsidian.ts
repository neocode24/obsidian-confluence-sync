/**
 * Mock implementation of Obsidian API for testing
 */

export class Notice {
	constructor(public message: string, public timeout?: number) {}
}

export const requestUrl = async (options: any): Promise<any> => {
	throw new Error('requestUrl must be mocked in tests');
};
