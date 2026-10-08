import { Body, Controller, Get, Post, Put, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentReq, Rate, TnvedCode } from '../entities';
import { bad } from '../common/msgs';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AdminGuard } from '../common/admin.guard';
import { SettingsService } from '../common/settings.service';
import { ImportService } from './import.service';

@Controller()
export class AdminController {
  constructor(
    private imp: ImportService,
    private settings: SettingsService,
    @InjectRepository(TnvedCode) private codeRepo: Repository<TnvedCode>,
    @InjectRepository(Rate) private rateRepo: Repository<Rate>,
    @InjectRepository(DocumentReq) private docRepo: Repository<DocumentReq>,
  ) {}

  /** Сколько данных загружено (для вкладки «Данные»). */
  @Get('stats') async stats() {
    const rates = await this.rateRepo.find();
    return {
      codes: await this.codeRepo.count(),
      rates: rates.length,
      demoRates: rates.filter((r) => /^(DEMO|ДЕМО)/.test(r.note ?? '')).length,
      documents: await this.docRepo.count(),
    };
  }

  @Get('settings') getSettings() { return this.settings.all(); }
  @Put('settings') @UseGuards(AdminGuard) putSettings(@Body() body: Record<string, unknown>) { return this.settings.update(body); }

  @Get('admin/rates/template') template(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="rates-template.xlsx"');
    res.send(this.imp.ratesTemplate());
  }

  private file(f?: Express.Multer.File) {
    if (!f) throw bad('NO_FILE');
    return f.buffer;
  }

  @Post('admin/import/codes') @UseGuards(AdminGuard) @UseInterceptors(FileInterceptor('file'))
  codes(@UploadedFile() f: Express.Multer.File, @Query('replace') r?: string) { return this.imp.importCodes(this.file(f), r === 'true'); }

  @Post('admin/import/rates') @UseGuards(AdminGuard) @UseInterceptors(FileInterceptor('file'))
  rates(@UploadedFile() f: Express.Multer.File, @Query('replace') r?: string) { return this.imp.importRates(this.file(f), r === 'true'); }

  @Post('admin/import/documents') @UseGuards(AdminGuard) @UseInterceptors(FileInterceptor('file'))
  docs(@UploadedFile() f: Express.Multer.File, @Query('replace') r?: string) { return this.imp.importDocuments(this.file(f), r === 'true'); }
}
