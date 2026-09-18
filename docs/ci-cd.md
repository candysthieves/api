# CI/CD: GitHub Actions → Docker Hub → VPS

## Что настроено

- `.github/workflows/ci.yml`: сборка main и files на push в developer/main и на PR.
- `.github/workflows/deploy.yml`: ручной запуск только с ref `developer`, повторная сборка через CI, публикация двух образов, SSH-деплой.
- Тесты не запускаются по решению пользователя.
- Docker Hub: `chites/lumos-main` и `chites/lumos-files`.
- Тег: полный SHA коммита, run ID и номер попытки. `latest` не перезаписывается.
- VPS: `root@159.194.226.200:22`, каталог `/home/api`.
- `scripts/deploy-vps.sh`: pull обоих образов, Prisma migrations, обновление main/files, проверка состояния контейнеров.
- Параллельные деплои ограничены concurrency в Actions и flock на VPS.

## Первое включение

1. Добавить эти файлы в ветку `developer` вместе с кодом, который требуется выпустить.
2. Добавить workflows также в default branch (`main`), чтобы GitHub показывал кнопку ручного запуска. Скрипт деплоя должен присутствовать в developer.
3. Проверить четыре Repository secrets в Settings → Secrets and variables → Actions:

   | Имя                | Значение                                             |
   | ------------------ | ---------------------------------------------------- |
   | VPS_SSH_KEY        | Полный приватный SSH-ключ с BEGIN/END                |
   | VPS_KNOWN_HOSTS    | Проверенная строка `159.194.226.200 ssh-ed25519 ...` |
   | DOCKERHUB_USERNAME | `chites`                                             |
   | DOCKERHUB_TOKEN    | Docker Hub token с правом публикации этих образов    |

4. На VPS уже должны находиться `/home/api/docker-compose.vps.yml`, `.main.env` и `.files.env`. Сервисы называются main и files; Compose передаёт `NODE_ENV=production`. Docker Compose должен поддерживать `up --wait --wait-timeout`; ориентир проекта — версия 2.30 или новее. Bash и flock должны быть установлены.
5. Открыть Actions → Deploy → Run workflow → выбрать **developer** → Run workflow.
6. Проверить jobs CI, images и deploy. Итоговый тег записывается в Summary.

Ручной запуск из main или другой ветки завершится ошибкой до сборки и доступа к VPS.

## Что происходит на сервере

Исходный `docker-compose.vps.yml` не перезаписывается. Скрипт создаёт дополнительный Compose-файл с двумя image, скачивает образы и запускает:

```bash
pnpm exec prisma migrate deploy --config apps/main/prisma.config.ts
```

Команда выполняется в одноразовом контейнере нового main с серверным окружением. Скрипт npm `prisma:migrate:deploy` намеренно не используется: он задаёт `NODE_ENV=development.local`.

При ошибке миграции обновление контейнеров не начинается. Успешные миграции не откатываются автоматически. Изменения схемы должны быть совместимы со старой версией приложения, которая работает во время миграции. Если существующая БД создана через db push без истории migrations, сначала нужна отдельная настройка baseline.

После миграции выбранные образы сохраняются в `docker-compose.release.yml`, а предыдущий такой файл — в `docker-compose.release.previous.yml`, если он существовал. Затем выполняется up для main/files. При ошибке запуска автоматического отката нет; release-файл отражает запрошенную версию, а реальные контейнеры нужно проверить через ps.

Для последующих ручных команд обязательно указывать оба файла:

```bash
cd /home/api
docker compose -f docker-compose.vps.yml -f docker-compose.release.yml ps
docker compose -f docker-compose.vps.yml -f docker-compose.release.yml up -d main files
```

Запуск только базового Compose использует прежние теги latest.

## Границы проверки

В текущем Compose нет healthcheck приложений. Deploy проверяет running/healthy через Compose и через 15 секунд — running без перезапусков. Это проверка запуска контейнеров, а не доступности всех HTTP-методов, RabbitMQ, MongoDB или S3. При пересоздании контейнеров возможен короткий простой.

Перед включением CI локальная сборка main/files прошла. Выполненный до просьбы отключить тесты прогон: 69 passed, 5 failed (устаревший mock/ожидания ImageResultInboxService). Тесты не изменены и не являются условием деплоя.

## Документация

- [Ручной запуск GitHub Actions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [Compose в production](https://docs.docker.com/compose/how-tos/production/)
- [Prisma migrate deploy](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy)
