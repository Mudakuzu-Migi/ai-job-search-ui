import { ModuleRef } from '@nestjs/core';
import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

@Injectable()
export class Workers {
  constructor(private readonly moduleRef: ModuleRef) {}

  async test(taskId: string) {
      // Logic
  }
}
