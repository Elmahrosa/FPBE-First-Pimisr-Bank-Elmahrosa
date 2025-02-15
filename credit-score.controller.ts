import { Controller, Get, Post, Body } from '@nestjs/common';
import { CreditScoreService } from './credit-score.service';

@Controller('credit-score')
export class CreditScoreController {
  constructor(private readonly creditScoreService: CreditScoreService) {}

  @Get(':user')
  async getCreditScore(@Body() body: { user: string }) {
    return this.creditScoreService.getCreditScore(body.user);
  }

  @Post('update')
  async updateTransaction(@Body() body: { user: string; amount: number; isLending: boolean }) {
    return this.creditScoreService.updateTransaction(body.user, body.amount, body.isLending);
  }
}
