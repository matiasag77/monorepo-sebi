import { Module, Global } from '@nestjs/common';
import { GcpAuthService } from './gcp-auth.service';

@Global()
@Module({
  providers: [GcpAuthService],
  exports: [GcpAuthService],
})
export class GcpAuthModule {}
