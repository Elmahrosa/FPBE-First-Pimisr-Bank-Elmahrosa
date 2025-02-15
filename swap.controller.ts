import { Controller, Post, Body } from '@nestjs/common';
import { ethers } from 'ethers';
import { SwapService } from './swap.service';

@Controller('swap')
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  @Post('initiate')
  async initiateSwap(@Body() body: { sender: string; receiver: string; amount: string; secret: string }) {
    const hashLock = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(body.secret));
    return this.swapService.initiateSwap(body.sender, body.receiver, body.amount, hashLock);
  }

  @Post('complete')
  async completeSwap(@Body() body: { swapId: string; secret: string }) {
    return this.swapService.completeSwap(body.swapId, body.secret);
  }
}
