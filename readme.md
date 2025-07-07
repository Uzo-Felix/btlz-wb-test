# WB Tariff Service

Комплексный микросервис для сбора, хранения и управления данными тарифов боксов Wildberries с автоматической синхронизацией Google Sheets.

## Обзор

Этот сервис автоматически:
- **Получает данные тарифов** из API Wildberries каждый час
- **Сохраняет данные** в базе данных PostgreSQL с разрешением конфликтов
- **Обновляет Google Sheets** с отсортированной информацией о тарифах
- **Обрабатывает конфликты данных** и обновления в течение одного дня
- **Сортирует данные** по коэффициенту хранения (по возрастанию)
- **Мониторит состояние** с комплексным логированием и метриками

## Технологический стек

- **Backend**: Node.js + TypeScript
- **База данных**: PostgreSQL + Knex.js
- **Контейнеры**: Docker + Docker Compose
- **Интеграция API**: Wildberries Box Tariffs API
- **Таблицы**: Google Sheets API v4
- **Логирование**: log4js со структурированным логированием
- **Валидация**: Zod схемы валидации
- **Планирование**: Node.js cron jobs

## Быстрый старт

### Предварительные требования
- Docker и Docker Compose установлены
- API ключ Wildberries
- Учетные данные Google Service Account
- ID Google Spreadsheet

### 1. Клонирование репозитория
```bash
git clone https://github.com/uzo-felix/btlz-wb-test.git
cd btlz-wb-test
```

### 2. Настройка окружения
```bash
cp .env.example .env
# Отредактируйте .env с вашими учетными данными
```

### 3. Добавление учетных данных Google
```bash
# Поместите JSON файл вашего Google service account в:
./config/google-credentials.json
```

### 4. Запуск сервисов
```bash
# Развертывание одной командой
docker-compose up -d

# Мониторинг логов
docker-compose logs -f wb-tariff-service
```

## Точки доступа

| Сервис | URL | Учетные данные |
|---------|-----|-------------|
| **Приложение** | http://localhost:3000 | - |
| **Проверка здоровья** | http://localhost:3000/health | - |
| **pgAdmin** | http://localhost:5050 | admin@wbtariffs.com / admin123 |
| **PostgreSQL** | localhost:5432 | postgres / postgres |

## 🔧 Конфигурация

### Обязательные переменные окружения
```env
# Wildberries API
WB_API_KEY=your_wb_api_key_here

# Google Sheets (ID через запятую)
GOOGLE_SPREADSHEET_IDS=1ABC...XYZ,2DEF...UVW

# База данных
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432

# Приложение
APP_PORT=3000
NODE_ENV=production
```

### Опциональные настройки
```env
# Конфигурация планировщика
FETCH_INTERVAL_HOURS=1                    # Интервал опроса WB API
SHEETS_UPDATE_INTERVAL_HOURS=6            # Интервал обновления Google Sheets

# Конфигурация API
WB_API_BASE_URL=https://common-api.wildberries.ru/api/v1

# Конфигурация Google Sheets
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json

# Конфигурация pgAdmin
PGADMIN_EMAIL=admin@wbtariffs.com
PGADMIN_PASSWORD=admin123
PGADMIN_PORT=5050
```

## 🧪 API Endpoints

### Проверка здоровья
```bash
GET /health
```

**Ответ:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-07T10:00:00.000Z",
  "database": "connected",
  "totalRecords": 150,
  "recentData": "available",
  "services": {
    "postgres": "connected",
    "scheduler": "running",
    "googleSheets": "connected"
  }
}
```

### Ручное получение данных
```bash
POST /api/fetch-tariffs
```

### Статистика базы данных
```bash
GET /api/stats
```

## Схема базы данных

### Таблица wb_tariffs
```sql
CREATE TABLE wb_tariffs (
    id SERIAL PRIMARY KEY,
    date VARCHAR(255) NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    pallet_delivery_expr DECIMAL(10,2) NOT NULL DEFAULT 0,
    pallet_delivery_value_base DECIMAL(10,2) NOT NULL DEFAULT 0,
    pallet_delivery_value_liter DECIMAL(10,2) NOT NULL DEFAULT 0,
    pallet_storage_expr DECIMAL(10,2) NOT NULL DEFAULT 0,
    pallet_storage_value_expr DECIMAL(10,2) NOT NULL DEFAULT 0,
    dt_next_pallet VARCHAR(255) NULL,
    dt_till_max VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, warehouse_name)
);
```

### Ключевые особенности
- **Уникальное ограничение**: Предотвращает дублирование записей по дате/складу
- **Десятичная точность**: Точные финансовые вычисления
- **Временные метки**: Автоматическое отслеживание создания и обновления
- **Индексы**: Оптимизированы для запросов по дате и стоимости

## 🔍 Архитектура потока данных

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WB API        │    │   Сервис        │    │   Google Sheets │
│   (Каждый час)  │───▶│   приложения    │───▶│   (Каждые 6ч)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   База данных   │
                       └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │   pgAdmin       │
                       │   Управление    │
                       └─────────────────┘
```

