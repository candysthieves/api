# Implementation Plan: Периодическая очистка неиспользуемых изображений постов

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать периодический шедулер и use-case для очистки осиротевших и неиспользуемых картинок постов (`POST`, `POST_PREVIEW`) из MongoDB и AWS S3, которые не привязаны к постам в PostgreSQL и старше 24 часов.

**Architecture:** Шедулер в `apps/main` (`UnusedImagesCleanupSchedulerService`) периодически запрашивает все используемые `fileId` из PostgreSQL и отправляет TCP-команду `cleanup-unused-post-files` в микросервис `apps/files`. `apps/files` удаляет неиспользуемые документы из MongoDB и соответствующие объекты из S3, а также сканирует S3 (`paginateListObjectsV2` из `@aws-sdk/client-s3`) для удаления файлов-сирот старше 24 часов.

**Tech Stack:** NestJS, `@nestjs/cqrs`, `@nestjs/microservices`, `@aws-sdk/client-s3`, Mongoose, Prisma (PostgreSQL), TypeScript (ESM / NodeNext), Jest.

**Spec:** `docs/superpowers/specs/2026-09-07-unused-images-cleanup-design.md`

## Global Constraints
- ESM и NodeNext: все локальные относительные импорты строго с расширением `.js`.
- Именование use case: суффикс строго `.usecase.ts` (например, `cleanup-unused-post-files.usecase.ts`).
- Не трогать git commands самовольно.
- Не трогать аватарки (`AVATAR`, `AVATAR_PREVIEW`).
- Защитный интервал: файлы моложе 24 часов удалять запрещено.

---

### Task 1: DTO и контракт в `libs/contracts`

**Files:**
- Create: `libs/contracts/src/files/cleanup-unused-post-files.contract.ts`
- Modify: `libs/contracts/index.ts`

**Interfaces:**
- Produces: `CleanupUnusedPostFilesContract` (`activeFileIds: string[]`, `olderThanHours?: number`)

- [ ] **Step 1: Создать класс контракта `CleanupUnusedPostFilesContract`**
  Создать файл `libs/contracts/src/files/cleanup-unused-post-files.contract.ts`:
  ```typescript
  import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

  export class CleanupUnusedPostFilesContract {
    @IsArray()
    @IsString({ each: true })
    activeFileIds: string[];

    @IsOptional()
    @IsInt()
    olderThanHours?: number;
  }
  ```

- [ ] **Step 2: Экспортировать контракт в `libs/contracts/index.ts`**
  Добавить экспорт:
  ```typescript
  export * from './src/files/cleanup-unused-post-files.contract.js';
  ```

---

### Task 2: Метод листинга объектов S3 в `S3Adapter` (`apps/files`)

**Files:**
- Modify: `apps/files/src/core/adapters/s3.adapter.ts`

**Interfaces:**
- Consumes: `@aws-sdk/client-s3` (`paginateListObjectsV2`, `ListObjectsV2CommandInput`)
- Produces: `listObjects(prefix: string): Promise<Array<{ key: string; lastModified?: Date }>>`

- [ ] **Step 1: Реализовать `listObjects` в `S3Adapter`**
  Импортировать `paginateListObjectsV2` из `@aws-sdk/client-s3` и добавить метод в `S3Adapter`:
  ```typescript
  async listObjects(
    prefix: string,
  ): Promise<Array<{ key: string; lastModified?: Date }>> {
    const paginator = paginateListObjectsV2(
      { client: this.s3 },
      { Bucket: this.bucket, Prefix: prefix },
    );
    const objects: Array<{ key: string; lastModified?: Date }> = [];
    for await (const page of paginator) {
      if (page.Contents) {
        for (const item of page.Contents) {
          if (item.Key) {
            objects.push({
              key: item.Key,
              lastModified: item.LastModified,
            });
          }
        }
      }
    }
    return objects;
  }
  ```

---

### Task 3: Use Case `CleanupUnusedPostFilesUseCase` в `apps/files`

**Files:**
- Create: `apps/files/src/modules/files/application/use-cases/cleanup-unused-post-files.usecase.ts`
- Create: `apps/files/src/modules/files/application/use-cases/cleanup-unused-post-files.usecase.spec.ts`
- Modify: `apps/files/src/modules/files/files.module.ts`
- Modify: `apps/files/src/modules/files/api/files.controller.ts`

**Interfaces:**
- Consumes: `CleanupUnusedPostFilesContract`, `FileDocument`, `S3Adapter`
- Produces: `CleanupUnusedPostFilesCommand`, `CleanupUnusedPostFilesUseCase`

- [ ] **Step 1: Написать unit-тест `cleanup-unused-post-files.usecase.spec.ts`**
  Протестировать сценарии:
  1. Удаление неиспользуемых постов старше 24 часов из DB и S3.
  2. Игнорирование активных `activeFileIds` и файлов моложе 24 часов.
  3. Удаление осиротевших файлов из S3, которых нет в Mongo.
