import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiException } from '../../common/exceptions/api.exception.js';
import { PublicListProductsDto } from './dto/product.dto.js';
import { ProductsService, ProductDoc } from './products.service.js';

@ApiTags('public catalogue')
@Controller('catalog')
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('products')
  @Public()
  list(@Query() query: PublicListProductsDto) {
    return this.products.listPublic(query);
  }

  @Get('products/:slug')
  @Public()
  detail(@Param('slug') slug: string) {
    return this.products.publicDetail(slug);
  }

  @Get('products/:slug/variants')
  @Public()
  async variants(@Param('slug') slug: string) {
    const product = (await this.products.getBySlug(slug, true)) as ProductDoc | null;
    if (!product) throw ApiException.notFound('Product not found');
    return this.products.variantsForProduct(String(product._id));
  }
}