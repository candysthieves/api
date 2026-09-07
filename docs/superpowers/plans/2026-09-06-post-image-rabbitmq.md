# Post Image RabbitMQ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. В этой сессии доступен `executing-plans`; делегирование без отдельного запроса пользователя не включать.

**Goal:** Принимать до 8 картинок поста через бинарные RabbitMQ-сообщения, обрабатывать последовательно и обновлять видимый пост после каждого результата.

**Architecture:** Main сохраняет пост с null-позициями и публикует отдельные задания с подтверждениями брокера. Files обрабатывает одно изображение, сохраняет идемпотентный результат и событие в Mongo; main применяет события по позиции и уведомляет SSE `{ postId }`. Повторы проходят через отдельную бинарную retry-очередь, а существующий пакетный TCP-поток остаётся для старых заданий.

**Tech Stack:** TypeScript ESM, NestJS 11, amqplib (уже в package.json), RabbitMQ, Prisma 7/PostgreSQL, Mongoose/MongoDB, sharp, существующий S3Adapter, Jest/ts-jest.

**Spec:** [2026-09-06-post-image-rabbitmq-design.md](../specs/2026-09-06-post-image-rabbitmq-design.md)

## Global Constraints

- До 8 картинок в посте; существующий предел одной картинки — 5 * 1024 * 1024 байт.
- Пост видим сразу после создания, без ожидания обработки изображений.
- Одна картинка — одно сообщение с исходным бинарным телом. Base64 и JSON-массив байтов не используются. Метаданные передаются через AMQP properties/headers.
- Всего 3 попытки обработки, включая первую.
- Превью производится из картинки с index=0; её READY означает готовность и изображения, и превью.
- SSE data содержит только `{ postId }`.
- Не нужны новые зависимости или volume приложения. Не менять `.env` с секретами, не запускать проверки на настоящем сервере.
- Не удалять существующий TCP-поток аватаров/удаления/восстановления и обработку ранее принятых пакетных заданий.
- Планирование не включает реализацию, коммит, push или выкладку. Шаги коммитов ниже выполняются только при отдельном разрешении на коммиты; иначе оставить изменения для ревью.
- Технические значения по умолчанию: retry delay 10_000 ms, общий dispatch deadline 15_000 ms, reconnect backoff 1–10 секунд. Это параметры плана, а не дополнительно согласованные продуктовые требования.

---

## Контекст и карта файлов

Проверено на HEAD `1bd271f`. До начала работ существовала неотслеживаемая `.codegraph/`; не добавлять её в коммиты. В репозитории настроены unit Jest в package.json и отдельный ESM e2e config; существующие e2e относятся к auth/session. Команда `pnpm test` разрешает отсутствие тестов, поэтому целевые проверки ниже запускаются напрямую без `--passWithNoTests`.

| Файл / область | Ответственность |
|---|---|
| Create `libs/contracts/post-image.contract.ts`, modify `libs/contracts/index.ts` | Общие задания, состояния, события, wire validation |
| Create `libs/rabbitmq/post-image-transport.ts` | Соединение, topology, bounded confirms, binary publisher, consumer lifecycle |
| Create `libs/contracts/post-image-state.ts` | Чистые функции состояния поста и защиты от устаревших событий |
| Modify `apps/main/prisma/schema.prisma`; create migration | Nullable JSONB `imageProcessing` |
| Create `apps/main/src/core/events/post-image-state.repository.ts` | Транзакционные операции над позициями, dispatch recovery |
| Create `apps/main/src/core/events/post-image-dispatch.service.ts` | Отправка набора, deadline, частичная ошибка |
| Modify `apps/main/src/modules/user-accounts/application/use-cases/posts-use-cases/create-post.use.case.ts` | Создание поста с позициями и новый dispatch |
| Create `apps/files/src/modules/files/schemas/post-image-job.schema.ts` | Уникальная job, attempts, стабильные file IDs, pending event |
| Create `apps/files/src/modules/files/application/post-image-job.repository.ts` | Атомарные состояния/попытки и outbox в одном Mongo document |
| Create `apps/files/src/modules/files/application/post-image-worker.service.ts` | Одна попытка, preview, durable terminal result |
| Modify `apps/files/src/modules/files/application/files.service.ts` | Идемпотентное сохранение для новой job |
| Create `apps/files/src/modules/files/application/post-image-queue.service.ts` | Consumer, confirm retry handoff, retry forwarding |
| Create `apps/files/src/modules/files/application/post-image-result-relay.service.ts` | Доставка pending событий с confirm |
| Create `apps/main/src/core/events/post-image-result-consumer.service.ts` | Durable inbox до AMQP ack |
| Modify `apps/main/src/core/events/post-media-events.service.ts` | Ветка нового события без TCP ack; транзакционное применение |
| Modify `apps/main/src/core/events/events.module.ts`, `apps/files/src/modules/files/files.module.ts` | Nest provider wiring без циклов |
| Modify post view/mapper, Swagger и SSE enum | Null slots, статусы, уведомления |
| Create `test/post-images/*`, `test/post-images/compose.yml` | Изолированная интеграционная проверка двух сервисов |

Точные пути существующих view/docs перечислены в Task 7. Новые unit-тесты располагаются рядом с соответствующим файлом: `.spec.ts`. Новый код использует `.js` в относительных imports, как существующий проект.

## Task 1: Общий контракт и правила состояния

**Files:**
- Create `libs/contracts/post-image.contract.ts`
- Create `libs/contracts/post-image-state.ts`
- Create `libs/contracts/post-image.contract.spec.ts`
- Create `libs/contracts/post-image-state.spec.ts`
- Modify `libs/contracts/index.ts`

**Interfaces:**
- Consumes: только Buffer/crypto и примитивы; не импортировать generated Prisma из libs.
- Produces: типы ниже; `createImageState(imageIds: string[]): ImageState[]`; `applyImageEvent(state: PostMediaState, event: ImageEvent): PostMediaState`; `validateImageJob(job: ImageJob): void`.

- [ ] **Step 1: Добавить контракт и failing tests валидатора/переходов.**

