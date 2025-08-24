import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  LOG = 'log',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

@Injectable()
export class DebugLoggerService {
  private readonly logger = new Logger(DebugLoggerService.name);
  private readonly enabledDebug: boolean;
  private readonly logLevel: LogLevel;

  constructor(private readonly configService: ConfigService) {
    // Habilitar debug si está en desarrollo o si la variable está configurada
    this.enabledDebug = 
      this.configService.get<string>('NODE_ENV') === 'development' ||
      this.configService.get<string>('ENABLE_SEMANTIC_DEBUG') === 'true';
    
    this.logLevel = this.configService.get<LogLevel>('LOG_LEVEL') || LogLevel.LOG;
    
    if (this.enabledDebug) {
      this.logger.log('🔧 Debug de búsqueda semántica HABILITADO');
      this.logger.log(`🔧 Nivel de log: ${this.logLevel}`);
    }
  }

  /**
   * Log de información general (siempre visible)
   */
  log(context: string, message: string, ...args: any[]): void {
    const logger = new Logger(context);
    logger.log(message, ...args);
  }

  /**
   * Log de debug detallado (solo si está habilitado)
   */
  debug(context: string, message: string, ...args: any[]): void {
    if (this.enabledDebug || this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.VERBOSE) {
      const logger = new Logger(context);
      logger.debug(message, ...args);
    }
  }

  /**
   * Log de warning (siempre visible)
   */
  warn(context: string, message: string, ...args: any[]): void {
    const logger = new Logger(context);
    logger.warn(message, ...args);
  }

  /**
   * Log de error (siempre visible)
   */
  error(context: string, message: string, trace?: string, ...args: any[]): void {
    const logger = new Logger(context);
    logger.error(message, trace, ...args);
  }

  /**
   * Log de información muy detallada (solo en verbose)
   */
  verbose(context: string, message: string, ...args: any[]): void {
    if (this.enabledDebug || this.logLevel === LogLevel.VERBOSE) {
      const logger = new Logger(context);
      logger.verbose(message, ...args);
    }
  }

  /**
   * Log de métricas de rendimiento
   */
  performance(context: string, operation: string, duration: number, metadata?: any): void {
    const perfMessage = `⏱️ [PERFORMANCE] ${operation}: ${duration}ms`;
    
    if (metadata) {
      this.debug(context, `${perfMessage} | ${JSON.stringify(metadata)}`);
    } else {
      this.debug(context, perfMessage);
    }
  }

  /**
   * Log de datos de depuración con formato JSON
   */
  debugData(context: string, label: string, data: any): void {
    if (this.enabledDebug || this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.VERBOSE) {
      const logger = new Logger(context);
      logger.debug(`📋 [DEBUG_DATA] ${label}:`);
      logger.debug(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log separador para secciones
   */
  separator(context: string, title: string): void {
    if (this.enabledDebug || this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.VERBOSE) {
      const logger = new Logger(context);
      const separator = '='.repeat(50);
      logger.debug(separator);
      logger.debug(`📍 ${title}`);
      logger.debug(separator);
    }
  }

  /**
   * Verifica si el debug está habilitado
   */
  isDebugEnabled(): boolean {
    return this.enabledDebug || this.logLevel === LogLevel.DEBUG || this.logLevel === LogLevel.VERBOSE;
  }

  /**
   * Log de progreso para operaciones largas
   */
  progress(context: string, current: number, total: number, operation: string): void {
    const percentage = Math.round((current / total) * 100);
    const message = `📈 [PROGRESS] ${operation}: ${current}/${total} (${percentage}%)`;
    
    // Mostrar cada 10% o cada 100 elementos
    if (percentage % 10 === 0 || current % 100 === 0 || current === total) {
      this.log(context, message);
    } else {
      this.debug(context, message);
    }
  }

  /**
   * Log de configuración del sistema
   */
  config(context: string, configName: string, isConfigured: boolean, details?: any): void {
    const status = isConfigured ? '✅ CONFIGURADO' : '❌ NO CONFIGURADO';
    const message = `🔧 [CONFIG] ${configName}: ${status}`;
    
    this.log(context, message);
    
    if (details && this.isDebugEnabled()) {
      this.debugData(context, `${configName} details`, details);
    }
  }
}