## Функции сервиса

### Автоматизированный конвейер данных
- **Почасовой опрос**: Получение последних данных тарифов из WB API
- **Валидация данных**: Проверка и трансформация ответов API
- **Разрешение конфликтов**: Обновление существующих записей за тот же день
- **Обработка ошибок**: Комплексное логирование ошибок и восстановление

### Интеграция с Google Sheets
- **Несколько таблиц**: Поддержка неограниченного количества подключений к таблицам
- **Автоматическая сортировка**: Данные сортируются по коэффициенту хранения (по возрастанию)
- **Пакетные обновления**: Эффективные массовые обновления для минимизации вызовов API
- **Сохранение форматирования**: Поддержание форматирования таблиц

### Мониторинг здоровья
- **Статус в реальном времени**: Состояние сервиса и подключение к базе данных
- **Метрики производительности**: Количество записей и время обработки
- **Отслеживание ошибок**: Детальные логи ошибок и оповещения
- **Мониторинг ресурсов**: Использование ресурсов контейнеров

## Тестирование и валидация

### Проверка здоровья
```bash
curl http://localhost:3000/health
```

### Доступ к базе данных
```bash
# Через веб-интерфейс pgAdmin
open http://localhost:5050

# Прямой доступ к PostgreSQL
docker-compose exec postgres psql -U wb_user -d wb_tariffs
```

### Просмотр последних данных
```sql
-- Сегодняшние данные тарифов (отсортированы по стоимости хранения)
SELECT 
    warehouse_name,
    pallet_storage_value_expr,
    pallet_delivery_expr,
    date
FROM wb_tariffs 
WHERE date = CURRENT_DATE 
ORDER BY pallet_storage_value_expr ASC;

-- Лучшие склады (наименьшая стоимость хранения)
SELECT 
    warehouse_name,
    pallet_storage_value_expr,
    date
FROM wb_tariffs 
WHERE date = (SELECT MAX(date) FROM wb_tariffs)
ORDER BY pallet_storage_value_expr ASC
LIMIT 5;
```

### Проверка Google Sheets
1. Откройте ваши настроенные Google Spreadsheets
2. Проверьте автоматически обновленные данные
3. Убедитесь, что данные отсортированы по коэффициенту хранения
4. Подтвердите, что временные метки актуальны

## Разработка

### Настройка локальной разработки
```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Отредактируйте .env с вашей конфигурацией

# Запуск миграций базы данных
npm run knex:dev migrate latest

# Запуск seed'ов базы данных
npm run knex:dev seed run

# Запуск в режиме разработки
npm run dev
```

### Операции с базой данных
```bash
# Создание новой миграции
npm run knex:dev migrate make migration_name

# Запуск миграций
npm run knex:dev migrate latest

# Откат последней миграции
npm run knex:dev migrate rollback

# Создание нового seed'а
npm run knex:dev seed make seed_name

# Запуск seed'ов
npm run knex:dev seed run
```

### Команды разработки
```bash
# Проверка типов
npm run tsc:check

# Форматирование кода
npm run prettier-format

# Линтинг
npm run eslint-fix

# Сборка для продакшена
npm run build

# Запуск продакшен сборки
npm run start
```

## Устранение неполадок

### Частые проблемы

#### 1. Миграция не выполняется
```bash
# Очистка базы данных и перезапуск
docker-compose down -v
docker-compose up -d --build
```

#### 2. Ошибки WB API
- Проверьте действительность API ключа
- Убедитесь в лимитах (60 запросов/минуту)
- Проверьте формат даты YYYY-MM-DD
- Проверьте статус WB API

#### 3. Отказ в доступе к Google Sheets
- Проверьте учетные данные service account
- Проверьте разрешения на доступ к таблицам
- Убедитесь, что Google Sheets API включен
- Проверьте ID таблиц

