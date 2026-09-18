// Run after building main and files. Uses only the disposable local test databases below.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import mongoose from 'mongoose';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../dist/apps/main/apps/main/src/generated/prisma/client.js';
import { PostImagesRepository } from '../../../dist/apps/main/apps/main/src/core/events/post-images.repository.js';
import { ImageResultInboxService } from '../../../dist/apps/main/apps/main/src/core/events/image-result-inbox.service.js';
import { FilesInboxRepository } from '../../../dist/apps/files/apps/files/src/events/files-inbox.repository.js';
import { InputEventSchema } from '../../../dist/apps/files/apps/files/src/events/schemas/input-event.schema.js';
import { OutputEventSchema } from '../../../dist/apps/files/apps/files/src/events/schemas/output-event.schema.js';
import { FilesOutboxRepository } from '../../../dist/apps/files/apps/files/src/events/files-outbox.repository.js';
import { CancelledPostSchema } from '../../../dist/apps/files/apps/files/src/modules/files/schemas/cancelled-post.schema.js';
import { CancelledPostRepository } from '../../../dist/apps/files/apps/files/src/modules/files/application/cancelled-post.repository.js';

const url =
  'postgresql://postgres:codex_local_only@127.0.0.1:55439/codex_post_test';
const pool = new pg.Pool({ connectionString: url });
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});
const mongo = await mongoose
  .createConnection('mongodb://127.0.0.1:57029/codex_post_single_test')
  .asPromise();
