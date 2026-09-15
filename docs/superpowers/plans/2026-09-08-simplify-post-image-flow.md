# Упростить обработку изображений, сохранив outbox files и inbox main

## 1. Цель и окончательно согласованный поток

Цель: убрать остатки повторной обработки, промежуточное копирование результатов, лишнюю валидацию сохранённых данных и тестовый RabbitMQ-транспорт.

Исполнение: использовать `executing-plans`, выполнять задачи последовательно. Этот план содержит окончательные решения и заменяет противоречащие ему старые планы. Не восстанавливать удалённый код из staged-версий файлов.

Стек: существующие NestJS 11, `@golevelup/nestjs-rabbitmq@9.0.2`, Prisma/PostgreSQL, Mongoose/standalone MongoDB, Sharp и S3. Зависимости не обновлять.

```text
main: создать Post с null-позициями → вернуть HTTP 201
  └─ в фоне последовательно отправить исходные картинки в RabbitMQ
       ↓
files: принять картинку
  → проверить отмену
  → записать минимальный учёт начала обработки
  → обработать картинку и сохранить файл в S3/MongoDB
  → для index=0 также сохранить preview
  → записать результат непосредственно в outbox
  → отметить задание завершённым
  → подтвердить RabbitMQ-задание
       ↓
scheduler files:
  прочитать UNPROCESSED outbox
  → отправить результат в RabbitMQ с publisher confirm
  → отметить outbox как OK
       ↓
main consumer:
  проверить сообщение → сохранить в inbox → подтвердить RabbitMQ
       ↓
scheduler main:
  прочитать необработанный inbox
  → обновить Post / удалить Post при FAILED
  → отправить SSE
  → отметить inbox обработанным
```

Зафиксированные границы:

- Inbox и scheduler в main сохраняются. Предыдущее согласие на прямое применение результата отменено последующим уточнением пользователя.
- В files сохраняется минимальный учёт задания для однократного запуска обработки. Исходные байты и результат в нём не хранятся.
- Исходные картинки идут непосредственно из main в RabbitMQ. Outbox отправки исходных картинок в main не добавлять.
- Поддержка старых данных не нужна: никаких строковых размеров, QUEUED, pendingEvent, промежуточных событий и миграционных fallback.
- Реальные данные и очереди автоматически не очищать. Переход рассчитан на подготовленные чистые данные и очереди, без одновременного запуска старой версии.
- Существующие SQL-миграции сохранить. Новые SQL-миграции для этого изменения не требуются.
- Сохранить HTTP `201 { postId }`, порядок/null-позиции изображений, SSE с `{ postId }`, пределы 8 изображений и 5 MiB.
- Ошибка обработки или публикации задания удаляет весь пост. Готовность первой картинки включает preview. Повторного запуска Sharp/S3 для того же задания нет.
- Сохранить имена очередей, бинарный Buffer, headers, persistent-публикацию, publisher confirm, таймаут 5 секунд, `prefetchCount: 1`, single active consumer.
- Не добавлять MongoDB-транзакции, replica set, retry-очереди, leases заданий, revision, отдельные imageId или универсальные сервисы надёжности.
- Сохранить чужой WIP. Не выполнять commit, push и развёртывание.

## 2. Контракты и модель хранения

### Изображения и отмена

В `libs/contracts/post-image.contract.ts` изменить только типы размеров:

```ts
export type MediaFile = {
  fileId: string;
  url: string;
  width: number;
  height: number;
};
```

ImageJob и остальную структуру ImageEvent сохранить. Валидатор принимает только конечные положительные числовые размеры; строки, NaN, Infinity, ноль и отрицательные значения отвергает.

```ts
export class CancelPostImageJobsContract {
  @IsUUID('4')
  postId: string;
}
```

Интерфейсы:

```ts
CancelledPostImageJobRepository.cancel(postId: string): Promise<void>;
FilesTcpClient.cancelPostImageJobs(payload: CancelPostImageJobsContract): Promise<void>;
ImageResultInboxService.cancelPost(postId: string): Promise<void>;
```

В маркере отмены оставить postId, expiresAt и timestamps. TTL — 24 часа; проверка expiresAt > now сохраняется. reason и traceId удалить из DTO, схемы, аргументов, генерации и тестов. Ошибки логировать с postId, в worker также с индексом.

### Минимальный учёт задания в files

Сохранить FilesInboxRepository, InputEvent и коллекцию input_events:

```ts
{
  eventId: string; // postId:index, unique
  postId: string;
  index: number;
  state: 'PROCESSING' | 'READY' | 'FAILED';
  // существующие timestamps
}
```

Удалить QUEUED, fileId, previewFileId, pendingEvent. Оставить методы:

