# Спецификация: Утилита периодической очистки неиспользуемых изображений постов

## 1. Цель
Реализовать механизм очистки осиротевших и неиспользуемых картинок постов (`POST`, `POST_PREVIEW`) из MongoDB и хранилища S3:
1. Картинки в MongoDB, которые не привязаны ни к одному посту в PostgreSQL.
2. Файлы в бакете S3, на которые нет ссылок даже в MongoDB.
3. Защитный период (grace period): удалять только объекты старше 24 часов (чтобы не задеть изображения создающихся постов).
4. Аватарки (`AVATAR`, `AVATAR_PREVIEW`) не затрагиваются.

---

## 2. Архитектура и взаимодействие сервисов

В системе два микросервиса:
- `apps/main` (PostgreSQL / Prisma, CQRS, бизнес-логика постов).
- `apps/files` (MongoDB / Mongoose, S3Adapter, хранилище и обработка медиа).

### Схема взаимодействия
```
[apps/main]
   │
   ▼ (шедулер раз в сутки / по интервалу)
UnusedImagesCleanupSchedulerService
   │
   ├─► 1. Запрашивает из PostgreSQL (PostsRepository) список всех активных fileId
   │      (из полей images и preview всех постов).
   │
   └─► 2. Отправляет TCP-запрос в apps/files:
          cmd: 'cleanup-unused-post-files'
          payload: { activeFileIds: string[], olderThanHours: 24 }
               │
               ▼
        [apps/files]
        FilesController -> CleanupUnusedPostFilesUseCase / Service
               │
               ├─► 2.1. Поиск в MongoDB:
               │        type in [POST, POST_PREVIEW],
               │        createdAt < (now - 24h),
               │        fileId NOT IN activeFileIds.
               │        Удаление найденных файлов из S3 (s3.deleteFile) и из MongoDB (deleteOne).
               │
               └─► 2.2. Поиск осиротевших файлов в S3:
                        ListObjectsV2 по префиксам 'files/POST/' и 'files/POST_PREVIEW/'.
                        Для каждого объекта со временем модификации старше 24 часов:
                        проверка наличия в Mongo. Если записи нет — s3.deleteFile.
               │
               ▼
        Возврат отчета { deletedFromDbAndS3: number, deletedOrphanS3: number }
```

---

## 3. Детальные изменения по компонентам

### 3.1. Общие контракты (`libs/contracts`)
- Создать DTO контракта `CleanupUnusedPostFilesContract`:
  ```typescript
  export class CleanupUnusedPostFilesContract {
    activeFileIds: string[];
    olderThanHours?: number; // default: 24
  }
  ```
- Экспортировать в `libs/contracts/index.ts`.

### 3.2. Хранилище S3 (`apps/files/src/core/adapters/s3.adapter.ts`)
- Добавить метод листинга объектов:
  ```typescript
  async listObjects(prefix: string): Promise<Array<{ key: string; lastModified?: Date }>>;
  ```
  Использует `ListObjectsV2Command` с поддержкой `ContinuationToken` для полного обхода бакета по префиксу.

### 3.3. Use Case очистки (`apps/files/src/modules/files/application/use-cases/cleanup-unused-post-files.usecase.ts`)
- Команда `CleanupUnusedPostFilesCommand(activeFileIds: string[], olderThanHours: number = 24)`.
- Логика:
  1. Вычисляет `cutoffDate = new Date(Date.now() - olderThanHours * 3600 * 1000)`.
  2. Находит в Mongo документы `File`:
     ```typescript
     {
       type: { $in: [FileType.POST, FileType.POST_PREVIEW] },
       createdAt: { $lt: cutoffDate },
       fileId: { $nin: command.activeFileIds }
     }
     ```
  3. Для каждого документа: удаляет объект из S3 по `file.key`, затем удаляет документ из Mongo.
  4. Листит S3 по префиксам `files/POST/` и `files/POST_PREVIEW/`. Для каждого объекта с `LastModified < cutoffDate`:
     - Проверяет существование записи в Mongo по `key`.
     - Если записи в Mongo нет — удаляет объект из S3 через `s3.deleteFile(obj.key)`.
  5. Возвращает `ObjectResult.success({ deletedDbCount, deletedS3OrphanCount })`.

### 3.4. Контроллер `FilesController` (`apps/files/src/modules/files/api/files.controller.ts`)
- Добавить обработчик:
  ```typescript
  @MessagePattern({ cmd: 'cleanup-unused-post-files' })
  async cleanupUnusedPostFiles(@Payload() dto: CleanupUnusedPostFilesContract) {
    return this.commandBus.execute(new CleanupUnusedPostFilesCommand(dto.activeFileIds, dto.olderThanHours));
  }
  ```

### 3.5. `FilesTcpClient` в `apps/main` (`apps/main/src/core/events/files-tcp.client.ts`)
- Добавить метод вызова команды очистки:
  ```typescript
  async cleanupUnusedPostFiles(activeFileIds: string[], olderThanHours = 24)
  ```

### 3.6. `PostsRepository` в `apps/main` (`apps/main/src/modules/user-accounts/infrastructure/repositories/post-repositories/posts.repository.ts`)
- Добавить метод извлечения всех используемых `fileId`:
  ```typescript
  async getAllActivePostMediaFileIds(): Promise<string[]>;
  ```
  Делает запрос к `this.prisma.post.findMany({ select: { images: true, preview: true } })`, парсит `images` и `preview`, возвращает массив уникальных `fileId`.

### 3.7. Шедулер `UnusedImagesCleanupSchedulerService` в `apps/main` (`apps/main/src/modules/user-accounts/application/unused-images-cleanup-scheduler.service.ts`)
- Реализует `OnModuleInit`, `OnModuleDestroy`.
- Запускает интервал раз в 24 часа (или конфигурируемый интервал).
- Собирает ID из `postsRepository.getAllActivePostMediaFileIds()`.
- Вызывает `filesClient.cleanupUnusedPostFiles(fileIds, 24)`.
- Логирует результат очистки.

---

## 4. Тестирование
1. **Unit-тест `CleanupUnusedPostFilesUseCase` (`apps/files`)**:
   - Проверка, что файлы моложе 24 часов не удаляются.
   - Проверка, что активные файлы (`fileId` из списка) не удаляются.
   - Проверка, что неактивные файлы старше 24 часов удаляются из S3 и Mongo.
   - Проверка, что сиротские ключи S3 удаляются.
   - Проверка, что файлы аватарок не затрагиваются.
2. **Unit-тест `PostsRepository.getAllActivePostMediaFileIds` (`apps/main`)**:
   - Проверка извлечения `fileId` из массива `images` и объекта `preview`.
