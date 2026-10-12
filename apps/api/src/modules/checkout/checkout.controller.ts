import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import { CART_SESSION_HEADER } from '../cart/cart.service.js';
import { CheckoutService, type CheckoutPreparation } from './checkout.service.js';
import { CheckoutPrepareDto } from './dto/checkout.dto.js';

/**
 * Checkout preparation (Phase 7): validates the active cart and delivery
 * address and returns a server-authoritative order summary. No order or
 * payment records are created here.
 */
@ApiTags('checkout')
@UseGuards(OptionalAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('prepare')
  @Public()
  prepare(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers(CART_SESSION_HEADER) session: string | undefined,
    @Body() dto: CheckoutPrepareDto,
  ): Promise<CheckoutPreparation> {
    return this.checkout.prepare(this.checkout.resolveIdentity(user, session), dto);
  }
}