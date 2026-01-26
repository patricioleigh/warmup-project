import { Controller, Get, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';

// Ops-only visibility via health namespace (not versioned public API)
@Controller('health/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get(':jobName')
  async getJob(@Param('jobName') jobName: string) {
    return (
      (await this.jobs.getState(jobName)) ?? { jobName, status: 'unknown' }
    );
  }
}
