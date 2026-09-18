# Обработка изображений: outbox files и inbox main

Этот документ описывает действующий поток и заменяет документы по изображениям за 2026-09-06—08. План исполнения: [2026-09-08-simplify-post-image-flow.md](../plans/2026-09-08-simplify-post-image-flow.md).

## Поток и подтверждения

```text
main: создать Post с null-позициями → HTTP 201 { postId }
  → в фоне последовательно отправить исходные картинки в RabbitMQ
files consumer: проверить сообщение и отмену → begin задания
  → сохранить основное изображение в S3/MongoDB
  → для index=0 последовательно сохранить preview
  → записать READY/FAILED непосредственно в outbox
  → записать терминальное состояние задания
  → при FAILED сохранить отмену → вернуться для автоматического ack
scheduler files: UNPROCESSED outbox → RabbitMQ publisher confirm → OK
main consumer: проверить результат → сохранить в inbox → автоматический ack
scheduler main: inbox → изменить/удалить Post → SSE → inbox OK
```

HTTP не ожидает обработки изображений или завершения публикации. Лимиты: 1–8 изображений, каждое до 5 MiB. Порядок массива сохраняется; незавершённые позиции и отсутствующий preview равны `null`. `MediaFile` содержит `fileId`, `url`, числовые `width`/`height`; валидатор допускает только конечные положительные числа. Mapper явно перечисляет публичные поля и приводит Prisma JSON к существующим `PostImages`/`PostPreview` без повторной валидации сохранённых данных.

SSE `post-created` отправляется после создания записи; `post-media-updated` — после применения нового результата; `post-deleted` — после удаления поста. Payload каждого события: `{ postId }`. Готовность картинки с индексом 0 включает готовность preview. Любая ошибка обработки или публикации задания удаляет весь пост.

## Учёт задания files

Коллекция `input_events` содержит только уникальный `eventId = postId:index`, `postId`, `index`, `state: PROCESSING | READY | FAILED` и timestamps. В ней нет исходных байтов, файловых ID или результата.

`FilesInboxRepository.begin` выполняет один indexed upsert с `$setOnInsert` и `returnDocument: 'before'`: отсутствие предыдущего документа даёт право запустить обработку. `setState(READY)` изменяет только PROCESSING; `setState(FAILED)` изменяет PROCESSING или READY. FAILED не возвращается в READY.

Worker выполняет следующие действия:

1. Ошибка `begin` выходит наружу до работы с изображением.
2. Повтор READY или FAILED завершается сразу.
3. Повтор PROCESSING завершается ошибкой прерванного задания и формирует FAILED. Sharp/S3 повторно не вызываются; восстановления результата из outbox нет.
4. Новое задание сохраняет основное изображение через `FilesService.saveFile`, затем preview для индекса 0, записывает READY в outbox и терминальное состояние в inbox.
5. Ошибка проверки отмены, начала задания, обработки или сохранения результата логируется. Worker независимо пытается записать FAILED в outbox, отменить пост, отметить задание FAILED и удалить созданные этим вызовом файлы. Ошибки завершения логируются без возврата задания в очередь. FAILED получает отдельный eventId, если READY уже был записан.

Worker проверяет активную отмену до `begin`. Отменённое задание пропускается с ack. Consumer разбирает сообщение и делегирует worker; исключение логируется и получает `Nack(false)`. Возврата исходного задания в очередь нет. MongoDB работает standalone, без транзакций и replica set; повторный запуск обработки, leases и retry-очереди отсутствуют.

Доставку сохранённого FAILED повторяет существующий scheduler outbox. Если сама запись FAILED в MongoDB не удалась, событие не сохранено и scheduler не сможет его доставить; ошибка логируется. При сбое записи метаданных файла `FilesService` пытается удалить уже загруженный S3-объект. Ошибки очистки логируются.

## Outbox files

`output_events` сохраняет структуру `ImageEvent` и статусы доставки `UNPROCESSED | OK`. Индексы уникальны по `eventId` и по `(data.postId, data.index, data.status)`.

`enqueue` делает upsert через `$setOnInsert` по тройке задания/статуса. Повтор не меняет первоначальный `eventId`, данные или уже установленный `OK`. В обычном потоке есть один результат; при гонке прерванного обработчика могут остаться READY и FAILED. FAILED удаляет пост даже при наличии READY. Завершённые outbox-записи сохраняются для восстановления разрыва между outbox и состоянием задания.

Scheduler files запускается раз в секунду, защищён `running` guard, читает до 20 UNPROCESSED событий и публикует последовательно. Только publisher confirm разрешает поставить `OK`. При ошибке запись остаётся необработанной до следующего прохода. Сбой после confirm до `OK` может дать повторную доставку того же события.

