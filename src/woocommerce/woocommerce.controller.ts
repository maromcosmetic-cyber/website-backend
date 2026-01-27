import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { WoocommerceService } from './woocommerce.service';
import { WoocommerceAuthGuard } from './woocommerce.guard';

@Controller('wp-json/wc/v3')
@UseGuards(WoocommerceAuthGuard)
export class WoocommerceController {
    constructor(private readonly woocommerceService: WoocommerceService) { }

    @Get('products')
    findAll(@Query('page') page: number = 1, @Query('per_page') perPage: number = 10) {
        return this.woocommerceService.findAll(page, perPage);
    }

    @Get('products/:id')
    findOne(@Param('id') id: string) {
        return this.woocommerceService.findOne(id);
    }

    @Post('products')
    create(@Body() createProductDto: any) {
        return this.woocommerceService.create(createProductDto);
    }

    @Put('products/:id')
    update(@Param('id') id: string, @Body() updateProductDto: any) {
        return this.woocommerceService.update(id, updateProductDto);
    }

    @Delete('products/:id')
    remove(@Param('id') id: string) {
        return this.woocommerceService.remove(id);
    }
}