```ts
export type ImageStatus = 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';
export type MediaFile = { fileId: string; url: string; width: string; height: string };
export type ImageError = { code: string; traceId: string };
export type ImageState = {
  imageId: string; status: ImageStatus; attempts: number;
  error: ImageError | null; revision: number;
  dispatchPending: boolean; dispatchDeadline: string;
};
export type PostMediaState = {
  images: (MediaFile | null)[]; preview: MediaFile | null;
  imageProcessing: ImageState[];
};
export type ImageJob = {
  version: 1; postId: string; imageId: string; index: number;
  total: number; originalName: string; mimeType: string;
  size: number; attempt: number; notBefore: number; body: Buffer;
};
export type ImageEvent = {
  eventId: string; consumer: 'MAIN'; type: 'post.image.updated.v1';
  data: {
    postId: string; imageId: string; index: number; revision: number;
    status: ImageStatus; attempts: number; error: ImageError | null;
    image: MediaFile | null; preview: MediaFile | null;
  };
};
```

```ts
it('создаёт ровно восемь явных null, сохраняет позицию результата', () => {
  const ids = Array.from({ length: 8 }, () => crypto.randomUUID());
  const state: PostMediaState = {
    images: Array(8).fill(null), preview: null,
    imageProcessing: createImageState(ids),
  };
  const image = { fileId: crypto.randomUUID(), url: 'https://local/3', width: '1', height: '1' };
  const event: ImageEvent = {
    eventId: crypto.randomUUID(), consumer: 'MAIN', type: 'post.image.updated.v1',
    data: { postId: crypto.randomUUID(), imageId: ids[2], index: 2,
      revision: 1, status: 'READY', attempts: 1, error: null, image, preview: null },
  };
  const next = applyImageEvent(state, event);
  expect(next.images).toEqual([null, null, image, null, null, null, null, null]);
  expect(applyImageEvent(next, event)).toEqual(next);
  expect(state.images).toEqual(Array(8).fill(null));
});
```

- [ ] **Step 2: Запустить `pnpm exec jest --runInBand --runTestsByPath libs/contracts/post-image.contract.spec.ts libs/contracts/post-image-state.spec.ts`.** Ожидается FAIL: функции отсутствуют.
- [ ] **Step 3: Реализовать чистые переходы и строгий валидатор.** `createImageState` создаёт QUEUED/attempts=0/revision=0/dispatchPending=true и deadline now+15s. Для детерминированного теста использовать fake clock. Границы: total 1..8, index 0..total-1, attempt 1..3, UUID postId/imageId, Buffer длиной 1..5MiB, size=body.length, image MIME, version=1. Не доверять типизированным headers: проверять runtime типы, конечные целые числа и длину originalName ≤255 байт.

```ts
// Начало applyImageEvent; оставшаяся ветка заменяет только нужную позицию.
const d = event.data;
const slot = state.imageProcessing[d.index];
if (!slot || slot.imageId !== d.imageId) throw new Error('IMAGE_ID_MISMATCH');
if (d.revision <= slot.revision || slot.status === 'READY') return state;
if (d.status === 'READY' && (!d.image || (d.index === 0 && !d.preview))) {
  throw new Error('INVALID_READY_EVENT');
}
const images = [...state.images];
images[d.index] = d.status === 'READY' ? d.image : null;
const imageProcessing = state.imageProcessing.map((s, i) => i !== d.index ? s : {
  ...s, status: d.status, attempts: d.attempts, error: d.error,
  revision: d.revision, dispatchPending: false,
});
return { images, imageProcessing,
  preview: d.index === 0 ? d.preview : state.preview };
```

FAILED требует ненулевой error; остальные статусы имеют error=null. FAILED от dispatch с revision=0 разрешает более поздний worker READY. Событие другого imageId или невалидное READY нельзя применять/бесконечно повторять: оно будет диагностировано и завершено ERROR в Task 6.
- [ ] **Step 4: Добавить и выполнить тесты total=1/8/9, oversized body, ошибочный index, stale revision, preview первой позиции и поздний READY после dispatch failure.** Использовать `it.each([0, 9])` для недопустимого total и `expect(() => validateImageJob({...job,total})).toThrow()`; job fixture определить в самом spec с Buffer.from([1]), UUID и total=1. Повторить команду Step 2, ожидается PASS.
- [ ] **Step 5: Ревью diff; при разрешённых коммитах коммит `feat: define post image job contracts` с файлами только этой задачи.**

## Task 2: Бинарный транспорт с подтверждениями

**Files:**
- Create `libs/rabbitmq/post-image-transport.ts`
- Create `libs/rabbitmq/post-image-transport.spec.ts`

**Interfaces:**
- Consumes: ImageJob/ImageEvent Task 1, существующая зависимость amqplib.
- Produces: `PostImageTransport` с `start(): Promise<void>`, `close(): Promise<void>`, `publishJob(job: ImageJob, deadline: number): Promise<void>`, `publishRetry(job: ImageJob, deadline: number): Promise<void>`, `publishResult(event: ImageEvent, deadline: number): Promise<void>`.
- Constructor: `{ url: string; mainToFilesQueue: string; filesToMainQueue: string }`.
- `consumeJobs(handler: (job: ImageJob, delivery: Delivery) => Promise<void>): Promise<void>`; `consumeRetries(handler: (job: ImageJob, delivery: Delivery) => Promise<void>): Promise<void>` и `consumeResults(handler: (event: ImageEvent, delivery: Delivery) => Promise<void>): Promise<void>`.
- `Delivery`: `{ ack(): void; reject(): void; disconnect(): Promise<void> }`, привязан к исходному channel. При disconnect не ack на новом channel.

- [ ] **Step 1: Написать тест бинарного wire body и тест ложного успеха mandatory return.** Мокировать только amqplib channel для unit-теста; настоящий routing проверяется Task 8.

```ts
import { EventEmitter } from 'node:events';
import { connect } from 'amqplib';
import { PostImageTransport } from './post-image-transport.js';
import type { ImageJob } from '../contracts/post-image.contract.js';
jest.mock('amqplib', () => ({ connect: jest.fn() }));

it('передаёт тот же Buffer и ждёт confirm', async () => {
  const body = Buffer.alloc(5 * 1024 * 1024, 0xab);
  let confirm!: (error: Error | null) => void;
  const channel = Object.assign(new EventEmitter(), {
    assertQueue: jest.fn(async () => ({})), close: jest.fn(async () => undefined),
    sendToQueue: jest.fn((_q, _content, _options, cb) => { confirm = cb; return true; }),
  });
  const connection = Object.assign(new EventEmitter(), {
    createConfirmChannel: jest.fn(async () => channel),
    close: jest.fn(async () => undefined),
  });
  jest.mocked(connect).mockResolvedValue(connection as never);
  const transport = new PostImageTransport({ url: 'amqp://local',
    mainToFilesQueue: 'jobs', filesToMainQueue: 'results' });
  await transport.start();
  const job: ImageJob = { version: 1, postId: crypto.randomUUID(), imageId: crypto.randomUUID(),
    index: 0, total: 1, originalName: 'x.png', mimeType: 'image/png', size: body.length,
    attempt: 1, notBefore: 0, body };
  let settled = false;
  const promise = transport.publishJob(job, Date.now()+15000).then(() => { settled = true; });
  await Promise.resolve();
  expect(channel.sendToQueue.mock.calls[0][1]).toBe(body);
  expect(settled).toBe(false);
  confirm(null);
  await promise;
  expect(settled).toBe(true);
  await transport.close();
});
```

