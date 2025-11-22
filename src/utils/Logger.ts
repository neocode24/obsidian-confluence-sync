import { Vault } from 'obsidian';

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
 * 로그 파일 경로
 */
const LOG_FILE_PATH = '.obsidian/plugins/confluence-sync/confluence-sync.log';
const MAX_LOG_LINES = 1000; // 최대 로그 라인 수

/**
 * 중앙 로깅 시스템
 */
export class Logger {
  private static vault: Vault | null = null;
  private static logBuffer: string[] = [];
  private static isWriting = false;

  /**
   * Vault 설정 (플러그인 초기화 시 한 번만 호출)
   */
  static setVault(vault: Vault): void {
    Logger.vault = vault;
  }

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

    // 파일에 기록 (데이터는 JSON으로 변환)
    let fileLogMessage = logMessage;
    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
        fileLogMessage += ' ' + dataStr;
      } catch (e) {
        fileLogMessage += ' [Unable to stringify data]';
      }
    }

    Logger.writeToFile(fileLogMessage);
  }

  /**
   * 로그를 파일에 비동기로 기록
   */
  private static async writeToFile(logLine: string): Promise<void> {
    if (!Logger.vault) {
      return; // Vault가 설정되지 않으면 파일 저장 생략
    }

    // 버퍼에 추가
    Logger.logBuffer.push(logLine);

    // 이미 쓰기 작업 중이면 대기
    if (Logger.isWriting) {
      return;
    }

    Logger.isWriting = true;

    try {
      // 기존 로그 파일 읽기
      let existingLogs: string[] = [];
      try {
        const content = await Logger.vault.adapter.read(LOG_FILE_PATH);
        existingLogs = content.split('\n').filter(line => line.trim().length > 0);
      } catch (error) {
        // 파일이 없으면 새로 생성
        existingLogs = [];
      }

      // 버퍼의 모든 로그 추가
      const newLogs = [...existingLogs, ...Logger.logBuffer];
      Logger.logBuffer = [];

      // 최대 라인 수 제한
      const trimmedLogs = newLogs.slice(-MAX_LOG_LINES);

      // 파일에 쓰기
      await Logger.vault.adapter.write(LOG_FILE_PATH, trimmedLogs.join('\n') + '\n');
    } catch (error) {
      console.error('[Logger] Failed to write log file:', error);
    } finally {
      Logger.isWriting = false;

      // 대기 중인 로그가 있으면 다시 쓰기
      if (Logger.logBuffer.length > 0) {
        setTimeout(() => Logger.writeToFile(''), 100);
      }
    }
  }

  /**
   * 로그 파일 클리어
   */
  static async clearLogFile(): Promise<void> {
    if (!Logger.vault) {
      return;
    }

    try {
      await Logger.vault.adapter.write(LOG_FILE_PATH, '');
      console.log('[Logger] Log file cleared');
    } catch (error) {
      console.error('[Logger] Failed to clear log file:', error);
    }
  }
}
