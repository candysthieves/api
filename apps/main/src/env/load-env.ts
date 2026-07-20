// parse читает строки .env и возвращает объект с переменными.
import { parse } from 'dotenv';
// Эти функции проверяют наличие файла и читают его.
import { existsSync, readFileSync } from 'node:fs';
// Эти функции помогают получить папку файла и собрать полный путь.
import { dirname, resolve } from 'node:path';
// Нужна, чтобы превратить адрес текущего модуля в путь на диске.
import { fileURLToPath } from 'node:url';

/**
 * Пример полного пути значений при NODE_ENV=development.local:
 *
 * .env.production:        PORT=3001, DATABASE_URL=production-url
 * .env.development:       PORT=,     DATABASE_URL=development-url
 * .env.development.local: PORT=4000, DATABASE_URL=
 *
 * Итог из файлов будет: PORT=4000 и DATABASE_URL=development-url.
 * Пустые значения не участвуют в замене, поэтому PORT= из development
 * не сотрёт PORT=3001, а DATABASE_URL= из local не сотрёт development-url.
 *
 * Если приложение запущено с PORT=5000, итоговый PORT будет 5000:
 * значение из process.env всегда важнее значений из файлов.
 * Это относится и к пустой строке: PORT='' не будет заменён на 4000.
 *
 * В конце результат попадает в process.env. Его использует Nest через
 * ConfigModule, а Prisma берёт process.env.DATABASE_URL в prisma.config.ts.
 * Неизвестный NODE_ENV остановит запуск с ошибкой.
 */

// Список окружений, которые поддерживает загрузчик.
type SupportedEnvironment =
  'production' | 'development' | 'development.local' | 'testing';

// Папка, в которой лежат .env-файлы.
const environmentDirectory = dirname(fileURLToPath(import.meta.url));

// Файлы идут от общего к более конкретному.
// Значения из файла ниже могут переопределить значения файла выше.
const environmentFiles: Record<SupportedEnvironment, string[]> = {
  // Для production используем только production-файл.
  production: ['.env.production'],
  // Для development добавляем настройки разработки поверх production.
  development: ['.env.production', '.env.development'],
  // Для локальной разработки local-файл имеет самый высокий приоритет.
  'development.local': [
    '.env.production',
    '.env.development',
    '.env.development.local',
  ],
  testing: ['.env.testing'],
};

// Загружает env-файлы в process.env.
export function loadEnvironment(): void {
  // Берём окружение из команды запуска приложения.
  const environment = process.env.NODE_ENV;

  // Проверяем, что окружение нам известно.
  if (!isSupportedEnvironment(environment)) {
    // Если нет — останавливаем запуск с понятным сообщением.
    throw new Error(
      `Unsupported NODE_ENV "${environment ?? 'undefined'}". Expected one of: ${Object.keys(environmentFiles).join(', ')}.`,
    );
  }

  // Запоминаем переменные, переданные при запуске.
  // Они важнее значений из файлов, даже если это пустая строка.
  const processEnvironmentKeys = new Set(Object.keys(process.env));
  // Здесь собираем итоговые значения из всех файлов.
  const loadedEnvironment: Record<string, string> = {};

  // Берём список файлов для выбранного окружения.
  for (const fileName of environmentFiles[environment]) {
    // Собираем путь к текущему .env-файлу.
    const filePath = resolve(environmentDirectory, fileName);

    // Нет файла — пропускаем его и идём дальше.
    if (!existsSync(filePath)) {
      continue;
    }

    // Читаем переменные из текущего файла по одной.
    for (const [key, value] of Object.entries(parse(readFileSync(filePath)))) {
      // PORT= и PORT=   считаем пустыми и не используем.
      // Например, PORT= в local не сотрёт PORT=3001 из production.
      if (value.trim() !== '') {
        // Если ключ уже был, более конкретный файл заменит его значение.
        // Например, PORT=4000 из local заменит PORT=3001 из production.
        loadedEnvironment[key] = value;
      }
    }
  }

  // Переносим итоговые значения в переменные окружения Node.js.
  for (const [key, value] of Object.entries(loadedEnvironment)) {
    // Не меняем переменные, переданные при запуске приложения.
    // Например, PORT=5000 при запуске важнее PORT=4000 в local-файле.
    if (!processEnvironmentKeys.has(key)) {
      // Все остальные переменные берём из результата каскада.
      process.env[key] = value;
    }
  }
}

// Возвращает true, только если NODE_ENV есть в нашем списке.
function isSupportedEnvironment(
  environment: string | undefined,
): environment is SupportedEnvironment {
  return environment !== undefined && environment in environmentFiles;
}