#### 4. Проблемы подключения к базе данных
- Убедитесь, что контейнер PostgreSQL здоров
- Проверьте учетные данные базы данных
- Проверьте сетевое подключение
- Просмотрите логи базы данных

### Команды отладки
```bash
# Просмотр всех логов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f wb-tariff-service
docker-compose logs -f postgres

# Проверка состояния контейнеров
docker-compose ps

# Доступ к shell контейнера
docker-compose exec wb-tariff-service sh
docker-compose exec postgres psql -U wb_user -d wb_tariffs
```

### Полный сброс
```bash
# Полный сброс (удаляет все данные)
docker-compose down -v
docker volume prune -f
docker-compose up -d --build
```

## Мониторинг и логирование

### Логи приложения
```bash
# Логи в реальном времени
docker-compose logs -f wb-tariff-service

# Просмотр файлов логов
docker-compose exec wb-tariff-service ls -la logs/
```

### Мониторинг базы данных
```bash
# Производительность базы данных
docker-compose exec postgres psql -U wb_user -d wb_tariffs -c "
SELECT 
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables;
"

# Активные подключения
docker-compose exec postgres psql -U wb_user -d wb_tariffs -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = 'wb_tariffs';
"
```

### Метрики производительности
- **Время получения данных**: Среднее время ответа API
- **Операции базы данных**: Производительность вставки/обновления
- **Обновления Google Sheets**: Длительность синхронизации и процент успешных операций
- **Использование памяти**: Потребление ресурсов контейнеров

## Детали архитектуры

### Компоненты сервиса
- **WildberriesService**: Интеграция с API и получение данных
- **DatabaseService**: Операции PostgreSQL и миграции
- **GoogleSheetsService**: Синхронизация таблиц
- **SchedulerService**: Автоматическое управление задачами
- **HealthService**: Мониторинг системы и диагностика

### Конвейер обработки данных
1. **Получение**: Извлечение текущих данных тарифов из WB API
2. **Валидация**: Проверка схемы и очистка данных
3. **Трансформация**: Преобразование формата API в схему базы данных
4. **Сохранение**: Upsert данных с разрешением конфликтов
5. **Синхронизация**: Обновление Google Sheets с отсортированными данными
6. **Мониторинг**: Логирование операций и отслеживание производительности

## Документация API

### Wildberries Box Tariffs API
- **Endpoint**: `https://common-api.wildberries.ru/api/v1/tariffs/box`
- **Метод**: GET
- **Авторизация**: Header API Key
- **Лимит запросов**: 60 запросов/минуту
- **Обязательный параметр**: `date` (формат YYYY-MM-DD)

### Google Sheets API v4
- **Аутентификация**: Service Account
- **Области**: `https://www.googleapis.com/auth/spreadsheets`
- **Операции**: Чтение, запись, обновление данных таблиц
- **Пакетные операции**: Поддерживаются для эффективных обновлений

## 📋 Структура проекта

```
btlz-wb-test/
├── 📄 README.md                    # Этот файл
├── 📄 docker-compose.yml           # Оркестрация мульти-сервисов
├── 📄 Dockerfile                   # Контейнеризация приложения
├── 📄 package.json                 # Зависимости Node.js
├── 📄 tsconfig.json                # Конфигурация TypeScript
├── 📄 .env.example                 # Шаблон переменных окружения
├── 📄 .gitignore                   # Правила игнорирования Git
├── 📁 src/                         # Исходный код приложения
│   ├── 📄 app.ts                   # Главная точка входа приложения
│   ├── 📁 config/                  # Управление конфигурацией
│   │   ├── 📄 env/                 # Переменные окружения
│   │   └── 📄 knex/                # Конфигурация базы данных
│   ├── 📁 services/                # Сервисы бизнес-логики
│   │   ├── 📄 WildberriesService.ts
│   │   ├── 📄 DatabaseService.ts
│   │   ├── 📄 GoogleSheetsService.ts
│   │   └── 📄 SchedulerService.ts
│   ├── 📁 types/                   # Определения TypeScript
│   ├── 📁 utils/                   # Утилиты
│   └── 📁 postgres/                # Файлы базы данных
│       ├── 📁 migrations/          # Миграции базы данных
│       └── 📁 seeds/               # Seed'ы базы данных
├── 📁 config/                      # Внешняя конфигурация
│   └── 📄 google-credentials.json  # Google service account
└── 📁 logs/                        # Логи приложения
```