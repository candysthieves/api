# Post Images: RabbitMQ

Main persists Post and one binary outbox event per image before returning `201 { postId }`. Its scheduler publishes originals with their UUID as messageId. The files consumer validates and stores inbox bytes before ack; persistence failure requeues, invalid input is rejected.

The files inbox scheduler checks cancellation, processes the image and preview for index 0, saves an immutable result outbox with the same UUID, and completes the inbox. An existing outbox (including a cleaned record) skips reprocessing. Both outbox schedulers require publisher confirm. Main stores results before ack and fills only empty Post positions and preview; missing posts are successful skips. Readiness emits the existing SSE notification.

Every processing scheduler runs each second, handles up to 10 events sequentially, and prevents local overlap. All four stores allow 3 attempts with a 10-second delay, recover PROCESSING older than a minute every 10 seconds, and clean terminal payloads after an hour while retaining ID/status forever. Exhaustion leaves ERROR without deleting the post or creating FAILED. One instance per service; no transactions or separate jobs.

TCP cancellation uses `{ cmd: 'cancel-post-images' }` with `{ postId }`; its existing 24-hour marker remains. Existing TCP operations below remain available.

See [the current design and migration procedure](../../../docs/superpowers/specs/2026-09-19-durable-image-events-design.md).

---

# Upload Avatar File

Загрузка аватарки пользователя.

Endpoint принимает один файл, проверяет его размер, обрабатывает изображение, сохраняет оригинальный avatar и его preview в S3, а метаданные сохраняет в MongoDB.

---

## TCP Message

### Pattern

```ts
{
  cmd: 'upload-avatar-file';
}
```

---

## Request

```ts
{
  targetId: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}
```

### Fields

| Field          | Type     | Required | Description                     |
| -------------- | -------- | -------: | ------------------------------- |
| `targetId`     | `string` |      Yes | ID пользователя                 |
| `originalName` | `string` |      Yes | Оригинальное имя файла          |
| `mimeType`     | `string` |      Yes | MIME-тип файла                  |
| `size`         | `number` |      Yes | Размер исходного файла в байтах |
| `buffer`       | `Buffer` |      Yes | Содержимое файла                |

Все поля обязательны.

`targetId`, `originalName` и `mimeType` должны быть непустыми строками.

`size` должен быть числом.

---

## Example Request

```ts
client.send(
  { cmd: 'upload-avatar-file' },
  {
    targetId: 'user-id',
    originalName: 'avatar.jpg',
    mimeType: 'image/jpeg',
    size: 524288,
    buffer: Buffer.from(...),
  },
);
```

---

# Success Response

При успешной загрузке возвращается:

```ts
ObjectResult<FilesResultType>;
```

Ответ содержит:

- загруженную аватарку;
- preview аватарки.

Пример:

```json
{
  "data": {
    "targetId": "user-id",

    "files": [
      {
        "id": "avatar-file-id",
        "url": "https://s3.example.com/...",
        "originalName": "avatar.jpg",
        "size": 245760,
        "width": 800,
        "height": 800,
        "format": "webp"
      }
    ],

    "preview": {
      "id": "avatar-preview-id",
      "url": "https://s3.example.com/...",
      "originalName": "avatar.jpg",
      "size": 45200,
      "width": 204,
      "height": 204,
      "format": "webp"
    }
  },

  "error": null
}
```

> Точный набор полей `files` и `preview` определяется `FileViewType`.

---

# Error Responses

При возникновении ошибки возвращается:

```ts
ObjectResult<null>;
```

`data` при этом имеет значение `null`.

---

## FILE_SIZE_EXCEEDED

Возвращается, если размер файла превышает **5 MB**.

```json
{
  "data": null,

  "error": {
    "code": "FILE_SIZE_EXCEEDED",

    "errors": [
      {
        "field": "file",
        "message": "File size must not exceed 5 MB"
      }
    ]
  }
}
```

---

## VALIDATION_ERROR

Возвращается, если входные данные не проходят валидацию `UploadFileContract`.

### Example

Если `targetId` не является строкой:

```json
{
  "data": null,

  "error": {
    "code": "VALIDATION_ERROR",

    "errors": [
      {
        "field": "targetId",
        "message": "targetId must be a string"
      }
    ]
  }
}
```

Если обязательное поле отсутствует:

```json
{
  "data": null,

  "error": {
    "code": "VALIDATION_ERROR",

    "errors": [
      {
        "field": "originalName",
        "message": "originalName should not be empty"
      }
    ]
  }
}
```

При наличии нескольких ошибок они возвращаются в одном массиве `errors`:

