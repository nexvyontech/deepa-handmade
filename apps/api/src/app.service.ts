import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiInfo {
  name: string;
  version: string;
  environment: string;
}

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getInfo(): ApiInfo {
    return {
      name: this.config.get<string>('name')!,
      version: '1',
      environment: this.config.get<string>('env')!,
    };
  }
}