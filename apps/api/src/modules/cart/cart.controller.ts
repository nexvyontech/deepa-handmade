import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { ERROR_CODES } from '../../common/errors/error-codes.js';
import type { AuthenticatedUser } from '../../common/guards/auth.guard.js';
import {
  CART_SESSION_HEADER,
  CartService,
  type CartIdentity,
  type CartValidationResult,
  type CartView,
} from './cart.service.js';
import {
  AddCartItemDto,
  MergeCartDto,
  UpdateCartItemQtyDto,
} from './dto/cart.dto.js';

/**
 * Customer cart (Phase 7). Works for guests (cart session header) and signed-in
 * customers alike; prices, MOQs and totals are always computed server-side.
 */
@ApiTags('cart')
@UseGuards(OptionalAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @Public()
  get(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers(CART_SESSION_HEADER) session: string | undefined,
  ): Promise<CartView> {
    return this.cart.getDetailed(this.identity(user, session));
  }

  @Post('items')
  @Public()
  addItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers(CART_SESSION_HEADER) session: string | undefined,
    @Body() dto: AddCartItemDto,
  ): Promise<CartView> {
    return this.cart.addItem(this.identity(user, session), dto);
  }

  @Patch('items/:itemId')
  @Public()
  updateItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers(CART_SESSION_HEADER) session: string | undefined,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemQtyDto,
  ): Promise<CartView> {
    return this.cart.updateItemQty(this.identity(user, session), itemId, dto.qty);
  }

  @Delete('items/:itemId')
  @Public()
  removeItem(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers(CART_SESSION_HEADER) session: string | undefined,
    @Param('itemId') itemId: string,
  ): Promise<CartView> {
    return this.cart.removeItem(this.identity(user, session), itemId);
  }

  @Delete()
  @Public()
  clear(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers(CART_SESSION_HEADER) session: string | undefined,
  ): Promise<CartView> {
    return this.cart.clear(this.identity(user, session));
  }

  @Post('validate')
  @Public()
  validate(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers(CART_SESSION_HEADER) session: string | undefined,
  ): Promise<CartValidationResult> {
    return this.cart.validate(this.identity(user, session));
  }

  @Post('merge')
  @Public()
  merge(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: MergeCartDto,
  ): Promise<CartView> {
    if (!user?.id) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.UNAUTHORIZED,
        'Sign in to merge your cart.',
      );
    }
    return this.cart.mergeCart(user.id, dto.sessionId);
  }

  private identity(user: AuthenticatedUser | undefined, session: string | undefined): CartIdentity {
    return this.cart.resolveIdentity(user, session);
  }
}