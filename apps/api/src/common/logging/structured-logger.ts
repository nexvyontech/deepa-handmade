import { LogFormat } from '../../config/configuration.js';
import { redactSecrets } from './redact.js';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export interface StructuredFields {
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  code?: string;
  service?: string;
  [key: string]: string | number | boolean | undefined;
}

export class StructuredLogger {
  constructor(
    private readonly context: string,
    private readonly format: LogFormat,
  ) {}

  log(message: string, fields: StructuredFields = {}): void {
    this.write('log', message, fields);
  }

  warn(message: string, fields: StructuredFields = {}): void {
    this.write('warn', message, fields);
  }

  error(message: string, fields: StructuredFields = {}, stack?: string): void {
    this.write('error', message, fields, stack);
  }

  debug(message: string, fields: StructuredFields = {}): void {
    this.write('debug', message, fields);
  }

  private write(
    level: LogLevel,
    message: string,
    fields: StructuredFields,
    stack?: string,
  ): void {
    const safeFields: StructuredFields = { ...fields };
    for (const key of Object.keys(safeFields)) {
      const value = safeFields[key];
      if (typeof value === 'string') {
        safeFields[key] = redactSecrets(value);
      }
    }
    const safeMessage = redactSecrets(message);

    if (this.format === 'json') {
      const entry: Record<string, unknown> = {
        ts: new Date().toISOString(),
        level,
        context: this.context,
        message: safeMessage,
        ...safeFields,
      };
      if (stack) entry.stack = stack;
      this.emit(JSON.stringify(entry));
      return;
    }

    const prefix = `[${this.context}] ${safeMessage}`;
    const parts: string[] = [];
    for (const [key, value] of Object.entries(safeFields)) {
      if (value !== undefined) parts.push(`${key}=${String(value)}`);
    }
    this.emit(`${prefix}${parts.length ? ` | ${parts.join(' ')}` : ''}`);
  }

  private emit(line: string): void {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}