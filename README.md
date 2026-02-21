# KABAN STORE - Система активационных кодов

Полноценное веб-приложение для управления и распространения цифровых товаров через активационные коды.

> **Примечание:** По умолчанию используется SQLite (база данных в файле). Для больших нагрузок можно переключиться на PostgreSQL.

## Функционал

### Пользовательская часть
- Страница ввода активационного кода
- Проверка и активация кодов
- Отображение товара с инструкцией и файлами
- Защита от повторной активации

### Админ-панель
- Управление товарами и категориями
- Генерация и импорт активационных кодов
- Статистика и логирование
- Настройки системы

## Технологический стек

- **Backend**: Node.js + Express + SQLite (по умолчанию) / PostgreSQL
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Аутентификация**: JWT (Access + Refresh tokens)

## Структура проекта

```
mini-market/
├── backend/                 # Express.js API сервер
├── frontend/                # Next.js приложение
├── database/               # SQL схема
└── README.md
```

## Установка и запуск

### Требования
- Node.js 18+
- (SQLite включён в Node.js)

### 1. Клонирование и установка зависимостей

```bash
# Клонирование репозитория
cd mini-market

# Установка зависимостей (корневая)
npm install

# Установка зависимостей backend
cd backend && npm install

# Установка зависимостей frontend
cd ../frontend && npm install
```

### 2. Настройка базы данных

```bash
# База данных SQLite уже включена (файл backend/database.sqlite будет создан автоматически)

# Скопируйте файл настроек
cp backend/.env.example backend/.env
```

### 3. Запуск

**Режим разработки:**

```bash
# Запуск backend и frontend одновременно (из корня)
npm run dev

# Или отдельно:
# Терминал 1 - Backend
cd backend && npm run dev

# Терминал 2 - Frontend
cd frontend && npm run dev
```

**Production:**

```bash
# Сборка
npm run build

# Запуск
npm start
```

### 4. Доступ

- **Пользовательская часть**: http://localhost:3000
- **API**: http://localhost:3001
- **Админ-панель**: http://localhost:3000/admin

## Создание администратора

После первого запуска создайте администратора через API:

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure_password",
    "name": "Admin"
  }'
```

## API Endpoints

### Публичные
- `POST /api/v1/activate` - Активация кода

### Аутентификация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/refresh` - Обновление токена

### Админ
- `/api/v1/admin/categories` - Категории
- `/api/v1/admin/products` - Товары
- `/api/v1/admin/codes` - Коды
- `/api/v1/admin/stats` - Статистика
- `/api/v1/admin/settings` - Настройки

Подробнее в [backend/API.md](backend/API.md)

## Структура базы данных

Основные таблицы:
- `users` - Администраторы
- `categories` - Категории
- `products` - Товары
- `activation_codes` - Активационные коды
- `activations` - Лог активаций
- `admin_logs` - Логи действий

Полная схема: [database/schema.sql](database/schema.sql)

## Защита от brute-force

Система автоматически блокирует IP после 5 неудачных попыток ввода кода за 15 минут. Блокировка длится 30 минут.

## Мультиязычность

Поддержка нескольких языков встроена в структуру БД (таблицы `languages` и `translations`).

## Тёмная тема

Включена по умолчанию. Управляется через Tailwind CSS класс `dark`.

## Лицензия

MIT
