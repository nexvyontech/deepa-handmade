import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/SettingsModule.js';
import { ShippingCalculatorService } from './shipping-calculator.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [],
  providers: [ShippingCalculatorService],
  exports: [ShippingCalculatorService],
})
export class ShippingModule {}