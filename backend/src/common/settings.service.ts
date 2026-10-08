import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../entities';

/** Параметры, которые нужно сверять с действующим законодательством — поэтому они вынесены в настройки. */
export const DEFAULT_SETTINGS: Record<string, string> = {
  vatPercent: '12', // ставка НДС по умолчанию, %
  customsFeePercent: '0.2', // таможенный сбор, % от таможенной стоимости
  customsFeeMaxUzs: '0', // потолок сбора в сумах (0 = без потолка)
  benefitUntil: '2027-01-01', // до этой даты страны вне списков РНБ/ЗСТ без доп. пошлины (по HTML-схеме)
  otherMultiplier: '1', // множитель ставки для стран вне списков (1 по схеме; 2 = «двойная ставка»)
  tempPercentPerMonth: '3', // временный ввоз: % от платежей за каждый месяц
};

@Injectable()
export class SettingsService {
  constructor(@InjectRepository(Setting) private repo: Repository<Setting>) {}

  async all(): Promise<Record<string, string>> {
    const rows = await this.repo.find();
    const out = { ...DEFAULT_SETTINGS };
    rows.forEach((r) => (out[r.key] = r.value));
    return out;
  }

  async update(patch: Record<string, unknown>) {
    for (const [k, v] of Object.entries(patch)) {
      if (k in DEFAULT_SETTINGS) await this.repo.save({ key: k, value: String(v) });
    }
    return this.all();
  }
}
