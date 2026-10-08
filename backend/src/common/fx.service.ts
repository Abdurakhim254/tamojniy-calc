import { Injectable, Logger } from '@nestjs/common';

/** Курсы ЦБ Узбекистана (сум за 1 единицу валюты). Кэш на 1 час. */
@Injectable()
export class FxService {
  private log = new Logger('FX');
  private cache: { at: number; rates: Record<string, number>; date?: string } | null = null;

  async rates(): Promise<Record<string, number>> {
    return (await this.snapshot()).rates;
  }

  async snapshot(): Promise<{ rates: Record<string, number>; date?: string }> {
    if (this.cache && Date.now() - this.cache.at < 3600_000) return this.cache;
    try {
      const res = await fetch('https://cbu.uz/ru/arkhiv-kursov-valyut/json/', { signal: AbortSignal.timeout(8000) });
      const data = (await res.json()) as { Ccy: string; Rate: string; Nominal: string; Date: string }[];
      const rates: Record<string, number> = { UZS: 1 };
      data.forEach((d) => (rates[d.Ccy] = Number(d.Rate) / (Number(d.Nominal) || 1)));
      this.cache = { at: Date.now(), rates, date: data[0]?.Date };
    } catch (e) {
      this.log.warn(`Не удалось получить курсы ЦБ: ${(e as Error).message}`);
      if (!this.cache) return { rates: { UZS: 1 } };
    }
    return this.cache!;
  }
}
