import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ADDRESS_MODEL, addressSchema } from '../../database/schemas/index.js';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Customer address book (Phase 7): list/create/update/soft-delete and default
 * selection. Owner-scoped; checkout reads saved addresses through this module.
 */
@Module({
  imports: hasMongoUri()
    ? [MongooseModule.forFeature([{ name: ADDRESS_MODEL, schema: addressSchema }])]
    : [],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}