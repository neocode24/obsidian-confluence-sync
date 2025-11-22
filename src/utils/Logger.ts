/**
 * 로그 레벨
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * 로그 레벨 우선순위
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * 중앙 로깅 시스템
 */
export class Logger {
  constructor(
    private componentName: string,
    private logLevel: LogLevel = 'INFO'
  ) {}

  /**
   * 로그 레벨 설정
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * DEBUG 로그
   */
  debug(message: string, data?: any): void {
    this.log('DEBUG', message, data);
  }

  /**
   * INFO 로그
   */
  info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  /**
   * WARN 로그
   */
  warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  /**
   * ERROR 로그
   */
  error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      this.log('ERROR', message, { error: error.message, stack: error.stack });
    } else {
      this.log('ERROR', message, error);
    }
  }

  /**
   * 로그 출력 (내부 메서드)
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 로그 레벨 필터링
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.logLevel]) {
      return;
    }

    // 타임스탬프 생성 (로컬 시간대)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // 로그 메시지 구성
    const logMessage = `[${timestamp}] [${level}] [${this.componentName}] ${message}`;

    // 콘솔에 출력
    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}