```json
{
  "data": null,

  "error": {
    "code": "VALIDATION_ERROR",

    "errors": [
      {
        "field": "targetId",
        "message": "targetId must be a string"
      },
      {
        "field": "originalName",
        "message": "originalName should not be empty"
      },
      {
        "field": "size",
        "message": "size must be a number conforming to the specified constraints"
      }
    ]
  }
}
```

---

# Image Processing

Для основного файла используется:

```ts
FileType.AVATAR;
```

Изображение конвертируется в WebP с quality `80`:

```ts
.webp({
  quality: 80
})
```

---

## Avatar Preview

Для каждого загружаемого avatar дополнительно создаётся preview:

```ts
FileType.AVATAR_PREVIEW;
```

Preview обрабатывается следующим образом:

```ts
.resize(204, 204, {
  fit: 'inside'
})
.webp({
  quality: 80
})
```

Максимальный размер preview:

```text
204 × 204 px
```

---

# Upload Flow

```text
Client
  │
  │ { cmd: 'upload-avatar-file' }
  │
  ▼
FilesController
  │
  │ validation
  ▼
UploadFileUseCase
  │
  ├── validate file size
  │
  ├── save avatar
  │     │
  │     ├── process image
  │     ├── upload to S3
  │     └── save metadata to MongoDB
  │
  ├── save avatar preview
  │     │
  │     ├── resize image
  │     ├── upload to S3
  │     └── save metadata to MongoDB
  │
  └── build response
  │
  ▼
ObjectResult<FilesResultType>
```

---

# Storage

### S3

В S3 сохраняются два объекта:

1. Основная аватарка.
2. Preview аватарки.

### MongoDB

Для каждого объекта сохраняются метаданные файла.

---

# Important

- Принимается **один файл**.
- Максимальный размер исходного файла — **5 MB**.
- Основной avatar конвертируется в `WebP`.
- WebP quality — `80`.
- Для avatar создаётся preview.
- Максимальный размер preview — `204 × 204 px`.
- Основной файл и preview сохраняются в S3.
- Метаданные обоих файлов сохраняются в MongoDB.
- При ошибке `data` равен `null`.
- Ошибка превышения размера имеет код `FILE_SIZE_EXCEEDED`.
- Ошибки DTO validation имеют код `VALIDATION_ERROR`.

# Soft Delete Files

Мягкое удаление файлов.

Endpoint принимает массив ID файлов и помечает указанные файлы на удаление через **24 часа**.

Файлы не удаляются из MongoDB и S3 непосредственно во время выполнения команды.

---

## TCP Message

### Pattern

```ts
{
  cmd: 'soft-delete-files';
}
```

---

## Request

```ts
{
  fileIds: string[]
}
```

### Fields

| Field     | Type       | Required | Description        |
| --------- | ---------- | -------: | ------------------ |
| `fileIds` | `string[]` |      Yes | Массив UUID файлов |

### Validation

- `fileIds` должен быть массивом.
- Минимальное количество файлов — `1`.
- Максимальное количество файлов — `8`.
- Каждый элемент должен быть UUID версии 4.

```text
1 ≤ fileIds.length ≤ 8
```

---

## Example Request

```ts
client.send(
  { cmd: 'soft-delete-files' },
  {
    fileIds: [
      '550e8400-e29b-41d4-a716-446655440000',
      '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    ],
  },
);
```

---

# Success Response

При успешном выполнении возвращается:

```ts
ObjectResult<null>;
```

```json
{
  "data": null,
  "error": null
}
```

Несмотря на то, что `data` равен `null`, это **успешный результат**, а не ошибка.

---

# Error Responses

При ошибке возвращается:

```ts
ObjectResult<null>;
```

с `data: null` и информацией об ошибке в `error`.

---

## FILE_NOT_FOUND

Возвращается, если хотя бы один из переданных `fileIds` не найден в MongoDB.

```json
{
  "data": null,
  "error": {
    "code": "FILE_NOT_FOUND",
    "errors": [
      {
        "field": "file",
        "message": "Some files were not found"
      }
    ]
  }
}
```

### Important

Операция не выполняется частично.

Если передано:

```text
fileIds = [file-1, file-2, file-3]
```

и `file-2` не существует, ни один из файлов не помечается на удаление.

---

## VALIDATION_ERROR

Возвращается, если `fileIds` не проходит валидацию.

### Empty array

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds",
        "message": "fileIds must contain at least 1 item"
      }
    ]
  }
}
```

### More than 8 files

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds",
        "message": "fileIds must contain no more than 8 items"
      }
    ]
  }
}
```

### Invalid UUID

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds[0]",
        "message": "fileIds must be a valid UUID"
      }
    ]
  }
}
```

---

# Soft Delete Flow

```text
Client
  │
  │ { cmd: 'soft-delete-files' }
  │
  ▼
