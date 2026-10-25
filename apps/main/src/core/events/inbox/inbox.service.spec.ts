jest.mock('../../../infrastructure/prisma/prisma.service.js', () => ({
  PrismaService: class {},
}));
jest.mock('../event-store.service.js', () => ({ EventStoreService: class {} }));
jest.mock(
  '../../../modules/user-accounts/application/services/posts.service.js',
  () => ({ PostsService: class {} }),
);
jest.mock(
  '../../../modules/user-accounts/infrastructure/repositories/user-repositories/users.repository.js',
  () => ({ UsersRepository: class {} }),
);

import { InboxService } from './inbox.service.js';
import { SseService } from '../../sse/sse.service.js';
import { UsersService } from '../../../modules/user-accounts/application/services/users.service.js';
import type { InboxEvent } from '../../../generated/prisma/client.js';

describe('InboxService payment completion', () => {
  const repository = { update: jest.fn() };
  const posts = { updateImage: jest.fn() };
  let event: Partial<InboxEvent>;
  let inbox: InboxService;
  let sse: SseService;

  beforeEach(() => {
    jest.resetAllMocks();
    event = {
      type: 'payment.completed',
      data: { userId: '42', paymentStatus: 'completed' },
    };
    sse = new SseService();
    const users = new UsersService(
      repository as unknown as ConstructorParameters<typeof UsersService>[0],
    );
    const events = {
      run: (_table: string, handle: (event: InboxEvent) => Promise<void>) =>
        handle(event as InboxEvent),
    };
    inbox = new InboxService(
      {} as ConstructorParameters<typeof InboxService>[0],
      sse,
      events as unknown as ConstructorParameters<typeof InboxService>[2],
      posts as unknown as ConstructorParameters<typeof InboxService>[3],
      users,
    );
  });

  it('persists Business before emitting the exact requested SSE payload', async () => {
    let status = 'Personal';
    repository.update.mockImplementation(
      (_id: number, data: { paymentStatus: string }) => {
        status = data.paymentStatus;
        return Promise.resolve();
      },
    );
    const received: unknown[] = [];
    const subscription = sse.getEvents().subscribe((value) => {
      expect(status).toBe('Business');
      received.push(value);
    });
    await inbox.processPending();
    expect(repository.update).toHaveBeenCalledWith(42, {
      paymentStatus: 'Business',
    });
    expect(received).toEqual([
      {
        type: 'payment-completed',
        data: { userId: '42', paymentStatus: 'completed' },
      },
    ]);
    subscription.unsubscribe();
  });

  it('does not emit success if updating the user fails', async () => {
    repository.update.mockRejectedValueOnce(new Error('database unavailable'));
    const received: unknown[] = [];
    const subscription = sse
      .getEvents()
      .subscribe((value) => received.push(value));
    await expect(inbox.processPending()).rejects.toThrow(
      'database unavailable',
    );
    expect(received).toEqual([]);
    subscription.unsubscribe();
  });

  it('still applies existing post image events', async () => {
    event = {
      type: 'post.image.updated',
      data: { postId: 'post', index: 0, image: {}, preview: {} },
    };
    posts.updateImage.mockResolvedValueOnce(true);
    const received: unknown[] = [];
    const subscription = sse
      .getEvents()
      .subscribe((value) => received.push(value));
    await inbox.processPending();
    expect(received).toEqual([
      { type: 'post-media-updated', data: { postId: 'post' } },
    ]);
    expect(repository.update).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
