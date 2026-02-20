# API Документация

## Содержание

1. [Общая информация](#общая-информация)
2. [Аутентификация](#аутентификация)
3. [Публичный API](#публичный-api)
4. [Админ API](#админ-api)

---

## Общая информация

Базовый URL: `http://localhost:3001/api/v1`

Все ответы имеют следующую структуру:

### Успешный ответ
```json
{
  "success": true,
  "data": { }
}
```

### Ошибка
```json
{
  "success": false,
  "error": "Сообщение об ошибке"
}
```

### Заголовки
- `Content-Type: application/json`
- Для защищённых маршрутов: `Authorization: Bearer <token>`

---

## Аутентификация

### Вход администратора
**POST** `/auth/login`

Тело запроса:
```json
{
  "email": "admin@example.com",
  "password": "secure_password"
}
```

Ответ:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "admin"
    }
  }
}
```

### Обновление токена
**POST** `/auth/refresh`

Тело запроса:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

### Регистрация администратора
**POST** `/auth/register`

Тело запроса:
```json
{
  "email": "admin@example.com",
  "password": "secure_password",
  "name": "Admin Name"
}
```

### Текущий пользователь
**GET** `/auth/me`

Требуется: `Authorization: Bearer <token>`

---

## Публичный API

### Активация кода
**POST** `/activate`

Тело запроса:
```json
{
  "code": "ABCD1234EFGH"
}
```

Ответ (успех):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Название товара",
    "slug": "product-slug",
    "description": "Описание товара",
    "shortDescription": "Краткое описание",
    "type": "digital_file",
    "instruction": "<h1>Инструкция</h1><p>...</p>",
    "files": [
      {
        "id": "uuid",
        "fileName": "file-uuid.ext",
        "originalName": "document.pdf",
        "filePath": "/uploads/file-uuid.ext",
        "mimeType": "application/pdf",
        "fileType": "pdf"
      }
    ]
  }
}
```

Ответ (ошибка):
```json
{
  "success": false,
  "error": "Код не найден"
}
```

Возможные ошибки:
- `Код обязателен`
- `Код слишком короткий`
- `Код не найден`
- `Код заблокирован`
- `Код уже использован`
- `Срок действия кода истёк`
- `Лимит использований исчерпан`
- `Код не привязан к товару`
- `Слишком много попыток`

### Проверка статуса кода
**GET** `/activate/status/:code`

Используется для предварительной проверки кода (без активации).

---

## Админ API

Все маршруты админ API требуют `Authorization: Bearer <token>`

### Категории

#### Список категорий
**GET** `/admin/categories`

Параметры запроса: нет

Ответ:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Цифровые товары",
      "slug": "digital",
      "description": "...",
      "sortOrder": 1,
      "isActive": true,
      "children": []
    }
  ]
}
```

#### Создание категории
**POST** `/admin/categories`

Тело запроса:
```json
{
  "name": "Название",
  "slug": "category-slug",
  "description": "Описание",
  "sortOrder": 1,
  "parentId": "uuid-родителя"
}
```

#### Обновление категории
**PUT** `/admin/categories/:id`

#### Удаление категории
**DELETE** `/admin/categories/:id`

---

### Товары

#### Список товаров
**GET** `/admin/products`

Параметры запроса:
- `page` - номер страницы (по умолчанию 1)
- `limit` - количество на странице (по умолчанию 10)
- `categoryId` - фильтр по категории
- `status` - фильтр по статусу (active, hidden, draft)
- `search` - поиск по названию

#### Создание товара
**POST** `/admin/products`

Тело запроса:
```json
{
  "name": "Название товара",
  "slug": "product-slug",
  "categoryId": "uuid-категории",
  "description": "Полное описание",
  "shortDescription": "Краткое описание",
  "type": "digital_file",
  "instruction": "<p>HTML инструкция</p>",
  "status": "active",
  "price": 0,
  "isFeatured": false
}
```

Типы товаров:
- `digital_file` - цифровой файл
- `text_instruction` - текстовая инструкция
- `link` - ссылка
- `closed_page` - закрытая страница

#### Обновление товара
**PUT** `/admin/products/:id`

#### Удаление товара
**DELETE** `/admin/products/:id`

---

### Файлы

#### Загрузка файла
**POST** `/admin/products/:id/files`

Content-Type: `multipart/form-data`

Поле: `file` - загружаемый файл

#### Удаление файла
**DELETE** `/admin/files/:id`

---

### Коды

#### Список кодов
**GET** `/admin/codes`

Параметры:
- `page` - страница
- `limit` - количество (по умолчанию 20)
- `productId` - фильтр по товару
- `status` - фильтр по статусу (active, used, blocked)
- `search` - поиск по коду

#### Генерация кодов
**POST** `/admin/codes/generate`

Тело запроса:
```json
{
  "productId": "uuid-товара",
  "count": 100,
  "prefix": "PROMO",
  "length": 12,
  "usageLimit": 1,
  "expiresInDays": 365,
  "codeType": "premium"
}
```

Ответ:
```json
{
  "success": true,
  "data": {
    "codes": ["PROMO12345678", "PROMO87654321", ...]
  }
}
```

#### Импорт кодов из CSV
**POST** `/admin/codes/import`

Content-Type: `multipart/form-data`

Поле: `file` - CSV файл

Формат CSV:
```csv
code,productId,usageLimit,expiresAt,codeType
ABCD1234,uuid,1,2025-12-31,premium
EFGH5678,uuid,1,,standard
```

#### Экспорт кодов
**GET** `/admin/codes/export?productId=uuid&status=active`

Возвращает CSV файл

#### Блокировка кода
**POST** `/admin/codes/:id/block`

#### Разблокировка кода
**POST** `/admin/codes/:id/unblock`

---

### Статистика

#### Общая статистика
**GET** `/admin/stats`

Ответ:
```json
{
  "success": true,
  "data": {
    "codes": {
      "total": 1000,
      "used": 500,
      "active": 480,
      "blocked": 20
    },
    "byProduct": [
      {
        "productId": "uuid",
        "product": { "name": "Товар" },
        "total": 100,
        "used": 50
      }
    ],
    "byDate": [
      { "date": "2024-01-01", "count": 10 }
    ]
  }
}
```

---

### Настройки

#### Получение настроек
**GET** `/admin/settings`

#### Обновление настроек
**PUT** `/admin/settings`

Тело запроса:
```json
{
  "site_name": "Mini Market",
  "dark_mode_enabled": true,
  "max_attempts": 5
}
```

---

### Логи

#### Список логов
**GET** `/admin/logs`

Параметры:
- `page` - страница
- `limit` - количество
- `action` - фильтр по действию
- `entityType` - фильтр по типу сущности

---

## Коды ошибок HTTP

- `200` - Успешно
- `201` - Создано
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Запрещено
- `404` - Не найдено
- `500` - Внутренняя ошибка сервера
