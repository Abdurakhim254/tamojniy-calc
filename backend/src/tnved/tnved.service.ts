import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { DocumentReq, Preference, Rate, TnvedCode } from '../entities';
import { digits } from '../common/util';

@Injectable()
export class TnvedService {
  constructor(
    @InjectRepository(TnvedCode) private codes: Repository<TnvedCode>,
    @InjectRepository(Rate) private rates: Repository<Rate>,
    @InjectRepository(DocumentReq) private docs: Repository<DocumentReq>,
    @InjectRepository(Preference) private prefs: Repository<Preference>,
  ) {}

  /** Поиск по коду (префикс) или по описанию (все слова должны встречаться). */
  async search(q: string, limit = 50) {
    const text = (q || '').trim();
    if (!text) return [];
    const d = digits(text);
    if (/^[\d\s]+$/.test(text) && d.length >= 2) {
      return this.codes.find({ where: { code: Like(`${d}%`) }, order: { code: 'ASC' }, take: limit });
    }
    const qb = this.codes.createQueryBuilder('c');
    text.toLowerCase().split(/\s+/).filter(Boolean).forEach((w, i) => qb.andWhere(`c.searchText LIKE :w${i}`, { [`w${i}`]: `%${w}%` }));
    return qb.orderBy('c.code', 'ASC').take(limit).getMany();
  }

  async tree(prefix = '') {
    const p = digits(prefix);
    if (p.length === 0) {
      const rows: { ch: string; n: number }[] = await this.codes.query(
        'SELECT substr(code,1,2) AS ch, COUNT(*) AS n FROM tnved_code GROUP BY ch ORDER BY ch');
      return rows.map((r) => ({ prefix: r.ch, title: `Группа ${r.ch}`, count: Number(r.n), leaf: false }));
    }
    if (p.length < 4) {
      const rows: { h: string; n: number; d: string }[] = await this.codes.query(
        'SELECT heading AS h, COUNT(*) AS n, MIN(description) AS d FROM tnved_code WHERE heading LIKE $1 GROUP BY heading ORDER BY heading', [`${p}%`]);
      return rows.map((r) => ({ prefix: r.h, title: r.d.split(';')[0].replace(/:$/, ''), count: Number(r.n), leaf: false })); // COUNT в PostgreSQL приходит строкой (bigint)
    }
    const rows = await this.codes.find({ where: { code: Like(`${p}%`) }, order: { code: 'ASC' }, take: 500 });
    return rows.map((r) => ({ prefix: r.code, code: r.code, display: r.display, unit: r.unit, title: r.description, leaf: true }));
  }

  /** Самый длинный префикс из таблицы ставок. */
  async resolveRate(code: string): Promise<Rate | null> {
    const c = digits(code);
    const cands = [...new Set([10, 9, 8, 7, 6, 5, 4, 2].map((n) => c.slice(0, n)).filter((x) => x.length >= 2))];
    const found = await this.rates.find({ where: { code: In(cands) } });
    return found.sort((a, b) => b.code.length - a.code.length)[0] ?? null;
  }

  async documentsFor(code: string) {
    const c = digits(code);
    const all = await this.docs.find();
    return all.filter((d) => c.startsWith(d.codePrefix));
  }

  async activePreferences(code: string, date: string) {
    const c = digits(code);
    return (await this.prefs.find()).filter((p) => matchesPreference(p, c, date));
  }

  async detail(code: string) {
    const c = digits(code);
    const row = await this.codes.findOne({ where: { code: c } });
    if (!row) throw new NotFoundException({ code: 'CODE_NOT_FOUND', params: { code } });
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...row,
      path: row.description.split(';').map((s) => s.trim()),
      rate: await this.resolveRate(c),
      documents: await this.documentsFor(c),
      preferences: await this.activePreferences(c, today),
    };
  }
}

export function matchesPreference(p: Preference, code: string, date: string) {
  if (date < p.validFrom || date >= p.validTo) return false;
  if (p.exceptPrefixes.some((x) => code.startsWith(x))) return false;
  return p.prefixes.some((x) => code.startsWith(x));
}
