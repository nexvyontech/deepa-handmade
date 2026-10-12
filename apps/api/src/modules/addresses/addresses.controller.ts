import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto.js';
import { AddressesService, type AddressView } from './addresses.service.js';

/**
 * Customer address book (Phase 7). Owned by the authenticated customer only;
 * soft-deleted records are never returned.
 */
@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  list(@CurrentUser('id') userId: string): Promise<AddressView[]> {
    return this.addresses.list(userId);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressView> {
    return this.addresses.create(userId, dto);
  }

  @Patch(':addressId')
  update(
    @CurrentUser('id') userId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressView> {
    return this.addresses.update(userId, addressId, dto);
  }

  @Delete(':addressId')
  remove(@CurrentUser('id') userId: string, @Param('addressId') addressId: string): Promise<AddressView> {
    return this.addresses.remove(userId, addressId);
  }

  @Post(':addressId/default')
  setDefault(@CurrentUser('id') userId: string, @Param('addressId') addressId: string): Promise<AddressView> {
    return this.addresses.setDefault(userId, addressId);
  }
}