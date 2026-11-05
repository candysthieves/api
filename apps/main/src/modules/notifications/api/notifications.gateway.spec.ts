import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { JwtAdapter } from '../../../core/adapters/jwt.adapter.js';
import { ErrorStatus } from '../../../core/exceptions/domain-exception-code.js';
import { NotificationsTcpService } from '../application/notifications-tcp.service.js';
import { GetNotificationsCountQueryHandler } from '../application/query-handler/get-notifications-count.query-handler.js';
import { NotificationsGateway } from './notifications.gateway.js';
import type { CountResponse } from './types/notifications-socket.type.js';

describe('Notifications Socket.IO gateway', () => {
  let app: INestApplication;
  let url: string;
  const clients: Socket[] = [];
  const jwt = new JwtService();
  const secret = 'notifications-test-secret';
  const getNotificationsCount = jest.fn();

  const token = (userId = '42', expiresIn = 60) =>
    jwt.sign({ userId }, { secret, expiresIn });

  function client(accessToken?: string, origin = 'http://localhost:3000') {
    const socket = io(`${url}/notifications`, {
      auth: accessToken === undefined ? {} : { token: accessToken },
      transports: ['websocket'],
      extraHeaders: { Origin: origin },
      autoConnect: false,
      reconnection: false,
      forceNew: true,
      timeout: 1500,
    });
    clients.push(socket);
    return socket;
  }

  function connect(socket: Socket): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
  }

  async function count(socket: Socket) {
    return (await socket
      .timeout(2000)
      .emitWithAck('notifications:unread-count')) as CountResponse;
  }

  beforeAll(async () => {
    const config: Record<string, string> = {
      JWT_SECRET_KEY: secret,
      JWT_SECRET_REFRESH_KEY: 'test-refresh-secret',
      JWT_EXPIRES_IN: '1m',
      JWT_REFRESH_EXPIRES_IN: '1d',
    };
    const module = await Test.createTestingModule({
      imports: [CqrsModule.forRoot()],
      providers: [
        NotificationsGateway,
        GetNotificationsCountQueryHandler,
        JwtAdapter,
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => config[key] },
        },
        {
          provide: NotificationsTcpService,
          useValue: { getNotificationsCount },
        },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  beforeEach(() => {
    getNotificationsCount.mockReset();
    getNotificationsCount.mockResolvedValue({
      data: { count: 0 },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const socket of clients.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ['missing', undefined, ErrorStatus.ACCESS_TOKEN_INVALID],
    ['malformed', 'not-a-jwt', ErrorStatus.ACCESS_TOKEN_INVALID],
    ['expired', token('42', -1), ErrorStatus.ACCESS_TOKEN_EXPIRED],
    [
      'wrong signature',
      jwt.sign({ userId: '42' }, { secret: 'wrong', expiresIn: 60 }),
      ErrorStatus.ACCESS_TOKEN_INVALID,
    ],
  ])(
    'rejects %s credentials during handshake',
    async (_name, accessToken, code) => {
      await expect(connect(client(accessToken))).rejects.toMatchObject({
        data: { code },
      });
      expect(getNotificationsCount).not.toHaveBeenCalled();
    },
  );

  it('rejects a disallowed browser origin even for WebSocket transport', async () => {
    await expect(
      connect(client(token(), 'https://untrusted.example')),
    ).rejects.toBeDefined();
    expect(getNotificationsCount).not.toHaveBeenCalled();
  });

  it('returns fresh counts on each request, including zero', async () => {
    const socket = client(token());
    await connect(socket);
    expect(await count(socket)).toEqual({ data: { count: 0 }, error: null });
    getNotificationsCount.mockResolvedValue({
      data: { count: 3 },
      error: null,
    });
    expect(await count(socket)).toEqual({ data: { count: 3 }, error: null });
  });

  it('isolates users and ignores a client-supplied userId', async () => {
    getNotificationsCount.mockImplementation((userId: string) =>
      Promise.resolve({
        data: { count: userId === '42' ? 2 : 7 },
        error: null,
      }),
    );
    const first = client(token('42'));
    const second = client(token('43'));
    await Promise.all([connect(first), connect(second)]);
    expect(await count(first)).toEqual({ data: { count: 2 }, error: null });
    expect(await count(second)).toEqual({ data: { count: 7 }, error: null });
    expect(
      await first
        .timeout(2000)
        .emitWithAck('notifications:unread-count', { userId: '43' }),
    ).toEqual({
      data: { count: 2 },
      error: null,
    });
  });

  it('keeps serving the authenticated user after token expiry but rejects a new connection', async () => {
    const accessToken = token('42', 2);
    const socket = client(accessToken);
    await connect(socket);
    const { exp } = jwt.decode<{ exp: number }>(accessToken);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, exp * 1000 - Date.now() + 50)),
    );
    expect(await count(socket)).toEqual({
      data: { count: 0 },
      error: null,
    });
    await expect(connect(client(accessToken))).rejects.toMatchObject({
      data: { code: ErrorStatus.ACCESS_TOKEN_EXPIRED },
    });
  });

  it('returns an error rather than zero when the dependency fails', async () => {
    const socket = client(token());
    await connect(socket);
    getNotificationsCount.mockRejectedValue(
      new Error('private dependency details'),
    );
    const response = await count(socket);
    expect(response).toMatchObject({
      data: null,
      error: { code: ErrorStatus.NOTIFICATIONS_SERVICE_UNAVAILABLE },
    });
    expect(JSON.stringify(response)).not.toContain(
      'private dependency details',
    );
  });

  it('returns an error for an unsuccessful RPC result', async () => {
    const socket = client(token());
    await connect(socket);
    getNotificationsCount.mockResolvedValue({
      data: null,
      error: { code: 'ERROR' },
    });
    expect(await count(socket)).toMatchObject({
      data: null,
      error: { code: ErrorStatus.NOTIFICATIONS_SERVICE_UNAVAILABLE },
    });
  });
});
