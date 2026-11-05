# Счётчик уведомлений через Socket.IO

Gateway работает в **main**, на том же порту, что HTTP API. Namespace —
`/notifications`, стандартный transport path Socket.IO — `/socket.io`.
Фронту нужен `socket.io-client` версии 4, обычный `new WebSocket()` не подходит.

## Как это работает

1. Фронт подключается с `auth: { token: accessToken }`.
2. Сервер проверяет access token существующим `JwtAdapter` и допускает соединение.
3. Когда нужен актуальный счётчик, фронт отправляет `notifications:unread-count`
   без данных и ожидает acknowledgement — ответ на этот запрос.
4. Main вызывает существующий TCP-обработчик `get-notifications-count` в notifications.
   Он считает непрочитанные уведомления **за последние 30 дней** в Redis.

Каждый запрос заново получает число. Автоматических обновлений и подписок нет.
`userId` определяется по JWT при handshake. Данные события не используются.

## Пример для фронта

```typescript
import { io } from 'socket.io-client';

// apiUrl — origin HTTP API main, например адрес из конфигурации фронта.
export function connectNotifications(apiUrl: string, accessToken: string) {
  const socket = io(`${apiUrl}/notifications`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    autoConnect: false,
  });

  async function refreshCount() {
    if (!socket.connected) return;

    try {
      // У TCP-вызова на сервере таймаут 10 секунд.
      const response = await socket
        .timeout(12_000)
        .emitWithAck('notifications:unread-count');

      if (response.error) {
        // 97: notifications недоступен. Сохранить старое число, показать ошибку.
        console.error(response.error);
        return;
      }

      console.log('Непрочитанных:', response.data.count);
      // Обновить состояние счётчика в интерфейсе.
    } catch {
      // Нет ответа вовремя: не подменять последнее известное число нулём.
      console.error('Не удалось получить счётчик');
    }
  }

  socket.on('connect', () => void refreshCount());
  socket.on('connect_error', (error) => {
    console.error('Подключение не выполнено', error.message, error.data);
  });
  socket.connect();

  return { socket, refreshCount };
}
```

`refreshCount()` можно вызвать после прочтения уведомлений или при открытии страницы.
Не запускайте несколько таких запросов одновременно: ответы могут прийти в другом порядке.

После обновления access token:

```typescript
socket.disconnect();
socket.auth = { token: newAccessToken };
socket.connect();
```

При logout или удалении компонента, владеющего подключением, вызывайте
`socket.disconnect()`. Не создавайте новое подключение на каждый рендер.

## Ответы

Успех, включая отсутствие непрочитанных:

```json
{ "data": { "count": 0 }, "error": null }
```

Ошибка запроса использует существующие коды и поля ошибок main:

```json
{
  "data": null,
  "error": {
    "code": 74,
    "errorsMessages": [{ "field": "token", "message": "Access token has expired" }]
  }
}
```

Коды: `73` — невалидный access token,
`74` — истёкший access token, `97` — сервис уведомлений недоступен.
Коды 73/74 возникают при подключении: обновите токен через HTTP refresh и подключитесь снова.
При отказе в авторизации подключения эти поля находятся в `connect_error.data`.
Ошибка transport/Origin может прийти без `data`.

## Границы первой версии

- Токен проверяется только при подключении. До отключения запросы используют
  пользователя, сохранённого при handshake, даже после истечения токена.
  Каждое новое подключение, включая reconnect, снова требует действительный токен.
- Как и в текущем HTTP API, проверяется JWT, без проверки отзыва сессии в БД.
  Для logout фронт закрывает сокет; серверное мгновенное отзывание access token
  потребует отдельной доработки общей авторизации.
- Разрешённые browser origin общие с HTTP API (`setup/allowed-origins.ts`).
  Проверка origin применяется и к WebSocket transport. Клиенты без Origin всё равно
  обязаны передать валидный JWT. Размер входящего сообщения ограничен 4 КиБ.
- Общий rate limit и квоты соединений пока не добавлены. Это учебная первая версия;
  перед публичной нагрузкой их нужно настроить на gateway/прокси.
- Для production нужны HTTPS/WSS и поддержка WebSocket Upgrade на reverse proxy.
- Redis adapter, комнаты, RabbitMQ-события для счётчика и push-рассылки не используются.

## Проверка

```powershell
pnpm test -- --runInBand --runTestsByPath apps/main/src/modules/notifications/api/notifications.gateway.spec.ts
pnpm run build:main
pnpm run build:notifications
```

Тесты поднимают локальный NestJS gateway и настоящий Socket.IO-клиент, проверяют
JWT handshake и ответы. Граница notifications подменена: внешние БД и брокеры
для тестов не нужны, доставка TCP/RabbitMQ не тестируется.
