import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../entities';
import { FxService } from '../common/fx.service';
import { TnvedService } from './tnved.service';

@Controller()
export class TnvedController {
  constructor(
    private svc: TnvedService,
    private fx: FxService,
    @InjectRepository(Country) private countries: Repository<Country>,
  ) {}

  @Get('tnved/search') search(@Query('q') q = '', @Query('limit') limit = '50') {
    return this.svc.search(q, Math.min(Number(limit) || 50, 200));
  }
  @Get('tnved/tree') tree(@Query('prefix') prefix = '') { return this.svc.tree(prefix); }
  @Get('tnved/:code') detail(@Param('code') code: string) { return this.svc.detail(code); }
  @Get('countries') list() { return this.countries.find({ order: { name: 'ASC' } }); }
  @Get('fx') fxRates() { return this.fx.snapshot(); }
}