Consumers открываются лениво при consumeJobs/consumeRetries/consumeResults; start открывает connection/confirm publisher и topology. Отдельный тест return использует тот же fixture: после publish получить options.messageId из mock.calls, вызвать `channel.emit('return', {properties:{messageId}})`, затем confirm(null); `await expect(promise).rejects.toThrow('UNROUTABLE_MESSAGE')`.
- [ ] **Step 2: Запустить `pnpm exec jest --runInBand --runTestsByPath libs/rabbitmq/post-image-transport.spec.ts`; ожидается FAIL до реализации.**
- [ ] **Step 3: Реализовать отдельные очереди и подтверждённую отправку.**

```ts
const jobs = `${config.mainToFilesQueue}.post-images.v1`;
const retry = `${config.mainToFilesQueue}.post-images.retry.v1`;
const results = `${config.filesToMainQueue}.post-images.results.v1`;
await channel.assertQueue(jobs, { durable: true,
  arguments: { 'x-single-active-consumer': true } });
await channel.assertQueue(retry, { durable: true,
  arguments: { 'x-single-active-consumer': true } });
await channel.assertQueue(results, { durable: true });
// На отдельном consumer channel:
await consumerChannel.prefetch(1);
// body отправляется напрямую; заголовки перечислить явно, body в headers не включать.
const options = {
  persistent: true, mandatory: true, messageId: crypto.randomUUID(),
  correlationId: job.imageId, contentType: job.mimeType,
  type: 'post.image.process.v1', headers: {
    version: 1, postId: job.postId, imageId: job.imageId, index: job.index,
    total: job.total, originalName: job.originalName, size: job.size,
    attempt: job.attempt, notBefore: job.notBefore,
  },
};
```

Publisher callback (не boolean результата sendToQueue) завершает confirm promise. Сопоставлять return по уникальному messageId конкретной отправки; стабильный imageId остаётся в correlationId/headers. Учитывать deadline, `error`, `close`, `return`; очищать listeners/timer во всех исходах. При sendToQueue=false не отправлять следующий body до drain. Не ставить большой набор байтов в offline memory queue: недоступный транспорт немедленно отклоняет публикацию. Reconnect восстанавливает очереди/channels/consumers с backoff, не повторяет неизвестную отправку самостоятельно. Закрытие invalidates старые delivery callbacks и отменяет retry timers.
- [ ] **Step 4: Добавить unit проверки close-before-confirm, timeout, returned+confirmed, false/drain и shutdown без reconnect.** Команда Step 2 должна PASS. Проверить installed typings: package.json amqplib и @types имеют разные major; не менять версии без обнаруженной необходимости.
- [ ] **Step 5: Ревью; разрешённый коммит `feat: add binary image queue transport`.**

## Task 3: Пост с null-позициями и надёжное состояние отправки

**Files:**
- Modify `apps/main/prisma/schema.prisma`
- Create `apps/main/prisma/migrations/20260906120000_add_post_image_processing/migration.sql`
- Create `apps/main/src/core/events/post-image-state.repository.ts`
- Create `apps/main/src/core/events/post-image-dispatch.service.ts`
- Create `apps/main/src/core/events/post-image-dispatch.service.spec.ts`
- Modify `apps/main/src/core/events/events.module.ts`
- Modify `apps/main/src/modules/user-accounts/application/use-cases/posts-use-cases/create-post.use.case.ts`
- Create `apps/main/src/modules/user-accounts/application/use-cases/posts-use-cases/create-post.use.case.spec.ts`

**Interfaces:**
- Consumes: Task 1 ImageState; Task 2 publishJob.
- Produces: `PostImageDispatchService.dispatch(postId: string, imageIds: string[], files: Express.Multer.File[]): Promise<void>`.
- `PostImageStateRepository.markDispatched(postId: string, imageId: string): Promise<void>`; `markDispatchFailed(postId: string, imageIds: string[], traceId: string): Promise<void>`; `expireDispatches(now: Date): Promise<void>`.
- Все repo изменения позиции используют транзакцию и Post row lock; не перезаписывают более свежие worker состояния.

- [ ] **Step 1: Failing test — 8 позиций создаются до первого publish, ошибка пятой отправки не удаляет пост.**

```ts
it('сохраняет пост и отмечает позиции 4..7 при обрыве пятой отправки', async () => {
  const publishJob = jest.fn().mockResolvedValue(undefined);
  publishJob.mockImplementationOnce(async () => undefined)
    .mockImplementationOnce(async () => undefined)
    .mockImplementationOnce(async () => undefined)
    .mockImplementationOnce(async () => undefined)
    .mockRejectedValueOnce(new Error('CONNECTION_CLOSED'));
  const repo = { markDispatched: jest.fn(), markDispatchFailed: jest.fn() };
  const ids = Array.from({ length: 8 }, () => crypto.randomUUID());
  const files = ids.map(() => ({ buffer: Buffer.from([1]), size: 1,
    mimetype: 'image/png', originalname: 'x.png' } as Express.Multer.File));
  const service = new PostImageDispatchService({ publishJob } as never, repo as never);
  await service.dispatch('post-id', ids, files);
  expect(publishJob).toHaveBeenCalledTimes(5);
  expect(repo.markDispatchFailed).toHaveBeenCalledWith('post-id', ids.slice(4), expect.any(String));
});
```

- [ ] **Step 2: Запустить два целевых spec через `pnpm exec jest --runInBand --runTestsByPath` с путями Files.** Ожидается FAIL отсутствующих классов/нового create payload.
- [ ] **Step 3: Добавить schema/migration и изменить создание.**

