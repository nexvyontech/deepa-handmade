import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Connection } from 'mongoose';

const CONNECTION_STATES = [
  'disconnected',
  'connected',
  'connecting',
  'disconnecting',
] as const;

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly config: ConfigService,
    @Optional() @Inject(getConnectionToken()) private readonly connection: Connection | undefined,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    const heapLimit =
      this.config.get<number>('health.memoryHeapMb', 512) * 1024 * 1024;
    const diskPath = this.config.get<string>('health.diskPath', '.');

    return this.health.check([
      () => this.memory.checkHeap('memory_heap', heapLimit),
      () => this.disk.checkStorage('storage', { path: diskPath, thresholdPercent: 0.9 }),
      () => this.checkDatabase(),
    ]);
  }

  private checkDatabase(): Promise<HealthIndicatorResult> {
    if (!this.connection) {
      return Promise.resolve({
        database: { status: 'up', mode: 'not_configured' },
      });
    }

    const state =
      this.connection.readyState >= 0 &&
      this.connection.readyState < CONNECTION_STATES.length
        ? CONNECTION_STATES[this.connection.readyState as 0 | 1 | 2 | 3]
        : 'unknown';
    if (this.connection.readyState !== 1) {
      return Promise.resolve({ database: { status: 'down', state } });
    }
    return Promise.resolve({ database: { status: 'up', state } });
  }
}