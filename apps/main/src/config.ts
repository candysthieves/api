import { ConfigModule } from '@nestjs/config';
import { loadEnvironment } from './env/load-env.js';
import { validateEnvironment } from './env/validate-env.js';

loadEnvironment();

export const configModule = ConfigModule.forRoot({
  ignoreEnvFile: true,
  isGlobal: true,
  validate: validateEnvironment,
});
