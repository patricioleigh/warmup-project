import { Module } from '@nestjs/common';
import { HnService } from './hn.service';
import { HttpModule } from '@nestjs/axios';
import { HnController } from './hn.controller';

@Module({
    imports: [HttpModule],
    providers: [HnService],
    exports: [HnService],
    controllers: [HnController]
})
export class HnModule {}
