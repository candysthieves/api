# CI/CD: GitHub Actions → Docker Hub → VPS

## Сервисы и сервер

CI собирает main, files, payments и notifications на push в developer/main и на PR. Deploy запускается вручную через Actions → Deploy → Run workflow; выбирайте developer. Workflow технически допускает и другие ветки. Тесты в CI не запускаются.

Образы: `chites/lumos-main`, `chites/lumos-files`, `chites/lumos-payments`, `chites/lumos-notifications`. Тег выпуска: `<commit SHA>-<run ID>-<attempt>`; latest workflow не обновляет.

Новый VPS: `root@82.114.226.68:22`, домен `137326.zetalink.ru`, каталог `/home/api`. Приложения используют host network. PostgreSQL, MongoDB, ClickHouse и RabbitMQ обслуживаются отдельно и должны быть доступны до деплоя. VPS Compose добавляет Redis с постоянным томом, AOF и портом `127.0.0.1:6379`.

## Подготовка сервера

Требуются Docker с Compose, поддерживающим `up --wait --wait-timeout`, Bash и flock. В `/home/api` должны быть текущий `docker-compose.vps.yml` и четыре файла окружения:

- `.main.env`: настройки main и подключений к существующим сервисам;
- `.files.env`: MongoDB, S3 и настройки files;
- `.payments.env`: ClickHouse, RabbitMQ и настройки payments;
- `.notifications.env`: RabbitMQ URL и обе очереди, как в payments.

Файл `.notifications.env` создаётся и хранится на сервере. Перенесите реальные значения `RABBITMQ_URL`, `RABBITMQ_PAYMENTS_TO_NOTIFICATIONS_QUEUE` и `RABBITMQ_NOTIFICATIONS_TO_PAYMENTS_QUEUE` из конфигурации payments. Если этих параметров ещё нет, заполните их в обоих файлах. Имена очередей должны совпадать. Пароли не входят в репозиторий или образ.

Compose задаёт notifications HTTP-порт `3010`, TCP `127.0.0.1:3011` и Redis `127.0.0.1:6379`. Main получает тот же адрес TCP через Compose. Отдельный публичный маршрут notifications не нужен: клиентские запросы обслуживает main. Проверьте, что порты свободны. Не задавайте `REDIS_PASSWORD` для Redis из этого Compose: он публикует порт только на loopback хоста и не использует пароль.

Main слушает `6666`, payments — `3003`. Существующий reverse proxy и TLS должны направлять запросы на нужный сервис; workflow их не изменяет. Публичные URL и callback URL в env и у внешних провайдеров проверяются отдельно.

## GitHub Actions secrets

| Имя | Значение |
| --- | --- |
| `VPS_SSH_KEY` | Приватный ключ, чей публичный ключ разрешён в `/root/.ssh/authorized_keys` нового VPS |
| `VPS_KNOWN_HOSTS` | Проверенная запись `82.114.226.68 ssh-ed25519 ...` нового сервера |
| `DOCKERHUB_USERNAME` | `chites` |
| `DOCKERHUB_TOKEN` | Токен с правом публикации всех четырёх образов, включая notifications |

При смене VPS замените `VPS_KNOWN_HOSTS`. Старый `VPS_SSH_KEY` можно сохранить, если соответствующий публичный ключ установлен на новом сервере. Пароль root не заменяет ключ в workflow. Для приватных образов серверу также нужен доступ к Docker Hub.

## Что делает Deploy

1. Выполняет CI и публикует четыре образа с единым тегом.
2. Загружает Compose из того же коммита на VPS как `docker-compose.vps.next.yml`.
3. `scripts/deploy-vps.sh` берёт flock, проверяет env-файлы и Compose, скачивает образы приложений и Redis.
4. Запускает Prisma migrations в одноразовом main и ClickHouse migrations в одноразовом payments. При ошибке миграции приложения не обновляются; выполненные миграции автоматически не откатываются.
5. Сохраняет прежние Compose и release-файлы, активирует новый Compose и `docker-compose.release.yml`, запускает Redis и ждёт его healthcheck, затем запускает четыре приложения.
6. Через 15 секунд проверяет состояние контейнеров. Автоматического отката нет. Release-файл отражает выбранный выпуск, фактическое состояние проверяется через ps.

Существующая БД без истории Prisma migrations требует отдельной настройки baseline. Миграции выполняются с production env из Compose. Параллельные запуски ограничены concurrency в Actions и flock на сервере.

Для ручной проверки всегда указывайте оба Compose-файла:

```bash
cd /home/api
docker compose -f docker-compose.vps.yml -f docker-compose.release.yml ps
docker compose -f docker-compose.vps.yml -f docker-compose.release.yml logs --tail=100 notifications
docker compose -f docker-compose.vps.yml -f docker-compose.release.yml up -d
```

Базовый Compose без release-файла использует latest, который CI не публикует. Не удаляйте Redis volume: в нём хранятся уведомления. Проверка состояния контейнеров не заменяет проверку HTTP, WebSocket, S3 и бизнес-сценариев.

## Обработка изображений

`POST_IMAGE_CONCURRENCY=5` в `.files.env` ограничивает параллельную обработку изображений из MongoDB inbox. Значение по умолчанию — 5, допустимо положительное целое. После изменения пересоздайте files с обоими Compose-файлами:

```bash
docker compose -f docker-compose.vps.yml -f docker-compose.release.yml up -d --force-recreate files
```
