import { ConfigModule } from '@nestjs/config';
import { loadEnvironment } from './env/load-env.js';

loadEnvironment();

export const configModule = ConfigModule.forRoot({
  ignoreEnvFile: true,
  isGlobal: true,
});