```prisma
// В model Post:
imageProcessing Json? @map("image_processing") @db.JsonB
```

```sql
ALTER TABLE "Post" ADD COLUMN "image_processing" JSONB;
```

```ts
const imageIds = command.files.map(() => crypto.randomUUID());
const post = await this.postRepository.createPost({
  description: command.description,
  images: Array(command.files.length).fill(null),
  preview: Prisma.JsonNull,
  imageProcessing: createImageState(imageIds) as unknown as Prisma.InputJsonValue,
  mediaStatus: MediaStatus.PROCESSING,
  locations: command.locations as unknown as Prisma.InputJsonValue,
  userId: command.userId,
});
this.sse.emit(SseEventEnum.POST_CREATED, { postId: post.id });
await this.dispatch.dispatch(post.id, imageIds, command.files);
return { postId: post.id };
```

До создания сохранить валидацию минимум 1, добавить максимум 8 и проверку size/body/MIME в use-case (не только interceptor). `dispatch` последовательно публикует job attempt=1/notBefore=0 с общим deadline; после confirm вызывает markDispatched. При error сохраняет dispatch failure для текущей и оставшихся позиций и заканчивает. DB error нельзя глотать: вернуть ошибку запроса, пост не удалять; recovery доведёт состояния. Main create больше не inject-ит FilesTcpClient. EventsModule экспортирует dispatch; transport provider создаётся из существующего ConfigService без импорта RabbitMqModule обратно.
- [ ] **Step 4: Реализовать recovery каждые 10 секунд с guarded async timer и остановкой при shutdown.** Выбирать посты с новым JSON и просроченными dispatchPending, повторно проверять под row lock; только revision=0/QUEUED получает FAILED `IMAGE_DISPATCH_FAILED`. Confirmed slots не expire-ить. READY/PROCESSING worker не затирать. SQL row lock использовать Prisma tagged `$queryRaw`, не строковую интерполяцию.

```ts
await tx.$queryRaw`SELECT id FROM "Post" WHERE id = ${postId}::uuid FOR UPDATE`;
```

- [ ] **Step 5: Запустить `pnpm exec prisma generate --config apps/main/prisma.config.ts`, затем целевые тесты.** Не применять migration к окружению из реальных env; проверка SQL — Task 8 на disposable Postgres. Добавить тест DB-write-after-confirm race с worker READY и restart expiry.
- [ ] **Step 6: Ревью; разрешённый коммит `feat: enqueue individual post images`.**

## Task 4: Идемпотентная обработка одной картинки и превью

**Files:**
- Create `apps/files/src/modules/files/schemas/post-image-job.schema.ts`
- Create `apps/files/src/modules/files/application/post-image-job.repository.ts`
- Create `apps/files/src/modules/files/application/post-image-worker.service.ts`
- Create `apps/files/src/modules/files/application/post-image-worker.service.spec.ts`
- Modify `apps/files/src/modules/files/application/files.service.ts`
- Modify `apps/files/src/modules/files/files.module.ts`

**Interfaces:**
- Consumes: ImageJob, ImageEvent, существующие FilesService/ImageProcessingService/S3Adapter/FileMapper.
- Produces: `PostImageWorkerService.process(job: ImageJob): Promise<'DONE' | 'RETRY'>`.
- `FilesService.saveFileIdempotent(file: UploadFileContract, type: FileType, fileId: string): Promise<FileDocument>`.
- `PostImageJobRepository.begin(job: ImageJob): Promise<{ terminal: boolean; attempts: number; fileId: string; previewFileId: string; retryAt: number }>`; `finish(job: ImageJob, image: MediaFile, preview: MediaFile|null): Promise<void>`; `failAttempt(job: ImageJob, error: Error): Promise<'DONE'|'RETRY'>`.
- `get(imageId: string): Promise<PostImageJobDocument|null>`; документ содержит postId/index, attempts, state, retryAt, revision, стабильные IDs, terminal result, attemptErrors и pendingEvent.

- [ ] **Step 1: Написать failing test preview и неизрасходования попыток при повторной доставке terminal job.**

