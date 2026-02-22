# Инструкция по деплою KABANSTORE на Ubuntu 24.04

## Домен: kabanstore.com

---

## Предварительная подготовка

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка Node.js
node --version  # Должно быть v20.x.x
npm --version

# Установка PM2 для управления процессами
sudo npm install -g pm2

# Установка Nginx
sudo apt install -y nginx

# Установка Git (если не установлен)
sudo apt install -y git
```

### 2. Настройка Firewall

```bash
# Открыть порты
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

---

## Настройка Nginx

### 1. Создайте конфигурационный файл:

```bash
sudo nano /etc/nginx/sites-available/kabanstore
```

### 2. Добавьте следующий конфиг:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name kabanstore.com www.kabanstore.com;

    # Статические файлы (загрузки) - проксируем на бэкенд
    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Бэкенд (API)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Фронтенд (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Активируйте конфиг:

```bash
sudo ln -s /etc/nginx/sites-available/kabanstore /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # Удалить default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Деплой приложения

### 1. Создание директории и клонирование

```bash
cd /var/www
sudo mkdir -p kabanstore
cd kabanstore
sudo chown $USER:$USER /var/www/kabanstore

# Клонируйте ваш репозиторий
git clone https://github.com/your-repo/mini-market.git .
```

### 2. Настройка базы данных

```bash
# База данных SQLite уже есть в проекте (backend/database.sqlite)
# Файл будет создан автоматически при первом запуске
```

### 3. Настройка переменных окружения

```bash
# Backend
cd /var/www/kabanstore/backend

# Скопируйте и отредактируйте .env
cp .env.example .env
nano .env
```

**Убедитесь что в .env следующие настройки:**
```env
PORT=3001
NODE_ENV=production
DB_TYPE=sqlite
DB_STORAGE=./database.sqlite
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=https://kabanstore.com
```

### 4. Установка зависимостей бэкенда

```bash
cd /var/www/kabanstore/backend

# Установите ВСЕ зависимости (включая devDependencies для сборки)
npm install

# Скомпилируйте TypeScript
npm run build
```

### 5. Установка зависимостей фронтенда

```bash
cd /var/www/kabanstore/frontend
npm install
npm run build
```

---

## Запуск с PM2

### 1. Запуск бэкенда

```bash
cd /var/www/kabanstore/backend
pm2 start npm --name "kabanstore-backend" -- run start
```

### 2. Запуск фронтенда

```bash
cd /var/www/kabanstore/frontend
pm2 start npm --name "kabanstore-frontend" -- run start
```

### 3. Проверка статуса

```bash
pm2 status
```

Должно быть два процесса запущено:
- kabanstore-backend (порт 3001)
- kabanstore-frontend (порт 3000)

### 4. Сохранение конфигурации PM2

```bash
pm2 save
```

---

## Настройка SSL (Let's Encrypt)

```bash
# Установка certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
sudo certbot --nginx -d kabanstore.com -d www.kabanstore.com

# Следуйте инструкциям:
# - Введите email
# - Примите условия
# - Выберите "No" для перенаправления HTTP на HTTPS
```

### Проверка автообновления SSL

```bash
sudo certbot renew --dry-run
```

---

## Автозапуск после перезагрузки

```bash
# Генерация скрипта автозапуска
pm2 startup

# Скопируйте и выполните команду, которую выведет pm2
# Например:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

---

## Команды управления

```bash
# Просмотр логов
pm2 logs kabanstore-backend
pm2 logs kabanstore-frontend

# Перезапуск
pm2 restart kabanstore-backend
pm2 restart kabanstore-frontend

# Перезапуск всех
pm2 restart all

# Мониторинг
pm2 monit

# Статус
pm2 status
```

---

## Структура директорий после деплоя

```
/var/www/kabanstore/
├── backend/
│   ├── src/
│   ├── uploads/          # Загруженные файлы
│   ├── database.sqlite   # База данных
│   ├── package.json
│   ├── .env              # Настройки окружения
│   └── dist/            # Скомпилированный JS
├── frontend/
│   ├── src/
│   ├── .next/           # Скомпилированный Next.js
│   ├── package.json
│   └── .env
└── package.json
```

---

## Проверка работоспособности

```bash
# Тест бэкенда
curl https://kabanstore.com/health

# Тест фронтенда
curl http://localhost:3000

# Тест через домен (после настройки DNS)
curl http://kabanstore.com
```

---

## Возможные проблемы

### 1. Ошибка подключения к базе данных

```bash
# Проверьте права на файл БД
chmod 755 backend/database.sqlite
```

### 2. Ошибки CORS

Убедитесь что в `backend/.env`:
```
FRONTEND_URL=https://kabanstore.com
```

### 3. Ошибки статических файлов

```bash
# Создайте директорию для загрузок
mkdir -p /var/www/kabanstore/backend/uploads
chmod -R 755 /var/www/kabanstore/backend/uploads
```

### 4. Пересборка фронтенда после изменений

```bash
cd /var/www/kabanstore/frontend
npm run build
pm2 restart kabanstore-frontend
```

---

## Обновление приложения

```bash
cd /var/www/kabanstore

# Стянуть изменения
git pull origin main

# Обновить зависимости
cd backend && npm install --production && cd ..
cd frontend && npm install && npm run build && cd ..

# Перезапустить
pm2 restart all
```
