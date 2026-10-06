import { Controller, Patch, Param, Body, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@deepa/shared';
import type { Request } from 'express';
import { CurrentUser, Permissions } from '../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { requestMeta } from '../../common/utils/request-meta.js';
import { PricingService } from './pricing.service.js';
import { UpdatePricingDto } from './dto/pricing.dto.js';

@ApiTags('admin catalogue')
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly pricing: PricingService) {}

  @Patch('products/:productId')
  @Permissions(PERMISSIONS.PRICE_UPDATE)
  updateProductPrice(
    @Param('productId', ParseObjectIdPipe) productId: string,
    @Body() dto: UpdatePricingDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.pricing.updateProductPrice(productId, dto, {
      id: actor.id,
      role: actor.role,
      ...requestMeta(req),
    });
  }
}