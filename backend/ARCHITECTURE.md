# Архитектура проекта

## Обзор

Система активационных кодов - веб-приложение для управления и распространения цифровых товаров через активационные коды.

## Технологический стек

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **База данных**: PostgreSQL
- **ORM**: Sequelize
- **Аутентификация**: JWT (Access + Refresh tokens)
- **Валидация**: express-validator
- **Логирование**: Winston
- **Защита**: helmet, express-rate-limit

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React + TypeScript
- **Стили**: Tailwind CSS
- **Состояние**: React Context + React Query
- **HTTP**: Axios

---

## Структура проекта

```
mini-market/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── config/         # Конфигурация
│   │   ├── controllers/    # Контроллеры
│   │   ├── db/
│   │   │   ├── connection.ts   # Подключение к БД
│   │   │   └── models/         # Модели Sequelize
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API маршруты
│   │   ├── services/      # Бизнес-логика
│   │   └── index.ts       # Точка входа
│   ├── uploads/           # Загруженные файлы
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # Next.js приложение
│   ├── src/
│   │   ├── app/           # App Router страницы
│   │   ├── components/    # React компоненты
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Утилиты
│   │   ├── services/      # API сервисы
│   │   └── store/         # Глобальное состояние
│   ├── package.json
│   └── tailwind.config.js
│
└── database/              # База данных
    └── schema.sql         # SQL схема
```

---

## База данных

### Основные таблицы

1. **users** - Администраторы
2. **categories** - Категории товаров
3. **products** - Товары
4. **instruction_templates** - Шаблоны инструкций
5. **product_files** - Файлы товаров
6. **activation_codes** - Активационные коды
7. **activations** - Лог активаций
8. **admin_logs** - Логи действий админов
9. **code_attempts** - Защита от brute-force
10. **settings** - Настройки системы
11. **languages** - Языки (мультиязычность)
12. **translations** - Переводы

### Связи

```
Category (1) ─────< Product (M)
Product (1) ─────< ProductFile (M)
Product (1) ─────< InstructionTemplate (M)
Product (1) ─────< ActivationCode (M)
ActivationCode (1) ─────< Activation (M)
User (1) ─────< ActivationCode (M)
User (1) ─────< AdminLog (M)
```

---

## Логика проверки кодов

### Процесс активации

```
1. Получение запроса с кодом
   │
2. Проверка IP на блокировку (brute-force protection)
   │   └─ Если заблокирован → вернуть ошибку
   │
3. Поиск кода в БД
   │   └─ Если не найден → запись неудачной попытки → ошибка
   │
4. Проверка статуса кода
   │   └─ Если blocked/used/expired → запись попытки → ошибка
   │
5. Проверка лимита использований
   │   └─ Если исчерпан → обновление статуса → ошибка
   │
6. Проверка привязки к товару
   │   └─ Если нет товара → ошибка
   │
7. Выбор шаблона инструкции по типу кода
   │
8. Применение метаданных кода (уникальный контент)
   │
9. Обновление статуса кода в транзакции
   │
10. Логирование активации
    │
11. Запись успешной попытки
    │
12. Возврат данных товара
```

### Защита от brute-force

- Максимум 5 попыток за 15 минут
- Блокировка на 30 минут при превышении
- Логирование IP-адресов

---

## API Endpoints

### Публичные
- `POST /api/v1/activate` - Активация кода
- `GET /api/v1/activate/status/:code` - Проверка статуса

### Аутентификация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/refresh` - Обновление токена
- `GET /api/v1/auth/me` - Текущий пользователь

### Админ
- `GET/POST /api/v1/admin/categories` - Категории
- `PUT/DELETE /api/v1/admin/categories/:id`
- `GET/POST /api/v1/admin/products` - Товары
- `PUT/DELETE /api/v1/admin/products/:id`
- `POST /api/v1/admin/products/:id/files` - Файлы
- `DELETE /api/v1/admin/files/:id`
- `GET /api/v1/admin/codes` - Коды
- `POST /api/v1/admin/codes/generate` - Генерация
- `POST /api/v1/admin/codes/import` - Импорт
- `GET /api/v1/admin/codes/export` - Экспорт
- `POST /api/v1/admin/codes/:id/block` - Блокировка
- `POST /api/v1/admin/codes/:id/unblock` - Разблокировка
- `GET /api/v1/admin/stats` - Статистика
- `GET/PUT /api/v1/admin/settings` - Настройки
- `GET /api/v1/admin/logs` - Логи

---

## Безопасность

### Аутентификация и авторизация
- JWT токены (access + refresh)
- Хеширование паролей bcrypt
- Роли: admin, super_admin

### Защита от атак
- Helmet (заголовки безопасности)
- Rate limiting (общий и специфичный)
- CORS настройки
- Валидация входных данных

### Защита от повторной активации
- Проверка статуса кода
- Логирование активаций
- Привязка к IP

---

## Развёртывание

### Требования
- Node.js 18+
- PostgreSQL 14+
- PM2 (для production)

### Переменные окружения
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_market
DB_USER=postgres
DB_PASSWORD=***
JWT_SECRET=***
JWT_REFRESH_SECRET=***
```

### Команды
```bash
# Установка
npm install

# Развивка БД
npm run db:migrate

# Запуск dev
npm run dev

# Запуск production
npm run build
npm start
```

---

## Масштабирование

### Горизонтальное масштабирование
- Stateless API (токены)
- Сессии в Redis
- CDN для статики

### Оптимизация
- Индексы в БД
- Кеширование (Redis)
- Пагинация
- Lazy loading файлов
