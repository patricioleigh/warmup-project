import { Module } from '@nestjs/common';
import { HnService } from './hn.service';
import { HttpModule } from '@nestjs/axios';
import { HnController } from './hn.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('HN_HTTP_TIMEOUT_MS') ?? 5000,
        maxRedirects: 0,
      }),
    }),
  ],
  providers: [HnService],
  exports: [HnService],
  controllers: [HnController],
})
export class HnModule {}
