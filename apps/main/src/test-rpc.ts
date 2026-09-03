import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

type RpcResponse = {
  data: null;
  error: {
    code: string;
    errors: {
      field: string;
      message: string;
    }[];
  };
};

const client: ClientProxy = ClientProxyFactory.create({
  transport: Transport.TCP,
  options: {
    host: 'localhost',
    port: 3003,
  },
});

async function test(): Promise<void> {
  try {
    const result = await firstValueFrom(
      client.send<RpcResponse>({ cmd: 'upload-avatar-file' }, {}),
    );

    console.dir(result, { depth: null });
  } catch (error: unknown) {
    console.dir(error, { depth: null });
  } finally {
    client.close();
  }
}

await test();