FilesController
  │
  │ validation
  ▼
SoftDeleteFilesUseCase
  │
  ├── find files by fileIds
  │
  ├── check that all files exist
  │
  ├── set deleteAt = now + 24h
  │
  └── save files
  │
  ▼
ObjectResult<null>
```

---

# Delete Schedule

При успешном soft delete каждому файлу устанавливается:

```ts
deleteAt = new Date(Date.now() + 24h)
```

Пример:

```text
Current time:
2026-09-01 15:00

deleteAt:
2026-09-02 15:00
```

До наступления `deleteAt` файл считается помеченным на удаление, но физически остаётся в системе.

После наступления `deleteAt` отдельный процесс очистки может удалить файл из:

- MongoDB;
- S3.

---

# Important

- Операция является **soft delete**.
- Файлы не удаляются физически сразу.
- Для каждого файла устанавливается `deleteAt` на `24 часа` вперёд.
- Можно удалить от `1` до `8` файлов за один запрос.
- Все `fileIds` должны быть UUID v4.
- Если хотя бы один файл не найден, операция завершается ошибкой `FILE_NOT_FOUND`.
- При `FILE_NOT_FOUND` частичное удаление не выполняется.
- Успешный ответ имеет `data: null` и `error: null`.

# Delete Files

Полное удаление файлов.

Endpoint принимает массив ID файлов и физически удаляет каждый файл из S3 и соответствующий документ из MongoDB.

---

## TCP Message

### Pattern

```ts id="f8z5qw"
{
  cmd: 'delete-files';
}
```

---

## Request

```ts id="v4q6bc"
{
  fileIds: string[]
}
```

### Fields

| Field     | Type       | Required | Description        |
| --------- | ---------- | -------: | ------------------ |
| `fileIds` | `string[]` |      Yes | Массив UUID файлов |

### Validation

- `fileIds` должен быть массивом.
- Минимальное количество файлов — `1`.
- Максимальное количество файлов — `8`.
- Каждый элемент должен быть UUID версии 4.

```text id="j48x2a"
1 ≤ fileIds.length ≤ 8
```

---

## Example Request

```ts id="j5l7sw"
client.send(
  { cmd: 'delete-files' },
  {
    fileIds: [
      '550e8400-e29b-41d4-a716-446655440000',
      '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    ],
  },
);
```

---

# Success Response

При успешном удалении возвращается:

```ts id="j9w2r0"
ObjectResult<null>;
```

```json id="w3x6se"
{
  "data": null,
  "error": null
}
```

`data: null` в данном случае означает успешное выполнение операции.

---

# Error Responses

При ошибке возвращается:

```ts id="r1f8kc"
ObjectResult<null>;
```

с `data: null` и информацией об ошибке в `error`.

---

## FILE_NOT_FOUND

Возвращается, если хотя бы один переданный `fileId` не найден в MongoDB.

```json id="x9c2qa"
{
  "data": null,
  "error": {
    "code": "FILE_NOT_FOUND",
    "errors": [
      {
        "field": "file",
        "message": "Some files were not found"
      }
    ]
  }
}
```

### Important

Удаление не выполняется частично.

Если среди переданных ID хотя бы один файл отсутствует, операция завершается с ошибкой `FILE_NOT_FOUND`, и удаление файлов не начинается.

---

## VALIDATION_ERROR

Возвращается, если `fileIds` не проходит валидацию.

### Empty array

```json id="c8x3pd"
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds",
        "message": "fileIds must contain at least 1 item"
      }
    ]
  }
}
```

### More than 8 files

```json id="n2v7km"
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds",
        "message": "fileIds must contain no more than 8 items"
      }
    ]
  }
}
```

### Invalid UUID

```json id="q5s8zx"
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds[0]",
        "message": "fileIds must be a valid UUID"
      }
    ]
  }
}
```

---

# Delete Flow

```text id="a6p2lm"
Client
  │
  │ { cmd: 'delete-files' }
  │
  ▼
FilesController
  │
  │ validation
  ▼
DeleteFilesUseCase
  │
  ├── find files by fileIds
  │
  ├── check that all files exist
  │
  ├── delete files from S3
  │
  └── delete documents from MongoDB
  │
  ▼
ObjectResult<null>
```

---

# Deletion Process

Для каждого найденного файла выполняются две операции:

### 1. Delete from S3

Удаляется объект по его S3 key:

```ts id="p8v4jd"
await s3.deleteFile(file.key);
```

### 2. Delete from MongoDB

После успешного удаления из S3 удаляется соответствующий документ:

```ts id="x4n6vb"
await file.deleteOne();
```

Таким образом:

```text id="h5q9kc"
MongoDB File
     │
     ├── file.key ──> S3 Object
     │
     └── deleteOne()
