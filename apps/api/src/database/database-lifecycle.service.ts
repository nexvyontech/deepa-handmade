import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import mongoose, { type Connection } from 'mongoose';

@Injectable()
export class DatabaseLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseLifecycleService.name);
  private readonly debugEnabled: boolean;

  constructor(@Optional() @Inject(getConnectionToken()) private readonly connection?: Connection) {
    this.debugEnabled = process.env.MONGOOSE_DEBUG === 'true';
  }

  onModuleInit(): void {
    if (!this.connection) {
      this.logger.log('MongoDB not configured; running without a database');
      return;
    }

    mongoose.set('debug', this.debugEnabled);

    this.connection.on('connected', () => {
      this.logger.log('MongoDB connected');
    });
    this.connection.on('reconnected', () => {
      this.logger.warn('MongoDB reconnected');
    });
    this.connection.on('disconnected', () => {
      this.logger.warn('MongoDB disconnected');
    });
    this.connection.on('error', (error: Error) => {
      this.logger.error(`MongoDB connection error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connection) return;
    mongoose.set('debug', false);
    await this.connection.close();
    this.logger.log('MongoDB connection closed');
  }
}