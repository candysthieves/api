# Subscription Renewals Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan in the current session. No delegation or commits are requested.

**Goal:** Реализовать первую подписку в Processing, автосписание ЮKassa и позднее восстановление Done.

**Architecture:** Существующие CQRS/repositories и webhook/inbox/outbox. Новые scheduler запускают выборку продлений и перевод зависших подписок в Failed. Связь subscriptions.lastPaymentId определяет целевую подписку; nullable expirationDate определяет начало первого оплаченного периода.

**Tech Stack:** NestJS, Kysely/ClickHouse, встроенный fetch, Jest.

**Spec:** docs/superpowers/specs/2026-10-26-subscription-renewals-design.md

## Global Constraints

- Один экземпляр сервиса. Без транзакций и распределённых блокировок.
- Не обновлять зависимости. Относительные TS-импорты с `.js`.
- Новые use case файлы имеют суффикс `.usecase.ts`.
- Без реальных списаний, миграций рабочей БД, commit/push/deploy.
- Не тестировать доставку между микросервисами.

## 1. Данные и выборка

- [x] Дополнить `apps/payments/src/database/types/payment-database.type.ts` и добавить миграцию `20261026060000_add_subscription_renewals.sql`.
- [x] Добавить отдельную `20261026070000_fix_nullable_subscription_expiration.sql` для обновления уже установленной схемы и восстановления свежих pending-подписок, ошибочно завершённых из-за нулевой expirationDate. Проверить реальное воспроизведение старой схемы, повтор миграции и сохранение настоящих отказов/таймаутов.
- [x] В `subscriptions.repository.ts` реализовать createProcessing/findLatest/findDue/startProcessing/setLastPaymentId/complete/fail/failExpiredProcessing. findDue выбирает latest ID до фильтров, complete обновляет Processing/Failed по subscription ID и lastPaymentId.
- [x] В `payments.repository.ts` добавить findById/attachExternalPaymentId и разрешить поздний succeeded.
- [x] Проверить SQL на изолированной локальной ClickHouse: границу expirationDate, latest среди всех статусов/провайдеров, таймаут через 15 минут после coalesce(expirationDate,createdAt), Failed→Done, неизменность дат на повторе, сохранение отмены.

## 2. Первая покупка

- [x] В существующем create-payment.use-case.ts проверить latest Processing, сохранить новую подписку с expirationDate=null и отключить nextChargeDate старой до вызова провайдера. После сохранения платежа установить lastPaymentId.
- [x] PaymentFactory принимает nullable externalPaymentId; дополнительных колонок связи и вида платежа нет.
- [x] Обновить Swagger описанием отказа новой покупки при Processing.
- [x] Проверить сохранение разных подписок для Done/Failed, отказ для Processing, ошибки провайдера/БД и конвертацию.

## 3. Автосписание

- [x] Добавить renew-subscriptions.usecase.ts: findDue → startProcessing → последний платёж → новый pending → заменить lastPaymentId → createRecurringPayment → сохранить external ID.
- [x] Добавить subscriptions.scheduler.ts: два cron EVERY_MINUTE с waitForCompletion.
- [x] В YookassaService добавить POST с payment_method_id без redirect. Зарегистрировать scheduler/use case в PaymentsModule.
- [x] Проверить отсутствующий метод, таймаут и продолжение других подписок после ошибки.

## 4. Результат и итоговая проверка

- [x] PaymentStatusService находит подписку по lastPaymentId; поздний успех восстанавливает Done, продление использует прежний срок, первая оплата устанавливает срок от сохранённого paymentDate.
- [x] Сохранить существующее completion-событие. Не создавать новую подписку для платежа без совпадающего lastPaymentId; вернуть ошибку для существующего retry inbox.
- [x] Проверить unit-сценарии payments: `pnpm exec jest --runInBand apps/payments/src/modules/payments`.
- [x] Выполнить сборки main/payments, ESLint и Prettier изменённых файлов.
- [x] Проверить diff и сообщить результаты, включая ограничения проверок.