```

---

# Important

- Операция является **физическим удалением**.
- Файл удаляется из **S3**.
- Метаданные файла удаляются из **MongoDB**.
- Можно удалить от `1` до `8` файлов за один запрос.
- Все `fileIds` должны быть UUID v4.
- Если хотя бы один файл не найден, операция завершается `FILE_NOT_FOUND`.
- Частичное удаление до проверки существования всех файлов не выполняется.
- Успешный ответ имеет `data: null` и `error: null`.
- Ошибка превышения/нарушения входных данных возвращается как `VALIDATION_ERROR`.

# Restore Files

Восстановление файлов, ранее помеченных на мягкое удаление.

Endpoint принимает массив ID файлов и отменяет запланированное удаление, устанавливая `deleteAt` в `null`.

Файлы при этом не загружаются заново в S3 и не создаются повторно в MongoDB.

---

## TCP Message

### Pattern

```ts
{
  cmd: 'restore-files';
}
```

---

## Request

```ts
{
  fileIds: string[]
}
```

### Fields

| Field     | Type       | Required | Description        |
| --------- | ---------- | -------: | ------------------ |
| `fileIds` | `string[]` |      Yes | Массив UUID файлов |

### Validation

- `fileIds` должен быть массивом.
- Минимальное количество файлов — `1`.
- Максимальное количество файлов — `8`.
- Каждый элемент должен быть UUID версии 4.

```text
1 ≤ fileIds.length ≤ 8
```

---

## Example Request

```ts
client.send(
  { cmd: 'restore-files' },
  {
    fileIds: [
      '550e8400-e29b-41d4-a716-446655440000',
      '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    ],
  },
);
```

---

# Success Response

При успешном восстановлении возвращается:

```ts
ObjectResult<null>;
```

```json
{
  "data": null,
  "error": null
}
```

`data: null` означает успешное выполнение операции.

---

# Error Responses

При ошибке возвращается:

```ts
ObjectResult<null>;
```

с `data: null` и информацией об ошибке в `error`.

---

## FILE_NOT_FOUND

Возвращается, если хотя бы один переданный `fileId` не найден в MongoDB.

```json
{
  "data": null,
  "error": {
    "code": "FILE_NOT_FOUND",
    "errors": [
      {
        "field": "file",
        "message": "Some files were not found"
      }
    ]
  }
}
```

### Important

Восстановление не выполняется частично.

Если передано:

```text
fileIds = [file-1, file-2, file-3]
```

и `file-2` не существует, ни один из файлов не будет восстановлен.

---

## VALIDATION_ERROR

Возвращается, если `fileIds` не проходит валидацию.

### Empty array

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds",
        "message": "fileIds must contain at least 1 item"
      }
    ]
  }
}
```

### More than 8 files

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds",
        "message": "fileIds must contain no more than 8 items"
      }
    ]
  }
}
```

### Invalid UUID

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "fileIds[0]",
        "message": "fileIds must be a valid UUID"
      }
    ]
  }
}
```

---

# Restore Flow

```text
Client
  │
  │ { cmd: 'restore-files' }
  │
  ▼
FilesController
  │
  │ validation
  ▼
RestoreFilesUseCase
  │
  ├── find files by fileIds
  │
  ├── check that all files exist
  │
  ├── set deleteAt = null
  │
  └── save files
  │
  ▼
ObjectResult<null>
```

---

# Restore Process

Для каждого найденного файла:

```ts
file.deleteAt = null;
await file.save();
```

До восстановления:

```json
{
  "fileId": "file-id",
  "deleteAt": "2026-09-02T15:00:00.000Z"
}
```

После восстановления:

```json
{
  "fileId": "file-id",
  "deleteAt": null
}
```

После установки `deleteAt: null` файл больше не считается запланированным к удалению.

---

# Relationship with Soft Delete

`restore-files` отменяет действие `soft-delete-files`.

```text
soft-delete-files
       │
       ▼
deleteAt = now + 24h
       │
       │ restore
       ▼
deleteAt = null
```

Если файл уже был физически удалён через `delete-files`, восстановить его с помощью `restore-files` невозможно.

---

# Important

- Операция отменяет **soft delete**.
- Файлы не удаляются из S3.
- Файлы не создаются заново.
- Для восстановления устанавливается `deleteAt = null`.
- Можно восстановить от `1` до `8` файлов за один запрос.
- Все `fileIds` должны быть UUID v4.
- Если хотя бы один файл не найден, операция завершается с `FILE_NOT_FOUND`.
- Частичное восстановление не выполняется.
- Успешный ответ имеет `data: null` и `error: null`.
- `restore-files` может восстановить файл только пока он физически существует в системе.
