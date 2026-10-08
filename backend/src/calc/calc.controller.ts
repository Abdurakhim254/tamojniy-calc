import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CalcInput, CalcService } from './calc.service';

@Controller('calc')
export class CalcController {
  constructor(private svc: CalcService) {}

  @Post() calc(@Body() body: CalcInput) { return this.svc.calculate(body); }

  @Post('export') async export(@Body() body: CalcInput, @Res() res: Response) {
    const buf = await this.svc.exportXlsx(body);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="customs-calc.xlsx"');
    res.send(buf);
  }
}
