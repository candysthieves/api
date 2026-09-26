# User Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Выполнять в текущей сессии; commit/push только по отдельному запросу пользователя.

**Goal:** Реализовать PUT аватара с durable inbox/outbox, SSE после сохранения и ежедневной очисткой неактуальных файлов.

**Architecture:** Существующие PostgreSQL/MongoDB event stores обрабатывают посты и аватары через единые scheduler с маршрутизацией по type. RabbitMQ доставляет исходник и результат, User хранит актуальную пару, TCP обслуживает периодическую очистку.

**Tech Stack:** NestJS CQRS, Prisma/PostgreSQL, Mongoose/MongoDB, @golevelup/nestjs-rabbitmq, Sharp, S3, Jest, pnpm, TypeScript ESM.

**Spec:** `docs/superpowers/specs/2026-09-26-user-avatar-design.md`.

## Global Constraints

- PUT: JPEG/PNG ≤ `10 * 1024 * 1024` байт; поле file; `201 { userId }`.
- SSE: `avatar-updated`, data `{ userId }`, только после сохранения пары.
- Без DELETE, транзакций, новых jobs, защиты от гонки и защиты pending-файлов при очистке.
- Очистка раз в 24 часа; удаляются только неактуальные файлы старше 24 часов.
- ESM: относительные импорты с .js, новые сценарии с .usecase.ts, существующий формат DomainExceptions.
- Зависимости не обновлять, чужой WIP сохранять. Prisma client вручную не редактировать.
- Не тестировать межсервисную доставку и простое делегирование TCP/RabbitMQ; зависимости подменять в тестах сценариев.

## 1. Подготовка и схема User

**Files:** modify `apps/main/prisma/schema.prisma`, `apps/main/src/core/types/prisma/json-types.ts`; create `apps/main/prisma/migrations/20260926000000_user_avatar/migration.sql`.

- [ ] Проверить текущую ветку и git status. Непроиндексированные JS/.map контрактов не удалять и не включать в изменение. Проверить актуальные scripts package.json и локальную конфигурацию генерации без вывода секретов.
- [ ] Добавить в User JSON-поля с типизацией:

```prisma
  /// [AvatarImage]
  avatar Json? @db.JsonB
  /// [AvatarPreview]
  avatarPreview Json? @map("avatar_preview") @db.JsonB
```

- [ ] Зарегистрировать AvatarImage/AvatarPreview в PrismaJson namespace. SQL миграции:

```sql
ALTER TABLE "User" ADD COLUMN "avatar" JSONB,
                   ADD COLUMN "avatar_preview" JSONB;
```

- [ ] Выполнить prisma:generate:local. Миграцию применять для проверки только к согласованной изолированной локальной БД. Проверить: существующий User имеет null-поля, запись обоих JSON сохраняет fileId/url/width/height.

## 2. Контракты аватара и общий маршрут событий

**Files:** create `libs/contracts/avatar-image.contract.ts`; modify `libs/contracts/index.ts`, `apps/main/src/core/events/image-outbox.service.ts`, `apps/main/src/core/events/image-result-inbox.service.ts`, `apps/files/src/events/files-inbox.repository.ts`, `apps/files/src/events/files-outbox.repository.ts`, `apps/files/src/modules/files/application/post-image-worker.service.ts`.

**Interfaces:**

```ts
export const MAX_AVATAR_IMAGE_SIZE = 10 * 1024 * 1024;
export type AvatarImageInputEvent = {
  eventId: string; userId: string; originalName: string;
  mimeType: 'image/jpeg' | 'image/png'; size: number; body: Buffer;
};
export type AvatarImageEvent = {
  eventId: string; consumer: 'MAIN'; type: 'avatar.image.updated.v1';
  data: { userId: string; image: MediaFile; preview: MediaFile };
};
```

- [ ] Добавить валидатор результата: UUID eventId/userId, consumer MAIN, точный type, оба MediaFile обязательны с положительными конечными width/height.
- [ ] Добавить локальные тесты валидатора: корректная пара принимается; отсутствующий preview, неверный userId и нулевая ширина отклоняются.
- [ ] Сохранять в Mongo inbox type для новых avatar-событий. Текущие post-записи без type продолжать читать как post. Расширить тип результата files outbox до union post/avatar.
- [ ] В существующих scheduler добавить диспетчеризацию. Не создавать второго общего runner, который будет забирать те же записи. Main outbox выбирает публикацию по сохранённому type; main inbox использует реальный event.type вместо жёстко заданного post.image.updated.v1; files worker выбирает обработчик по type.
- [ ] Неизвестный type завершать через существующую обработку ошибок, не трактовать его как пост. Проверить локальными тестами маршрутизации, что данные avatar не попадают в обработчик Post и наоборот.

## 3. Приём PUT и сохранение исходника