```ts
begin(job: Pick<ImageJob, 'postId' | 'index'>): Promise<{
  state: 'PROCESSING' | 'READY' | 'FAILED';
  claimed: boolean;
}>;
setState(job: Pick<ImageJob, 'postId' | 'index'>, state: 'READY' | 'FAILED'): Promise<void>;
```

begin выполняет один indexed upsert, вставляя сразу PROCESSING. `returnDocument: 'before'`: отсутствие предыдущего документа означает новый запуск, существующий документ — повторную доставку. См. [Mongoose](https://mongoosejs.com/docs/tutorials/findoneandupdate.html).

```ts
const previous = await this.jobs
  .findOneAndUpdate(
    { eventId: `${job.postId}:${job.index}` },
    {
      $setOnInsert: {
        postId: job.postId,
        index: job.index,
        state: 'PROCESSING',
      },
    },
    { upsert: true, returnDocument: 'before' },
  )
  .exec();

return previous
  ? { state: previous.state, claimed: false }
  : { state: 'PROCESSING', claimed: true };
```

setState записывает READY только вместо PROCESSING. FAILED может заменить PROCESSING или READY; повторный FAILED безопасен. Поздний успех не переводит FAILED обратно в READY. Ошибки БД передавать вызывающему коду, самодельные циклы повторов не добавлять.

### Outbox files

Сохранить output_events, ImageEvent, статусы UNPROCESSED | OK и уникальный eventId. Добавить:

```ts
StoredEventSchema.index(
  { 'data.postId': 1, 'data.index': 1, 'data.status': 1 },
  { unique: true },
);
```

Индекс сохраняет одну запись каждого итогового статуса задания. Обычно существует один результат; при гонке прерванного обработчика возможны READY и FAILED. FAILED удаляет пост.

```ts
enqueue(event: ImageEvent): Promise<void>;
findResult(job: Pick<ImageJob, 'postId' | 'index'>): Promise<ImageEvent | null>;
findPending(limit: number): Promise<StoredEventDocument[]>;
markPublished(eventId: string): Promise<void>;
```

enqueue делает upsert по (postId, index, status) через $setOnInsert. Повтор сохраняет первоначальный eventId, данные и статус доставки, включая OK. findResult предпочитает FAILED, затем READY, иначе null. Он нужен только для восстановления разрыва между outbox и обновлением задания. Завершённые outbox-записи сохранять; новую очистку не добавлять.

## 3. Последовательность реализации

### Задача 1. Числовые размеры и простой mapper

Файлы: контракт и contract/state specs, PostImageWorkerService, PostsMapper и его spec, fixtures в `apps/main/test/post-image-lifecycle.integration.mjs`.

- Заменить строковые размеры в контракте, валидаторе, worker и fixtures числовыми.
- В toMediaFile передавать file.width/file.height напрямую.
- Удалить PostsMapper.toImages и toFile. В трёх методах использовать `images: post.images as PostImages`, `preview: post.preview as PostPreview` из core/types/prisma/json-types.ts.
- Сохранить явное перечисление остальных публичных полей. Новый генератор Prisma не настраивать, generated client не редактировать.
- Добавить отклонение строковых, бесконечных и неположительных размеров; проверить null-позиции и числовой ответ.
- Запустить contract/state/mapper specs.

### Задача 2. Сократить отмену

Файлы: контракт отмены, CancelledPostImageJob schema/repository, FilesController, FilesTcpClient, ImageResultInboxService, worker и тесты.

- Удалить reason/traceId по интерфейсам раздела 2.
- Сохранить upsert отмены, продление TTL и проверку срока действия.
- Сохранить порядок main: удаление Post и SSE, затем best-effort обращения к files.
- Сохранить TCP-ошибки и существующие таймауты.
- Проверить отсутствие повторного post-deleted при повторной отмене; недоступность files не мешает удалению Post.

### Задача 3. Прямое сохранение результата в outbox files

Одновременно изменить обе Mongo-схемы, repositories, worker, FilesEventsService и wiring модуля.

- Реализовать минимальный FilesInboxRepository и новые операции outbox.
- Удалить из inbox finish, fail, saveResult, findPendingResults, markTransferred; результат перенести в worker/outbox.
- Внедрить FilesOutboxRepository в worker. Использовать обычный FilesService.saveFile; удалить saveFileIdempotent целиком.
- Удалить transferPendingResults и зависимость от inbox в FilesEventsService.
- FilesEventsModule экспортирует FilesInboxRepository и FilesOutboxRepository; RabbitMqModule больше не экспортируется.

Точный алгоритм worker:

1. Выполнить begin. Его ошибка выходит наружу до обработки изображения.
2. Существующий READY: завершиться без обработки.
3. Существующий FAILED: повторить cancel(postId), завершиться.
4. Существующий PROCESSING: найти результат в outbox; восстановить терминальный state, при FAILED отменить. Если результата нет, сформировать FAILED прерванной обработки. Sharp/S3 не вызывать.
5. Новое задание: сохранить основное изображение, затем preview при index=0; сформировать READY. При ошибке обработки/сохранения сформировать FAILED и записать короткий лог.
6. Сохранить событие в outbox.
7. Записать терминальный state.
8. Для FAILED выполнить cancel(postId).
9. Вернуться в consumer для автоматического ack.

Catch, формирующий FAILED, охватывает только работу с изображением. Ошибки outbox, state или маркера отмены выходят наружу и дают существующий Nack(true). Если outbox сохранён, повторная доставка его найдёт; иначе прерванное задание завершится FAILED без повторной обработки.

Scheduler files: интервал 1 секунда, существующий running guard, до 20 событий за проход, последовательная публикация, markPublished только после confirm. Ошибка оставляет UNPROCESSED до следующего прохода. Завершённые записи не удаляются.

Обязательные проверки: однократная обработка, ошибка preview, повторные задания, разрыв между outbox и state, поздний READY после FAILED. Уникальные индексы и гонки проверять на изолированной MongoDB.

### Задача 4. Сохранить стандартный inbox main и исправить фоновые ошибки

Файлы: ImageResultInboxService, CreatePostUseCase и specs. ImageResultInboxConsumer сохраняет роль записи в inbox.

- accept выполняет только idempotent upsert по eventId. Удалить setImmediate запуска processPending: единственный источник — scheduler.
- Сохранить интервал 1 секунда, guard, claim, повтор через 10 секунд и восстановление PROCESSING через 10 минут.
- Удалить совместимость с промежуточными событиями. Есть только READY и FAILED.
- Сохранить row lock Post, проверку индекса относительно длины массива, защиту заполненного слота и отсутствие восстановления удалённого Post.
- SSE после изменения Post, завершение inbox после обработки.

Detached dispatch:

```ts
void this.dispatchImages(post.id, command.files).catch((error: unknown) => {
  this.logger.error(
    `Post image dispatch compensation failed: post ${post.id}`,
    error instanceof Error ? error.stack : undefined,
  );
});
```

В dispatchImages обернуть последовательный цикл публикации в try/catch: при ошибке логировать и `await this.imageResults.cancelPost(postId)`. Ошибка публикации вызывает отмену; ошибка удаления Post доходит до конечного синхронного catch, без unhandled rejection. PostgreSQL-ошибки в общем cancelPost не глотать: scheduler должен повторить обработку inbox.

### Задача 5. Удалить тестовый RabbitMQ-транспорт

Удалить файлы:

- `apps/main/src/core/rabbitmq/rabbitmq-test.controller.ts`;
- `apps/main/src/core/rabbitmq/main-rabbitmq-consumer.controller.ts`;
- `apps/main/src/core/rabbitmq/dto/rabbit-message.dto.ts`;
- `apps/files/src/rabbitmq/files-rabbitmq-consumer.controller.ts`;
- `apps/files/src/rabbitmq/dto/rabbit-message.dto.ts`.

Остальные изменения:

- Из producers удалить send, sendTestResponse, RMQ ClientProxy, DI-токены и импорты; сохранить publishJob/publishResult.
- Из RabbitMQ-модулей удалить ClientsModule.registerAsync, тестовые controllers и MAIN_RMQ_CLIENT/FILES_RMQ_CLIENT.
- В main bootstrap удалить Transport.RMQ и startAllMicroservices. В files удалить только Transport.RMQ; TCP и его запуск сохранить.
- AppModule main: обычный режим — AppController, testing — AppController и TestController.
- Убрать дублирующие корневые импорты RabbitMQ/events. Оставить main: AppModule → UserAccountsModule → EventsModule → RabbitMqModule; files: AppModule → FilesModule → FilesEventsModule → RabbitMqModule.
- Из AppConfig/FilesConfig убрать свойства rabbitMqUrl, rabbitMqMainToFilesQueue, rabbitMqFilesToMainQueue и присваивания. Переменные окружения сохранить для ConfigService.
- Не удалять @nestjs/microservices: он нужен TCP. Не чистить зависимости попутно. Новые тестовые маршруты не создавать.

### Задача 6. Актуализировать документацию

- Сохранить этот план в текущем файле.
- Создать [описание действующего потока](../specs/2026-09-08-simplify-post-image-flow-design.md): схема раздела 1, минимальный учёт files, прямой outbox, scheduler main, числовые размеры, отсутствие совместимости, момент каждого ack.
- Старые документы по изображениям за 2026-09-06—08 заменить короткими архивными указателями на новый документ, убрав устаревшие исполняемые инструкции.
- В apps/files/src/index.md заменить архивный Upload Post Files кратким RabbitMQ-потоком; остальные TCP-разделы сохранить.
- Обновить карту AGENTS.md, сохранив CodeGraph и остальные правила.
- Проверить Swagger: null-позиции, числовые размеры, немедленный HTTP 201, post-created, post-media-updated, post-deleted; старый тестовый endpoint не документировать.
- Описать ограничение: падение main до завершения фоновой отправки может оставить незавершённый пост; outbox исходных картинок намеренно отсутствует.

## 4. Проверки и критерии приёмки

Обновить шесть существующих наборов: contract, state, worker, main inbox, create post, mapper. Проверять наблюдаемое поведение:

| Сценарий                      | Результат                                               |
| ----------------------------- | ------------------------------------------------------- |
| Первая картинка               | Основное изображение, затем preview, затем READY outbox |
| index > 0                     | Без preview                                             |
| Ошибка preview                | FAILED и отмена, без повторной обработки                |
| Повтор READY/FAILED           | Без Sharp/S3                                            |
| PROCESSING с outbox           | Восстановление состояния без обработки                  |
| PROCESSING без результата     | FAILED без Sharp/S3                                     |
| Ошибка outbox/state           | Выходит из worker                                       |
| Ошибка публикации main        | postId уже возвращён, отмена в фоне                     |
| Ошибка PostgreSQL-компенсации | Лог, без unhandled rejection                            |
| Приём main                    | Только inbox; изменение Post/SSE при scheduler          |
| Повтор результата             | Inbox не сбрасывается, слот/SSE не дублируются          |
| Числа/null                    | Правильные размеры и незавершённые позиции в ответе     |

Для scheduler использовать fake timers с контролируемыми зависимостями и lifecycle-методами, без реальных транспортных подключений.

Обновить `apps/main/test/post-image-lifecycle.integration.mjs`, сохранив отдельные локальные PostgreSQL и standalone MongoDB. Заменить перенос pendingEvent следующими сценариями:

- Два конкурентных begin разрешают один запуск.
- Два одинаковых результата дают одну outbox-запись с первоначальным eventId.
- Повтор enqueue после OK не сбрасывает статус доставки.
- Outbox записан, state не обновлён: повторная доставка не обрабатывает файл.
- FAILED сохраняется при позднем READY; события не восстанавливают удалённый Post.
- Параллельные позиции сохраняют оба изображения и preview.
- Отмена и успех не восстанавливают Post.
- Main принимает результат в настоящую таблицу inbox; scheduler применяет и завершает запись.
- Повторный приём обработанного eventId не создаёт новую обработку.

Расширить изолированную PostgreSQL fixture таблицей InputEvent по текущей Prisma InboxEvent и enum EventStatus. Уникальность и транзакционные гонки не проверять mock БД. Сохранить проверку SQL-миграций добавления/удаления image_processing. Производственные подключения, S3 и RabbitMQ не использовать.

Итоговые команды из корня:

```powershell
pnpm run build:main
pnpm run build:files
pnpm run test --runInBand --runTestsByPath libs/contracts/post-image.contract.spec.ts libs/contracts/post-image-state.spec.ts apps/files/src/modules/files/application/post-image-worker.service.spec.ts apps/main/src/core/events/image-result-inbox.service.spec.ts apps/main/src/modules/user-accounts/application/use-cases/posts-use-cases/create-post.usecase.spec.ts apps/main/src/modules/user-accounts/api/mappers/posts.mapper.spec.ts
node apps/main/test/post-image-lifecycle.integration.mjs
```

Последнюю команду выполнять только с подготовленными изолированными БД fixture. Дополнительно:

- ESLint без --fix по точному списку изменённых TypeScript-файлов.
- Prettier --check по изменённым файлам.
- Diff на несвязанные изменения и пробельные ошибки.
- В исходниках нет saveFileIdempotent, файловых ID в inbox, pendingEvent, transferPendingResults, тестовых RMQ-токенов/маршрутов.
- Исходный Buffer не превращается в строку, base64 или JSON-массив байтов.
- TCP сохранён, оба scheduler присутствуют, main consumer только сохраняет inbox.
- Зафиксировать фактическое число тестов; ноль не считать успешной проверкой.
- Не добавлять тесты транспорта/простого делегирования. Сборка и БД-проверки не доказывают доставку через работающий RabbitMQ.

## 5. Передача следующему исполнителю

Начать с текущей рабочей ветки и файлов на диске: много staged/unstaged изменений, включая AD, уже удалённые из действующего решения. Выполнять задачи 1–6 по порядку, затем итоговую проверку. Не возвращаться к согласованию зафиксированных решений и не добавлять совместимость. При фактическом противоречии описать конкретный блокер; обычные ошибки сборки/тестов исправлять в рамках задачи.

Результат: прямые картинки, минимальный учёт files, outbox files и inbox main с scheduler, без тестового RMQ-транспорта и без потери согласованных бизнес-правил.
