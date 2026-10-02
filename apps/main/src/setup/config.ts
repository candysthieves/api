import { loadEnvironment } from '../env/load-env.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../env/validate-env.js';

loadEnvironment();

export const configModule = ConfigModule.forRoot({
  ignoreEnvFile: true,
  isGlobal: true,
  validate: validateEnvironment,
});
