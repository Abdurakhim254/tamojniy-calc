import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin/admin.controller';
import { ImportService } from './admin/import.service';
import { SeedService } from './admin/seed.service';
import { CalcController } from './calc/calc.controller';
import { CalcService } from './calc/calc.service';
import { pgOptions } from './common/db';
import { FxService } from './common/fx.service';
import { SettingsService } from './common/settings.service';
import { Country, CountryGoods, DocumentReq, Preference, Rate, Setting, TnvedCode } from './entities';
import { TnvedController } from './tnved/tnved.controller';
import { TnvedService } from './tnved/tnved.service';

const entities = [TnvedCode, Rate, Preference, Country, CountryGoods, DocumentReq, Setting];

@Module({
  imports: [
    TypeOrmModule.forRoot({ ...pgOptions(), entities, synchronize: process.env.DB_SYNC !== 'false' }),
    TypeOrmModule.forFeature(entities),
  ],
  controllers: [TnvedController, CalcController, AdminController],
  providers: [TnvedService, CalcService, FxService, SettingsService, ImportService, SeedService],
})
export class AppModule {}