## Inbox main и отмена

Consumer main проверяет сообщение и выполняет idempotent upsert по `eventId` в Prisma `InboxEvent` (таблица `InputEvent`). Ack происходит после записи; ошибка записи даёт `Nack(true)`, невалидный результат — `Nack(false)`. При гонке первоначального Prisma upsert возможна ошибка уникальности: повторная доставка сохраняет уже созданную запись, не сбрасывая её статус.

`accept` не изменяет Post и не запускает scheduler. Единственный источник запуска — интервал 1 секунда. Сохраняются guard, условный claim, повтор через 10 секунд и восстановление PROCESSING старше 10 минут. После изменения Post отправляется SSE, затем inbox становится OK.

Применение результата удерживает row lock Post, проверяет индекс относительно длины массива, не заменяет заполненную позицию и не восстанавливает удалённый пост. Повтор обработанного eventId не создаёт новую обработку. Повтор результата для заполненного слота не отправляет повторный SSE изменения.

`cancelPost(postId)` сначала удаляет Post и отправляет `post-deleted` только при фактическом удалении. Затем best-effort выполняет TCP отмену `{ postId }` и удаление известных файлов. Недоступность files не мешает удалению Post. PostgreSQL-ошибки удаления выходят наружу: scheduler повторяет обработку inbox, а конечный синхронный catch фонового dispatch логирует ошибку компенсации.

В `cancelled_post_image_jobs` остаются `postId`, `expiresAt` и timestamps. Upsert продлевает TTL на 24 часа; проверка отмены использует `expiresAt > now`, независимо от задержки TTL-очистки MongoDB.

## Транспорт и границы перехода

Единственный механизм RabbitMQ — `@golevelup/nestjs-rabbitmq@9.0.2`. Сохраняются очереди `${RABBITMQ_MAIN_TO_FILES_QUEUE}.post-images.v1` и `${RABBITMQ_FILES_TO_MAIN_QUEUE}.post-images.results.v1`, durable, persistent, publisher confirm, таймаут публикации 5 секунд, `prefetchCount: 1` и single active consumer очереди заданий. Исходное изображение передаётся бинарным Buffer; `postId`, `index`, `originalName`, `size` — headers, MIME — `contentType`.

Цепочки модулей: `AppModule → UserAccountsModule → EventsModule → RabbitMqModule` в main и `AppModule → FilesModule → FilesEventsModule → RabbitMqModule` в files. TCP files и остальные файловые команды сохраняются. Тестовых RMQ-контроллеров, маршрутов и Nest RMQ ClientProxy нет. Переменные окружения RabbitMQ сохранены; зависимости не обновляются.

Старые данные и промежуточные события не поддерживаются. Переход рассчитан на подготовленные чистые данные и очереди без одновременного запуска старой версии. Автоматическая очистка реальных данных/очередей отсутствует. Существующие SQL-миграции сохранены; дополнительных SQL-миграций для этого изменения нет.

Падение main до завершения фоновой отправки может оставить незавершённый пост: outbox исходных картинок намеренно отсутствует. Неудачная PostgreSQL-компенсация dispatch логируется, но автоматически не повторяется. Запись S3 и MongoDB не атомарна; оставшиеся объекты обрабатывает существующая очистка при включённом `UNUSED_FILES_CLEANUP_ENABLED`. Новая очистка завершённых outbox-записей не добавлена.

## Локальная проверка БД

Fixture использует только отдельные PostgreSQL и standalone MongoDB, без S3 и RabbitMQ. Она пересоздаёт тестовые таблицы `Post`, `InputEvent` и enum в указанной изолированной БД.

```powershell
docker run -d --rm --name codex-post-single-pg -p 127.0.0.1:55439:5432 -e POSTGRES_PASSWORD=codex_local_only -e POSTGRES_DB=codex_post_test postgres:17
docker run -d --rm --name codex-post-single-mongo -p 127.0.0.1:57029:27017 mongo:7
pnpm run build:main
pnpm run build:files
node apps/main/test/post-image-lifecycle.integration.mjs
docker stop codex-post-single-pg codex-post-single-mongo
```

Проверяются конкурентный begin, уникальность outbox, сохранение первоначального результата и OK, восстановление после сбоя записи state, приоритет FAILED над поздним READY, транзакционные гонки Post, TTL отмены, настоящий inbox и scheduler main, повтор завершённого eventId и существующие миграции добавления/удаления `image_processing`. Это не проверка доставки через работающий RabbitMQ.