**Files:** modify `apps/main/src/modules/user-accounts/api/users.controller.ts`, `apps/main/src/modules/user-accounts/user-accounts.module.ts`, `apps/main/src/core/events/image-outbox.service.ts`; create `apps/main/src/modules/user-accounts/application/use-cases/users-use-cases/update-my-avatar.usecase.ts`, `apps/main/src/core/swagger/user-dto/update-my-avatar.swagger.ts`, `apps/main/src/modules/user-accounts/application/use-cases/users-use-cases/update-my-avatar.usecase.spec.ts`.

**Interfaces:** `UpdateMyAvatarCommand(userId: string, file: Express.Multer.File | undefined)`; `execute(): Promise<{ userId: string }>`; `ImageOutboxService.saveAvatar(userId: string, file: Express.Multer.File): Promise<void>`.

- [ ] Сначала добавить проверки use case: отсутствие файла, пустой buffer, неверный формат, ровно 10 МиБ, превышение на один байт, отсутствующий пользователь, сбой сохранения outbox.
- [ ] Проверить пользователя через существующий UsersRepository. Использовать Sharp metadata для фактического JPEG/PNG и читаемости изображения; ограничение HTTP interceptor не заменяет бизнес-валидацию.
- [ ] Настроить FileInterceptor('file') с memory storage и лимитом 10 МиБ. Ошибки Multer размера/лишнего файла привести к действующему HTTP-формату DomainExceptions; не допустить необработанный ответ Express/Multer.
- [ ] До HTTP успеха сохранить один OutputEvent с UUID, type avatar.image.process.v1, consumer FILES, JSON-метаданными и отдельным body. Старые поля User не изменять на этапе приёма.
- [ ] Контроллер: AccessTokenGuard, userId из JWT, CommandBus, явный HttpCode(201). Возврат только `{ userId }`.
- [ ] Swagger описывает multipart file, 10 МиБ, JPEG/PNG, авторизацию, ошибки и асинхронный смысл 201. Сообщение ошибки: `The photo must be less than 10 Mb and have JPEG or PNG format`.
- [ ] Запустить целевые тесты; убедиться, что при невалидном файле outbox не записан, а при ошибке outbox 201 не возвращается.

## 4. Доставка и обработка files

**Files:** modify оба `rabbitmq.module.ts`, оба producer service, `apps/files/src/modules/files/files.module.ts`; create `apps/files/src/modules/files/api/dto/avatar-image-input-event.dto.ts`, `apps/files/src/modules/files/application/avatar-image-queue.service.ts`, `apps/files/src/modules/files/application/avatar-image-processing.service.ts`, `apps/files/src/modules/files/application/avatar-image-processing.service.spec.ts`.

**Interfaces:** main producer `publishAvatarImage(event: AvatarImageInputEvent): Promise<void>`; files processor `processImage(record: StoredEvent): Promise<void>`; очередь вызывает сохранение через существующий FilesInboxRepository.

- [ ] Добавить очереди из текущих базовых env-переменных: `.avatar-images.v1` и `.avatar-images.results.v1`; durable настройки и raw Buffer аналогичны действующему post-потоку. RabbitMQ обслуживается только существующей библиотекой.
- [ ] Input publish использует UUID в messageId, type avatar.image.process.v1, headers userId/originalName/size, contentType, бинарное body. Результат JSON с тем же eventId; publisher confirm обязателен для OK.
- [ ] Consumer валидирует messageId, userId, MIME, размер/body.length и сохраняет inbox до ack. Невалидное сообщение Nack(false), ошибка persistence Nack(true).
- [ ] Processor сначала проверяет существование outbox по record._id, включая tombstone. Затем создаёт через FilesService AVATAR и AVATAR_PREVIEW, проверяет актуальность попытки и записывает неизменяемый результат через $setOnInsert.
- [ ] Применить существующую обработку: WebP quality 50, preview 204x204 fit inside, без серверного центрирования. Post cancellation не применять к аватарам.
- [ ] Локальные тесты: результат требует оба файла, ошибка второго файла не создаёт успешный результат, существующий outbox запрещает повторную обработку, устаревшая попытка не публикует новый результат. Транспортные тесты не добавлять.

## 5. Сохранение результата, SSE и чтение

**Files:** create `apps/main/src/core/events/avatar-images.repository.ts`, `apps/main/src/core/events/avatar-image-result-inbox.consumer.ts`, `apps/main/src/core/events/avatar-image-result-handler.service.ts`, `apps/main/src/core/events/avatar-image-result-handler.service.spec.ts`; modify `events.module.ts`, `image-result-inbox.service.ts`, `users.mapper.ts`, `get-avatar-query-handler.ts`, `users.query.repository.ts`, `posts.query.repository.ts`, `infrastructure/types/post-with-author.type.ts`, `api/mappers/posts.mapper.ts` и Swagger профиля/автора/GET аватара в существующих каталогах.