let passed = 0;
const check = async (name, fn) => {
  await fn();
  passed++;
  console.log('PASS ' + name);
};
const file = (id = randomUUID()) => ({
  fileId: id,
  url: 'https://example.test/' + id,
  width: 100,
  height: 100,
});
const event = (postId, index = 0) => ({
  eventId: randomUUID(),
  consumer: 'MAIN',
  type: 'post.image.updated.v1',
  data: {
    postId,
    index,
    status: 'READY',
    image: file(),
    preview: index === 0 ? file() : null,
  },
});
const newPost = async () => {
  const id = randomUUID();
  await pool.query(
    'INSERT INTO "Post" (id, description, images, "user_id") VALUES ($1, $2, $3, $4)',
    [id, 'test', '[null,null]', 'user'],
  );
  return id;
};
try {
  // This isolated schema has no application data and is created only in codex_post_test.
  await pool.query(`DROP TABLE IF EXISTS "InputEvent"; DROP TYPE IF EXISTS "EventStatus";
    DROP TABLE IF EXISTS "Post"; DROP TYPE IF EXISTS "MediaStatus";
    CREATE TYPE "MediaStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');
    CREATE TABLE "Post" (id uuid PRIMARY KEY, description text NOT NULL, locations jsonb DEFAULT '[]',
    images jsonb DEFAULT '[]', preview jsonb, media_status "MediaStatus" DEFAULT 'PROCESSING',
    media_error text, user_id text NOT NULL, created_at timestamp DEFAULT now(), updated_at timestamp DEFAULT now(),
    will_be_deleted timestamp);
    CREATE TYPE "EventStatus" AS ENUM ('UNPROCESSED', 'PROCESSING', 'OK', 'ERROR');
    CREATE TABLE "InputEvent" (
      id uuid PRIMARY KEY, event_id uuid NOT NULL UNIQUE, consumer text NOT NULL,
      type text NOT NULL, data jsonb NOT NULL,
      status "EventStatus" NOT NULL DEFAULT 'UNPROCESSED', attempts integer NOT NULL DEFAULT 0,
      last_error text, next_attempt_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
    );
    CREATE INDEX "InputEvent_status_next_attempt_at_idx" ON "InputEvent" (status, next_attempt_at);`);
  await check(
    'add and remove image_processing migration preserves post images',
    async () => {
      const id = await newPost();
      await pool.query(
        await readFile(
          new URL(
            '../prisma/migrations/20260906120000_add_post_image_processing/migration.sql',
            import.meta.url,
          ),
          'utf8',
        ),
      );
      await pool.query(
        await readFile(
          new URL(
            '../prisma/migrations/20260908180000_remove_post_image_processing/migration.sql',
            import.meta.url,
          ),
          'utf8',
        ),
      );
      assert.deepEqual(
        (await pool.query('SELECT images FROM "Post" WHERE id=$1', [id]))
          .rows[0].images,
        [null, null],
      );
      assert.equal(
        (
          await pool.query(
            "SELECT 1 FROM information_schema.columns WHERE table_name='Post' AND column_name='image_processing'",
          )
        ).rowCount,
        0,
      );
    },
  );
  const posts = new PostImagesRepository(prisma);
  const emitted = [];
  const sse = { emit: (type, data) => emitted.push({ type, ...data }) };
  const inbox = new ImageResultInboxService(prisma, sse, posts);
  await check(
    'updates individual image positions without losing other images',
    async () => {
      const id = await newPost();
      const first = event(id);
      const second = event(id, 1);
      await Promise.all([
        posts.updateImage(id, 0, first.data.image, 'READY'),
        posts.updateImage(id, 1, second.data.image, 'READY'),
      ]);
      await posts.updatePreview(id, first.data.preview);
      const replacement = event(id, 1);
      await inbox.applyMediaEvent(replacement);
      const post = await prisma.post.findUnique({ where: { id } });
      assert.deepEqual(post.images, [first.data.image, replacement.data.image]);
      assert.deepEqual(post.preview, first.data.preview);
      assert.equal(post.mediaStatus, 'READY');
    },
  );
  await check(
    'FAILED deletes the post without a deletion notification',
    async () => {
      const id = await newPost();
      const failed = event(id);
      Object.assign(failed.data, {
        status: 'FAILED',
        image: null,
        preview: null,
      });
      const before = emitted.length;
      await inbox.applyMediaEvent(failed);
      await inbox.applyMediaEvent(failed);
      assert.equal(await prisma.post.findUnique({ where: { id } }), null);
      assert.equal(emitted.length, before);
    },
  );
  const input = mongo.model('InputEvent', InputEventSchema);
  const output = mongo.model('OutputEvent', OutputEventSchema);
  const cancelledModel = mongo.model('CancelledPost', CancelledPostSchema);
  await Promise.all([input.init(), output.init(), cancelledModel.init()]);
  const inputEvents = new FilesInboxRepository(input);
  const outbox = new FilesOutboxRepository(output);
  const cancelledPosts = new CancelledPostRepository(cancelledModel);
  await check(
    'input events are unique and terminal states are retained',
    async () => {
      const value = { postId: randomUUID(), index: 0 };
      await inputEvents.createEvent(value);
      await assert.rejects(inputEvents.createEvent(value), { code: 11000 });
      await inputEvents.updateEvent(value, 'FAILED');
      await inputEvents.updateEvent(value, 'READY');
      assert.equal((await inputEvents.findEvent(value)).state, 'FAILED');
      assert.equal(await inputEvents.hasFailedEvent(value.postId), true);
    },
  );
  await check(
    'outbox replaces the same image result and republishes it',
    async () => {
      const first = event(randomUUID());
      await outbox.updateOrCreate(first);
      await outbox.markPublished(first.eventId);
      const failed = {
        ...first,
        eventId: randomUUID(),
        data: {
          ...first.data,
          status: 'FAILED',
          image: null,
          preview: null,
        },
      };
      await outbox.updateOrCreate(failed);
      await outbox.markPublished(first.eventId);
      const filter = { 'data.postId': first.data.postId, 'data.index': 0 };
      assert.equal(await output.countDocuments(filter), 1);
      const saved = await output.findOne(filter).lean();
      assert.equal(saved.eventId, failed.eventId);
      assert.equal(saved.status, 'UNPROCESSED');
      assert.equal(saved.data.status, 'FAILED');
    },
  );
  await check('explicit cancellation expires and can be renewed', async () => {
    const id = randomUUID();
    await cancelledPosts.cancel(id);
    assert.equal(await cancelledPosts.isCancelled(id), true);
    await cancelledModel.updateOne(
      { postId: id },
      { $set: { expiresAt: new Date(0) } },
    );
    assert.equal(await cancelledPosts.isCancelled(id), false);
    await cancelledPosts.cancel(id);
    assert.equal(await cancelledPosts.isCancelled(id), true);
  });
  await check(
    'main inbox deduplicates accepted events and completes them on schedule',
    async () => {
      const id = await newPost();
      const result = event(id);
      await inbox.accept(result);
      await inbox.accept(result);
      const { Test } = await import('@nestjs/testing');
      const { ScheduleModule } = await import('@nestjs/schedule');
      const scheduler = await Test.createTestingModule({
        imports: [ScheduleModule.forRoot()],
        providers: [{ provide: ImageResultInboxService, useValue: inbox }],
      }).compile();
      await scheduler.init();
      try {
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const row = await prisma.inboxEvent.findUnique({
            where: { eventId: result.eventId },
          });
          if (row.status === 'OK') break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        const row = await prisma.inboxEvent.findUnique({
          where: { eventId: result.eventId },
        });
        assert.equal(row.status, 'OK');
        assert.equal(row.attempts, 0);
        assert.equal(
          await prisma.inboxEvent.count({ where: { eventId: result.eventId } }),
          1,
        );
      } finally {
        await scheduler.close();
      }
    },
  );
  console.log(passed + ' database scenarios passed');
} finally {
  await prisma.$disconnect();
  await pool.end();
  await mongo.close();
}