- [ ] **Step 2: Реализовать `CleanupUnusedPostFilesUseCase`**
  ```typescript
  export class CleanupUnusedPostFilesCommand {
    constructor(
      public readonly activeFileIds: string[],
      public readonly olderThanHours: number = 24,
    ) {}
  }
  ```
  В `execute`:
  1. `cutoffDate = new Date(Date.now() - command.olderThanHours * 60 * 60 * 1000);`
  2. Найти неиспользуемые файлы:
     ```typescript
     const unusedDbFiles = await this.fileModel.find({
       type: { $in: [FileType.POST, FileType.POST_PREVIEW] },
       createdAt: { $lt: cutoffDate },
       fileId: { $nin: command.activeFileIds },
     });
     ```
  3. Удалить их из S3 и Mongo.
  4. Просканировать S3 (`files/POST/`, `files/POST_PREVIEW/`), отфильтровать по `lastModified < cutoffDate`.
     Для каждого проверить: `await this.fileModel.exists({ key: obj.key })`. Если `null`, вызвать `await this.s3.deleteFile(obj.key)`.
  5. Вернуть `ObjectResult.success({ deletedDbCount, deletedS3OrphanCount })`.
- [ ] **Step 3: Зарегистрировать UseCase в `FilesModule` и добавить обработчик в `FilesController`**
  ```typescript
  @MessagePattern({ cmd: 'cleanup-unused-post-files' })
  async cleanupUnusedPostFiles(@Payload() dto: CleanupUnusedPostFilesContract) {
    return this.commandBus.execute(
      new CleanupUnusedPostFilesCommand(dto.activeFileIds, dto.olderThanHours),
    );
  }
  ```
- [ ] **Step 4: Запустить unit-тесты apps/files**
  `pnpm test apps/files/src/modules/files/application/use-cases/cleanup-unused-post-files.usecase.spec.ts`

---

### Task 4: Репозиторий `PostsRepository` и `FilesTcpClient` в `apps/main`

**Files:**
- Modify: `apps/main/src/modules/user-accounts/infrastructure/repositories/post-repositories/posts.repository.ts`
- Modify: `apps/main/src/core/events/files-tcp.client.ts`

**Interfaces:**
- Produces: `postsRepository.getAllActivePostMediaFileIds(): Promise<string[]>`
- Produces: `filesTcpClient.cleanupUnusedPostFiles(activeFileIds: string[], olderThanHours?: number): Promise<...>`

- [ ] **Step 1: Реализовать `getAllActivePostMediaFileIds` в `PostsRepository`**
  Получить все посты (`images` и `preview`), извлечь уникальные `fileId` с помощью `getFileIds`:
  ```typescript
  async getAllActivePostMediaFileIds(): Promise<string[]> {
    const posts = await this.prisma.post.findMany({
      select: { images: true, preview: true },
    });
    const fileIdSet = new Set<string>();
    for (const post of posts) {
      for (const id of getFileIds(post.images)) fileIdSet.add(id);
      for (const id of getFileIds(post.preview)) fileIdSet.add(id);
    }
    return Array.from(fileIdSet);
  }
  ```
- [ ] **Step 2: Добавить метод `cleanupUnusedPostFiles` в `FilesTcpClient`**
  ```typescript
  async cleanupUnusedPostFiles(
    activeFileIds: string[],
    olderThanHours = 24,
  ): Promise<{ data: { deletedDbCount: number; deletedS3OrphanCount: number } | null; error: unknown }> {
    return lastValueFrom(
      this.client
        .send(
          { cmd: 'cleanup-unused-post-files' },
          { activeFileIds, olderThanHours },
        )
        .pipe(timeout(LONG_FILES_RPC_TIMEOUT_MS)),
    );
  }
  ```

---

### Task 5: Шедулер `UnusedImagesCleanupSchedulerService` в `apps/main`

**Files:**
- Create: `apps/main/src/modules/user-accounts/application/unused-images-cleanup-scheduler.service.ts`
- Modify: `apps/main/src/modules/user-accounts/user-accounts.module.ts`

**Interfaces:**
- Consumes: `PostsRepository`, `FilesTcpClient`
- Produces: `UnusedImagesCleanupSchedulerService`

- [ ] **Step 1: Реализовать `UnusedImagesCleanupSchedulerService`**
  - Реализовать `OnModuleInit`, `OnModuleDestroy`.
  - Запускать интервал периодической проверки (по умолчанию каждые 24 часа; при инициализации или по таймеру запускать `runCleanup()`).
  - Метод `runCleanup()`:
    1. Защита от параллельного запуска `if (this.processing) return;`.
    2. Извлечь `activeFileIds = await this.postsRepository.getAllActivePostMediaFileIds()`.
    3. Вызвать `await this.filesClient.cleanupUnusedPostFiles(activeFileIds, 24)`.
    4. Логировать результат очистки с метриками и временем выполнения.
- [ ] **Step 2: Зарегистрировать шедулер в `UserAccountsModule`**
  Добавить `UnusedImagesCleanupSchedulerService` в `providers` модуля `apps/main/src/modules/user-accounts/user-accounts.module.ts`.

---

### Task 6: Верификация и прогон тестов

- [ ] **Step 1: Проверить сборку приложений `pnpm run build:files` и `pnpm run build:main`**
- [ ] **Step 2: Запустить unit-тесты `pnpm test`**