**Interfaces:** `AvatarImageResultHandlerService.apply(event: AvatarImageEvent): Promise<void>`; repository `applyAvatar(userId: string, image: MediaFile, preview: MediaFile): Promise<boolean>` возвращает true только при фактической замене пары.

- [ ] Новый consumer принимает результат, валидирует JSON/контракт и сохраняет через общий main inbox до ack. Новый handler вызывается единым scheduler по type.
- [ ] Repository обновляет avatar и avatarPreview одним запросом. Отсутствующий User и уже совпадающая пара дают false; для этого использовать условный updateMany с проверкой сохранённых fileId, а не отдельные записи каждого поля.
- [ ] После true вызвать `sse.emit(SseEventEnum.AVATAR_UPDATED, { userId })`. Ошибка БД не отправляет SSE; повтор уже применённого результата его не дублирует. Защиту от других конкурирующих загрузок не вводить.
- [ ] GET ищет текущего User по userId; убрать getUsersCount-заглушку. UsersMapper принимает User и возвращает сохранённые поля или null.
- [ ] Профиль возвращает avatar/preview User. Запросы постов выбирают avatarPreview автора, тип PostAuthor и mapper используют его. Удалить обращения к тестовым URL заглушки из этих ответов.
- [ ] Локальные тесты: ошибка оставляет прежнюю пару, успешный результат меняет оба поля, emit только после записи, повтор без SSE, отсутствующий User пропускается, чтение возвращает null или сохранённую пару.

## 6. Ежедневная очистка аватаров

**Files:** modify `unused-images-cleanup-scheduler.service.ts`, `users.repository.ts`, `files-tcp.client.ts`, files controller/module; create `libs/contracts/cleanup-unused-avatar-files.contract.ts`, `apps/files/src/modules/files/application/use-cases/cleanup-unused-avatar-files.usecase.ts`, `apps/files/src/modules/files/application/use-cases/cleanup-unused-avatar-files.usecase.spec.ts`; export контракт через index.ts.

**Interfaces:** `UsersRepository.getAllActiveAvatarFileIds(): Promise<string[]>`; TCP `cleanupUnusedAvatarFiles(activeFileIds: string[], olderThanHours = 24)`; команда cleanup-unused-avatar-files с `{ activeFileIds, olderThanHours }`; результат `{ deletedDbCount, deletedS3OrphanCount }` в существующем ObjectResult.

- [ ] Получать полный список текущих avatar/preview, дедуплицировать. Успешный пустой список допустим; сбой чтения не превращать в пустой список и не отправлять команду очистки.
- [ ] В ежедневном scheduler под существующим конфигурационным флагом запускать очистку постов и аватаров с независимой обработкой ошибок; ошибка одного прохода не блокирует другой.
- [ ] Files выбирает только типы AVATAR/AVATAR_PREVIEW, createdAt строго раньше cutoff, fileId вне activeFileIds. Сначала удалить S3, затем Mongo запись; ошибка сохраняет возможность следующего прохода.
- [ ] Проверить сироты S3 только в files/AVATAR/ и files/AVATAR_PREVIEW/, LastModified старше cutoff, без соответствующей Mongo записи. Общие вспомогательные операции извлечь только если это нужно двум cleanup-сценариям; контракт постов сохранить.
- [ ] Тесты: активный старый файл и свежий неактивный сохраняются; старый неактивный удаляется; post-файлы и другие S3-папки не затрагиваются; ошибка S3 не удаляет Mongo запись. Pending-события намеренно не проверять.

## 7. Проверки и передача

- [ ] Проверить Context7 перед применением новых API NestJS/Sharp/Prisma, если их синтаксис не подтверждён текущим кодом. Не менять зависимости.
- [ ] Запустить новые тесты по точным путям с --runInBand; проверить число выполненных тестов, поскольку passWithNoTests не доказывает покрытие.
- [ ] Выполнить `pnpm run build:main` и `pnpm run build:files`; существующие тесты event store запустить как регрессию общих dispatcher.
- [ ] Выполнить ESLint без --fix и Prettier --check только для затронутых файлов. Не запускать общий lint с --fix.
- [ ] В изолированной локальной БД проверить условную запись пары и повтор результата. Реальную инфраструктуру без согласования не использовать. HTTP-проверки подменяют event delivery, а не тестируют пересылку между сервисами.
- [ ] Проверить итоговый diff: только задача; не изменены post HTTP/AMQP-контракты и правила событий. После изменений дождаться синхронизации CodeGraph.
- [ ] Обновить документацию запуска: миграция User и генерация клиента перед стартом, обе версии сервисов поддерживают новые очереди, max upload reverse proxy допускает multipart с файлом 10 МиБ.
- [ ] Передать результат с выполненными проверками и принятыми ограничениями: гонка, pending-файлы старше суток, best-effort SSE, три попытки. Commit/push по отдельному запросу.
