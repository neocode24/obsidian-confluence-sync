/**
 * Confluence Sync 에러 클래스 계층
 */

/**
 * 기본 Confluence Sync 에러
 */
export class ConfluenceSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'ConfluenceSyncError';
  }
}

/**
 * MCP 서버 연결 에러
 */
export class MCPConnectionError extends ConfluenceSyncError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_CONNECTION_ERROR', details, false);
    this.name = 'MCPConnectionError';
  }
}

/**
 * OAuth 인증 에러
 */
export class OAuthError extends ConfluenceSyncError {
  constructor(message: string, details?: any) {
    super(message, 'OAUTH_ERROR', details, false);
    this.name = 'OAuthError';
  }
}

/**
 * 네트워크 에러
 */
export class NetworkError extends ConfluenceSyncError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details, true);
    this.name = 'NetworkError';
  }
}

/**
 * Confluence API 에러
 */
export class ConfluenceAPIError extends ConfluenceSyncError {
  constructor(
    message: string,
    public statusCode: number,
    details?: any
  ) {
    super(message, 'CONFLUENCE_API_ERROR', { statusCode, ...details }, false);
    this.name = 'ConfluenceAPIError';
  }
}

/**
 * 권한 에러
 */
export class PermissionError extends ConfluenceSyncError {
  constructor(message: string, details?: any) {
    super(message, 'PERMISSION_ERROR', details, false);
    this.name = 'PermissionError';
  }
}

/**
 * Rate Limit 에러
 */
export class RateLimitError extends ConfluenceSyncError {
  constructor(
    message: string,
    public retryAfter: number, // seconds
    public remainingRequests: number = 0
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', { retryAfter, remainingRequests }, true);
    this.name = 'RateLimitError';
  }
}

/**
 * 페이지 변환 에러
 */
export class PageConversionError extends ConfluenceSyncError {
  constructor(message: string, details?: any) {
    super(message, 'PAGE_CONVERSION_ERROR', details, false);
    this.name = 'PageConversionError';
  }
}

/**
 * 파일 쓰기 에러
 */
export class FileWriteError extends ConfluenceSyncError {
  constructor(message: string, details?: any) {
    super(message, 'FILE_WRITE_ERROR', details, false);
    this.name = 'FileWriteError';
  }
}
