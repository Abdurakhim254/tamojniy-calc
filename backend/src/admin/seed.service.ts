import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { IsNull, Not } from 'typeorm';
import { Country, DocumentReq, Preference, Rate, TnvedCode } from '../entities';
import { DEMO_RATES, GOODS_LIST_ONLY, MFN, PREFERENCES, ZST } from '../seed-data';
import { ImportService } from './import.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private log = new Logger('Seed');
  constructor(
    @InjectRepository(Country) private countries: Repository<Country>,
    @InjectRepository(Preference) private prefs: Repository<Preference>,
    @InjectRepository(Rate) private rates: Repository<Rate>,
    @InjectRepository(TnvedCode) private codes: Repository<TnvedCode>,
    private importer: ImportService,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.countries.count()) === 0) {
      await this.countries.save([
        ...ZST.map(([iso, name]) => ({ iso, name, regime: 'ZST', goodsListOnly: GOODS_LIST_ONLY.includes(iso) })),
        ...MFN.map(([iso, name]) => ({ iso, name, regime: 'MFN', goodsListOnly: GOODS_LIST_ONLY.includes(iso) })),
      ]);
      this.log.log('Страны загружены (10 ЗСТ + 47 РНБ)');
    }
    if ((await this.prefs.count()) === 0 || (await this.prefs.count({ where: [{ nameEn: IsNull() }, { source: Not(PREFERENCES[0].source) }] })) > 0) {
      await this.prefs.clear(); // также дозаполняет переводы названий у старых записей
      await this.prefs.save(PREFERENCES);
      this.log.log(`Льготы УП-145 загружены: ${PREFERENCES.length}`);
    }
    if ((await this.rates.count()) === 0) {
      await this.rates.save(DEMO_RATES.map((r) => ({
        dutySpecific: null, dutyCurrency: null, excisePercent: null, exciseSpecific: null, exciseCurrency: null,
        vatPercent: null, utilFee: null, ...r, note: 'DEMO',
      })));
      this.log.warn('DEMO rates loaded. Import real rates on the Data tab.');
    }
    if ((await this.codes.count()) === 0) {
      const file = join(__dirname, '..', '..', 'data', 'codes.xlsx');
      if (existsSync(file)) {
        const r = await this.importer.importCodes(readFileSync(file));
        this.log.log(`Коды ТН ВЭД загружены: ${r.imported}`);
      }
    }
  }
}