```ts
it('сначала сохраняет изображение, затем preview, и лишь потом завершает job', async () => {
  const order: string[] = [];
  const files = { saveFileIdempotent: jest.fn(async (_file, type) => {
    order.push(type); return { fileId: type, key: type, width: 1, height: 1 };
  }) };
  const jobs = {
    begin: jest.fn(async () => ({ terminal: false, attempts: 1, fileId: 'image', previewFileId: 'preview', retryAt: 0 })),
    finish: jest.fn(async () => { order.push('finish'); }),
  };
  const worker = new PostImageWorkerService(jobs as never, files as never,
    { getUrl: (key: string) => `https://local/${key}` } as never);
  const job: ImageJob = { version: 1, postId: crypto.randomUUID(), imageId: crypto.randomUUID(),
    index: 0, total: 1, originalName: 'x.png', mimeType: 'image/png', size: 1,
    attempt: 1, notBefore: 0, body: Buffer.from([1]) };
  expect(await worker.process(job)).toBe('DONE');
  expect(order).toEqual(['POST', 'POST_PREVIEW', 'finish']);
});
```

Значения POST/POST_PREVIEW сверены с существующим enum FileType.
- [ ] **Step 2: Запустить `pnpm exec jest --runInBand --runTestsByPath apps/files/src/modules/files/application/post-image-worker.service.spec.ts`.** Ожидается FAIL.
- [ ] **Step 3: Добавить Mongo schema и атомарные переходы.** Один unique index imageId; stable UUID fileId/previewFileId создаются через `$setOnInsert`. begin проверяет postId/index/total совпадение, terminal, attempt/retryAt, только затем увеличивает attempts. Каждая начатая попытка получает PROCESSING и revision+1. finish одним update сохраняет READY и полный pendingEvent. failAttempt при attempts<3 сохраняет QUEUED/retryAt, иначе FAILED с error.code=`IMAGE_PROCESSING_FAILED`, traceId=`imageId`, attempts=3. Подробности Error сохраняются в attemptErrors, bytes не логируются.

```ts
// Atomic terminal state + outbox in the SAME document.
await this.jobs.updateOne({ imageId: job.imageId, state: 'PROCESSING' }, {
  $set: { state: 'READY', image, preview, pendingEvent: event, retryAt: 0 },
  $inc: { revision: 1 },
});
```

event.data.revision должен совпасть с сохранённой revision: читать текущую job и использовать compare-and-set фильтр по revision, повторять при несовпадении; не вычислять event revision отдельно от ожидаемого update. Задачи старой попытки при RETRY не запускают processor до retryAt; очередь Task 5 перенаправляет их в retry.
- [ ] **Step 4: Добавить saveFileIdempotent, не менять существующий saveFile.**

```ts
const existing = await this.fileModel.findOne({ fileId }).exec();
if (existing) return existing;
const processed = await this.imageProcessing.process(file, type);
const key = `files/${type}/${fileId}.${processed.format}`;
await this.s3.uploadFile(key, processed.buffer, processed.format);
return this.fileModel.findOneAndUpdate({ fileId }, { $setOnInsert: {
  fileId, type, originalName: file.originalName, key, size: processed.size,
  width: processed.width, height: processed.height, format: processed.format,
}}, { upsert: true, returnDocument: 'after' }).exec();
```

При повторе после S3 upload/Mongo failure используется тот же key. В существующей File schema fileId уже объявлен unique/index. На локальной Mongo проверить фактическое наличие индекса; новые schema-поля или переиндексация старых файлов не нужны.
- [ ] **Step 5: Добавить тесты index>0 без preview, preview failure повторно использует image, terminal duplicate не вызывает sharp, persisted attempt=3 не вызывает четвёртую обработку.** Повторить Step 2 до PASS. Ошибки Mongo не считать failed image attempt: bubble к queue consumer, который disconnect без ack.
- [ ] **Step 6: Ревью; разрешённый коммит `feat: process post images idempotently`.**

## Task 5: Последовательный consumer, повторы и relay результатов

**Files:**
- Create `apps/files/src/modules/files/application/post-image-queue.service.ts`
- Create `apps/files/src/modules/files/application/post-image-result-relay.service.ts`
- Create `apps/files/src/modules/files/application/post-image-queue.service.spec.ts`
- Create `apps/files/src/modules/files/application/post-image-result-relay.service.spec.ts`
- Modify `apps/files/src/modules/files/files.module.ts`
- Modify `apps/files/src/modules/files/application/post-image-job.repository.ts`

**Interfaces:**
- Consumes: PostImageTransport, PostImageWorkerService, PostImageJobRepository.
- Produces: lifecycle-managed consumers и relay; `PostImageJobRepository.pending(limit: number): Promise<PostImageJobDocument[]>`; `clearPending(imageId: string, eventId: string): Promise<void>`.

- [ ] **Step 1: Failing test порядка retry-confirm → ack и запрета ack при ошибке confirm.**

```ts
it('не ack исходное сообщение до сохранения его повтора в брокере', async () => {
  const calls: string[] = [];
  let release!: () => void;
  const confirmed = new Promise<void>(r => { release = r; });
  const transport = { publishRetry: jest.fn(async () => { await confirmed; calls.push('confirm'); }) };
  const delivery = { ack: () => calls.push('ack'), disconnect: jest.fn(), reject: jest.fn() };
  const job: ImageJob = { version: 1, postId: crypto.randomUUID(), imageId: crypto.randomUUID(),
    index: 0, total: 1, originalName: 'x.png', mimeType: 'image/png', size: 1,
    attempt: 1, notBefore: 0, body: Buffer.from([1]) };
  const worker = { process: jest.fn(async () => 'RETRY') };
  const jobs = { get: jest.fn(async () => ({ attempts: 1, retryAt: Date.now()+10000, state: 'QUEUED' })) };
  const service = new PostImageQueueService(transport as never, worker as never, jobs as never);
  const handling = service.handle(job, delivery);
  await Promise.resolve();
  await Promise.resolve();
  expect(calls).toEqual([]); release(); await handling;
  expect(calls).toEqual(['confirm', 'ack']);
});
```

Публичный `PostImageQueueService.handle(job: ImageJob, delivery: Delivery): Promise<void>` использует worker/repository/transport из constructor. В этом fixture repository возвращает состояние после завершённой попытки; начальная проверка не должна принять текущее delivery за устаревшее.
- [ ] **Step 2: Запустить `pnpm exec jest --runInBand --runTestsByPath apps/files/src/modules/files/application/post-image-queue.service.spec.ts apps/files/src/modules/files/application/post-image-result-relay.service.spec.ts`.** Ожидается FAIL отсутствующего consumer.
- [ ] **Step 3: Реализовать consumer и retry forwarder.**

```ts
const outcome = await this.worker.process(job);
if (outcome === 'RETRY') {
  const state = await this.jobs.get(job.imageId);
  await this.transport.publishRetry({ ...job,
    attempt: state!.attempts + 1, notBefore: state!.retryAt,
  }, Date.now() + 15_000);
}
delivery.ack();
```

До process проверять Mongo state для старого retry delivery: terminal → ack; WAIT/QUEUED и notBefore в будущем → confirmed retry handoff без увеличения attempts; stale attempt меньше current → не выполнять sharp, продолжить только необходимое восстановление текущего retry/terminal. Повтор после process crash в PROCESSING считается следующей попыткой; после третьей записать FAILED без четвёртого вызова. Один process mutex дополнительно защищает короткое перекрытие старого callback с reconnect; не запускать новый processor, пока старый не завершился. Гарантия по нескольким репликам: single-active-consumer; сетевое переключение при живом старом процессе требует дополнительной lease/fencing и здесь не обещается — запускать одну реплику files для нового потока.

Retry consumer ждёт `max(0, job.notBefore-Date.now())` отменяемым timer, затем `publishJob(job, now+15000)`, затем ack; основной consumer продолжает работать. Если queue publish/DB недоступны — close delivery channel и reconnect/backoff, без ack и без tight nack/requeue. Валидация повреждённых headers — terminal diagnostic при известных UUID, иначе reject и structured log.
- [ ] **Step 4: Реализовать outbox relay каждые 1 секунду, без concurrent loop.**

```ts
for (const job of await this.jobs.pending(20)) {
  const event = job.pendingEvent!;
  await this.transport.publishResult(event, Date.now() + 15_000);
  await this.jobs.clearPending(job.imageId, event.eventId);
}
// clearPending фильтрует imageId И pendingEvent.eventId,
// поэтому confirm старого события не стирает новое.
```

После падения между confirm/clear отправится тот же eventId. Publish error не меняет attempts обработки. Guarded interval ловит rejection, пишет короткую ошибку, повторяет позднее; shutdown очищает timer и ожидает/отменяет in-flight loop.
- [ ] **Step 5: Fake-clock тесты: 3 попытки, delay=10000, другая картинка во время delay, confirm failure, pendingEvent заменён во время relay.** Повторить Step 2 до PASS.
- [ ] **Step 6: Ревью; разрешённый коммит `feat: retry and relay image jobs`.**

## Task 6: Применение событий в main без TCP подтверждения

**Files:**
- Create `apps/main/src/core/events/post-image-result-consumer.service.ts`
- Modify `apps/main/src/core/events/post-media-events.service.ts`
- Modify `apps/main/src/core/events/post-image-state.repository.ts`
- Modify `apps/main/src/core/events/events.module.ts`
- Create `apps/main/src/core/events/post-image-result-consumer.service.spec.ts`
- Create `apps/main/src/core/events/post-image-state.repository.spec.ts`
- Create `apps/main/src/core/events/post-image-cleanup.service.ts`

**Interfaces:**
- Consumes: ImageEvent, existing Prisma InputEvent/OutputEvent, SseService.
- Produces: `PostImageStateRepository.apply(event: ImageEvent, inputEventId: string): Promise<{ changed: boolean; postId: string }>`.
- `PostImageCleanupService.runPending(): Promise<void>` обрабатывает OutputEvent type=`post.image.cleanup.v1`, data=`{images: MediaFile[], preview: MediaFile|null}`, вызывая существующий FilesTcpClient.deletePostMedia, с persistent retries.

- [ ] **Step 1: Написать failing tests inbox-before-ack и duplicate/stale event без SSE.**

```ts
it('не подтверждает результат, если durable inbox не записан', async () => {
  const accept = jest.fn().mockRejectedValue(new Error('DB_UNAVAILABLE'));
  const delivery = { ack: jest.fn(), disconnect: jest.fn(), reject: jest.fn() };
  const consumer = new PostImageResultConsumerService({ accept } as never);
  await consumer.handle({ eventId: crypto.randomUUID() } as ImageEvent, delivery);
  expect(delivery.ack).not.toHaveBeenCalled();
  expect(delivery.disconnect).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Запустить целевые spec Task 6 через `pnpm exec jest --runInBand --runTestsByPath`; ожидается FAIL.**
- [ ] **Step 3: Расширить MediaEvent union и разделить legacy/new ветки processPending.**

```ts
if (event.type === 'post.image.updated.v1') {
  const result = await this.images.apply(event as ImageEvent, event.id);
  if (result.changed) this.sse.emit(SseEventEnum.POST_MEDIA_UPDATED, { postId: result.postId });
  continue;
}
// Существующие applyMediaEvent + files.acknowledge оставляются только legacy.
```

Inbox row не является ImageEvent буквально: передать `{eventId:event.eventId,consumer:'MAIN',type:event.type,data:event.data}` после runtime validation; event.id — отдельный DB id. `apply` начинает Prisma transaction, row-lock Post, читает актуальное JSON, вызывает pure reducer Task 1, обновляет Post и InputEvent.status=OK в той же transaction. Aggregate status вычисляется из всех slots. SSE вызывается после commit и только при изменении состояния. При duplicate не увеличивать revision/attempts, не менять updatedAt поста. Stale PROCESSING InputEvent новой ветки requeue-ить вместо текущего permanent ERROR; legacy policy оставить.
- [ ] **Step 4: Реализовать удалённый пост и cleanup без зависания inbox.**

```ts
// В той же transaction при отсутствии Post:
await tx.outputEvent.upsert({
  where: { eventId: event.eventId },
  create: { eventId: event.eventId, consumer: 'FILES', type: 'post.image.cleanup.v1',
    data: { images: event.data.image ? [event.data.image] : [], preview: event.data.preview } },
  update: {},
});
await tx.inputEvent.update({ where: { id: inputEventId }, data: { status: 'OK' } });
```

Cleanup timer (10s) выбирает только свой event type, atomic claim через status, вызывает deletePostMedia, завершает OK; при ошибке возвращает UNPROCESSED/nextAttemptAt через 10s. Восстанавливает собственные stale PROCESSING claims через 10 минут. Повтор удаления уже отсутствующего файла считается успешным существующим use-case. Ошибка формата event/несоответствие imageId → InputEvent ERROR с кодом, без бесконечного retry и без изменения поста.
- [ ] **Step 5: Тесты: две разные позиции одновременно (реальная БД Task 8), повтор eventId, более старый revision, dispatch failure → READY, deleted post → cleanup, отсутствие TCP acknowledge для v1.** Повторить Step 2 до PASS.
- [ ] **Step 6: Ревью; разрешённый коммит `feat: apply individual image results`.**

## Task 7: Публичный ответ, SSE и совместимость

**Files:**
- Modify `apps/main/src/modules/user-accounts/api/view-types/posts/post-view.type.ts`
- Modify `apps/main/src/modules/user-accounts/api/mappers/posts.mapper.ts`
- Create `apps/main/src/modules/user-accounts/api/mappers/posts.mapper.spec.ts`
- Modify `apps/main/src/core/sse/types/sse-event.type.ts`
- Modify `apps/main/src/core/swagger/posts-dto/get-posts.swagger.ts`
- Modify `apps/main/src/core/swagger/posts-dto/create-post.swagger.ts`
- Modify `apps/main/src/core/swagger/sse-dto/sse-events.swagger.ts`
- Modify `README.md`

**Interfaces:**
- Consumes: Post.imageProcessing и внутренние ImageState.
- Produces: `images: (FileType|null)[]`, `preview: FileType|null`, `imageProcessing: {imageId:string;status:ImageStatus;attempts:number;error:ImageError|null}[]`; `SseEventEnum.POST_MEDIA_UPDATED='post-media-updated'`.

- [ ] **Step 1: Failing mapper test exact null-array и отсутствие внутренних полей.**

```ts
it('возвращает явные null и только публичные поля обработки', () => {
  const result = PostsMapper.toView({ id: 'p', description: '', images: [null], preview: null,
    imageProcessing: [{ imageId: 'i', status: 'QUEUED', attempts: 0, error: null,
      revision: 0, dispatchPending: true, dispatchDeadline: '2026-09-06T00:00:00Z' }],
    createdAt: new Date('2026-09-06T00:00:00Z'), willBeDeleted: null } as never);
  expect(result.images).toEqual([null]);
  expect(result.preview).toBeNull();
  expect(result.imageProcessing).toEqual([{ imageId: 'i', status: 'QUEUED', attempts: 0, error: null }]);
});
```

- [ ] **Step 2: `pnpm exec jest --runInBand --runTestsByPath apps/main/src/modules/user-accounts/api/mappers/posts.mapper.spec.ts` → FAIL.**
- [ ] **Step 3: Обновить тип и mapper, явно перечисляя публичные поля.** Для старых постов с NULL imageProcessing построить READY states из существующих fileId; не придумывать отсутствующие изображения старых PROCESSING posts. Для старого массива [] возвращать imageProcessing=[]; прежний batch event заполнит готовые изображения. Новые посты всегда используют новый массив. GET не фильтровать по mediaStatus.

```ts
const publicStates = states.map(({ imageId, status, attempts, error }) => ({
  imageId, status, attempts, error,
}));
```

- [ ] **Step 4: Обновить Swagger и README конкретным частичным ответом.** В schema массива nullable находится у items, а не только у массива; preview nullable. Документировать HTTP 201 после завершения dispatch, ошибки отдельных позиций при частичной отправке, 1..8 и 5MiB, новый SSE event, 3 attempts. Существующие URL/размеры FileType не менять.

```json
{
  "images": [null, null],
  "preview": null,
  "imageProcessing": [
    {"imageId":"550e8400-e29b-41d4-a716-446655440001","status":"QUEUED","attempts":0,"error":null},
    {"imageId":"550e8400-e29b-41d4-a716-446655440002","status":"FAILED","attempts":3,"error":{"code":"IMAGE_PROCESSING_FAILED","traceId":"550e8400-e29b-41d4-a716-446655440002"}}
  ]
}
```

- [ ] **Step 5: Повторить mapper test, дополнить legacy ready post и mixed READY/FAILED.** Smoke проверить сгенерированный OpenAPI локально: items допускают null, в SSE нет imageId/image/status, только postId. Во время интеграции передвинуть добавление enum в Task 3/6, если нужно для компиляции промежуточных коммитов; контракт строки остаётся тем же.
- [ ] **Step 6: Ревью; разрешённый коммит `feat: expose image processing progress`.**

## Task 8: Интеграционная проверка сбоев и инструкция переключения

**Files:**
- Create `test/post-images/compose.yml`
- Create `test/post-images/jest.config.json`
- Create `test/post-images/post-images.integration.spec.ts`
- Create `test/post-images/README.md`
- Create `test/post-images/prisma.config.ts`
- Modify `package.json` (только Jest testPathIgnorePatterns)
- Modify `README.md`

**Interfaces:**
- Consumes: реальные transport/worker/repositories Tasks 1–7; fixtures заменяют только S3 сетевой adapter, сохраняя детерминированные ключи. sharp обрабатывает реальный маленький PNG.
- Produces: воспроизводимая локальная проверка; не заменяет измерение производственного сервера.

- [ ] **Step 1: Создать disposable инфраструктуру и isolated Jest config.**

```yaml
services:
  rabbit:
    image: rabbitmq:4-management
    ports: ["127.0.0.1:5679:5672"]
    environment:
      RABBITMQ_DEFAULT_USER: local
      RABBITMQ_DEFAULT_PASS: local-test-only
  postgres:
    image: postgres:17
    ports: ["127.0.0.1:5441:5432"]
    environment:
      POSTGRES_USER: local
      POSTGRES_PASSWORD: local-test-only
      POSTGRES_DB: media_test
  mongo:
    image: mongo:8
    ports: ["127.0.0.1:27029:27017"]
```

Не подключать существующие production env. Для migration использовать отдельный test config, который вообще не вызывает существующий loadEnvironment:

```ts
// test/post-images/prisma.config.ts
import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '../../apps/main/prisma/schema.prisma',
  migrations: { path: '../../apps/main/prisma/migrations' },
  datasource: { url: 'postgresql://local:local-test-only@127.0.0.1:5441/media_test' },
});
```

```json
{
  "rootDir": "../..",
  "testEnvironment": "node",
  "testRegex": "post-images.integration.spec.ts$",
  "testTimeout": 60000,
  "testPathIgnorePatterns": [],
  "moduleNameMapper": {"^(\\.{1,2}/.*)\\.js$": "$1"},
  "transform": {"^.+\\.(t|j)s$": ["ts-jest", {"tsconfig": {
    "module": "commonjs", "moduleResolution": "node",
    "resolvePackageJsonExports": false, "resolvePackageJsonImports": false
  }}]}
}
```

В default Jest package.json добавить `testPathIgnorePatterns: ["/test/post-images/"]`: unit-запуск не требует Docker. Integration setup создаёт точечный TestingModule из перечисленных классов, не импортирует AppModule/loadEnvironment. PrismaClient подключается через существующий PrismaPg adapter к указанной локальной БД; Mongo `createConnection('mongodb://127.0.0.1:27029/media_test')`, Rabbit transport получает `amqp://local:local-test-only@127.0.0.1:5679`. Это исключает загрузку env приложения.
- [ ] **Step 2: Создать fixtures и failing сквозной сценарий.** Начальные пользователи создаются прямо в disposable Prisma. Создавать пост через реальный CreatePostUseCase и читать через реальный mapper/repository; отдельный HTTP smoke подтверждает interceptor max=8.

```ts
const source = await sharp({ create: { width: 16, height: 16, channels: 3,
  background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
const files = Array.from({ length: 8 }, (_, i) => ({
  buffer: source, size: source.length, mimetype: 'image/png', originalname: `${i}.png`,
} as Express.Multer.File));
// Instantiate real services through TestingModule with local database configs.
// Wrap ImageProcessingService.process to count active/maxActive and gate first image.
const { postId } = await createPost.execute(new CreatePostCommand('', user.id, files));
const pending = await posts.findById(postId);
expect(pending!.images).toEqual(Array(8).fill(null));
// Release first-image gate; await database predicates with a bounded 30s deadline.
// Assert 8 READY entries, preview non-null, maxActive=1 and all SSE data keys=['postId'].
```

Тест должен блокировать worker до GET pending, иначе assertion гоняется с быстрым PNG. Fixture helper `waitFor(predicate:()=>Promise<boolean>, timeoutMs=30000):Promise<void>` опрашивает каждые 50ms, на timeout бросает Error с последним состоянием без bytes/credentials. Все созданные соединения закрываются в afterAll.
- [ ] **Step 3: Запустить локальные services, применить migration к disposable DB и выполнить integration config.**

```bash
docker compose -p post-images-local -f test/post-images/compose.yml up -d
pnpm exec jest --config test/post-images/jest.config.json --runInBand
```

Перед Jest выполнить `pnpm exec prisma migrate deploy --config test/post-images/prisma.config.ts` (явно локальный datasource, без env приложения). Readiness проверяется ограниченными retry подключениями (60s), не фиксированным sleep. Если Docker недоступен — явно записать блокировку integration, не выдавать unit за сквозную проверку.
- [ ] **Step 4: Добавить crash matrix как отдельные executable test cases.**

| Инъекция сбоя | Конкретное ожидаемое доказательство |
|---|---|
| Пятая отправка закрывает publisher channel | Пост существует; четыре принятые обрабатываются; остальные null/FAILED |
| Закрытие main после create до publish | Recovery отмечает expired dispatch; ни один неподтверждённый slot не висит QUEUED |
| S3 upload завершён, Mongo file save падает один раз | Повтор использует тот же key/fileId; один итоговый файл на variant |
| Первая картинка сохранена, preview падает два раза | Три попытки; исходный image не дублируется; READY только с preview |
| Worker crash после attempts increment | Redelivery учтена; максимум три начатых попытки |
| Crash после terminal Mongo write до AMQP ack | Повтор не запускает sharp; terminal событие доставлено |
| Crash после retry confirm до ack | Дубликат не запускает лишнюю обработку/четвёртую попытку |
| Result publish confirm потерян | Повтор eventId не меняет массив/attempts второй раз |
| Два события разных позиций одновременно | Обе позиции сохранены: row lock предотвращает lost update |
| READY приходит раньше старого QUEUED | READY сохранён, stale событие завершено |
| Пост удалён до результата | Inbox завершается; cleanup удаляет поздние файлы |
| RabbitMQ restart, данные контейнера сохранены | Persistent accepted jobs продолжаются; transient connections восстановлены |
| 9 картинок / >5MiB | HTTP reject до создания поста/публикации |

Для process-crash проверок запускать worker fixture в дочернем процессе и SIGKILL только его, с handshake точками через IPC. Для broker restart использовать `docker compose ... restart rabbit` (не удаление контейнера). Не утверждать crash safety только по mocked исключениям.
- [ ] **Step 5: Выполнить итоговые проверки.**

```bash
pnpm exec jest --runInBand
pnpm run build:main
pnpm run build:files
pnpm exec prettier --check libs/contracts/post-image*.ts libs/rabbitmq/post-image-transport*.ts
```

Также prettier по всем реально изменённым TS/MD файлам явным списком. Не запускать `pnpm lint` без учёта того, что он содержит `--fix` и может затронуть WIP. Проверить `git diff --check`. Замерить в integration: byteLength каждой binary публикации=source.length, maxActive processor=1, heap/RSS до/после серии постов (не выдавать это за production benchmark). Main всё ещё принимает до 40MiB исходных buffers на запрос; RabbitMQ не устраняет этот расход, это граница текущего scope.
- [ ] **Step 6: Записать rollout checklist в README.** Сначала main с nullable API/new result reader, затем files consumer, затем включение нового producer в согласованном окне. Для надёжного переключения добавить env `POST_IMAGE_RMQ_ENABLED` default=false на main и files: main выбирает старый/new create path, files запускает новые consumers только при true; result reader main может работать до переключения. Перед включением files нового consumer дренировать старые GridFS jobs. Фронт должен понимать nullable slots и SSE до включения main producer. Проверить broker disk persistence, размер сообщения ≥5MiB, queue permissions, свободный диск, одну files replica. Не менять broker политики вслепую. Rollback: прекратить новые binary submissions флагом main, оставить result reader и files worker до drain; не удалять queues/migration/источники.
- [ ] **Step 7: Ревью; разрешённый коммит `test: verify image queue recovery`.** Остановить только test compose командой `docker compose -p post-images-local -f test/post-images/compose.yml down`; серверные контейнеры не трогать.

## Дополнение к порядку внедрения

Флаг `POST_IMAGE_RMQ_ENABLED` из Task 8 реализовать при wiring Task 3 и Task 5, не откладывать до тестов: обе ветки должны компилироваться и иметь отдельные тесты. При false существующий CreatePostUseCase flow остаётся доступен в выделенном private method с прежними контрактами; при true используется новый. Существующий legacy worker после drain оставлять совместимым, но не подавать в него новые посты. Enum SSE из Task 7 добавляется при первом использовании Task 3/6. package.json testPathIgnorePatterns входит в Files Task 8.

## Самопроверка плана

- Все согласованные решения покрыты: 8/5MiB и binary — Tasks 1–3; null/status/debug — Tasks 1/3/6/7; последовательность/3 attempts — Tasks 4/5; preview — Task 4; partial dispatch — Task 3; SSE postId — Tasks 6/7; duplicate/crash recovery — Tasks 2/4/5/6/8.
- Наличие legacy path и обработка старых постов описаны; никаких backfill по неизвестному числу старых исходников.
- Технические значения (10s retry, 15s dispatch, имя нового SSE и queue suffixes) явно отмечены как решения плана.
- Все новые интерфейсы перечислены в задачах; новые зависимости не требуются.
- Ограничения честные: слабый main продолжает буферизовать multipart; один экземпляр files; broker storage нужен для durability; HTTP response до processing, но после dispatch; SSE не является durable журналом.

## Документация для исполнителя

- [RabbitMQ consumer acknowledgements и confirms](https://www.rabbitmq.com/docs/confirms).
- [RabbitMQ consumer prefetch](https://www.rabbitmq.com/docs/consumer-prefetch).
- [amqplib channel API](https://amqp-node.github.io/amqplib/channel_api.html).
- Перед реализацией библиотечных вызовов уточнить установленную версию и актуальную документацию через Context7, особенно raw binary transport/confirm channel: стандартный Nest ClientProxy сериализует свой event envelope и не используется для бинарных заданий.

## Передача в исполнение

План и спецификация создаются для ревью; выполнение кода ещё не начато. Следующий шаг по запросу пользователя — `executing-plans` в текущей сессии с проверками после задач. Работа отдельными агентами возможна только после явного выбора пользователя; `subagent-driven-development` в списке доступных скиллов отсутствует, поэтому такой маршрут не является обязательным.
