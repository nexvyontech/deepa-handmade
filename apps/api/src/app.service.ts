import { Injectable } from '@nestjs/common';

export interface ApiInfo {
  name: string;
  version: string;
  environment: string;
}

@Injectable()
export class AppService {
  getInfo(): ApiInfo {
    return {
      name: 'deepa-handmade-api',
      version: '1',
      environment: process.env.NODE_ENV ?? 'development',
    };
  }
}