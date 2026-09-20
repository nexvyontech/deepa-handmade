import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/public.decorator.js';
import type { ApiInfo } from './app.service.js';

@Controller()
@ApiTags('app')
@Public()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('info')
  getInfo(): ApiInfo {
    return this.appService.getInfo();
  }
}