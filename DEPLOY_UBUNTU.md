# Инструкция по деплою на Ubuntu 24.04

## Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2 для управления процессами
sudo npm install -g pm2

# Установка Nginx
sudo apt install -y nginx
```

## Настройка Nginx

Создайте конфигурационный файл:

```bash
sudo nano /etc/nginx/sites-available/kabanstore
```

Добавьте следующий конфиг:

```nginx
server {
    listen 80;
    server_name kabanstore.com www.kabanstore.com;

    # Фронтенд (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Бэкенд (если отдельный порт)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Статические файлы
    location /uploads/ {
        alias /var/www/kabanstore/backend/uploads/;
    }
}
```

Активируйте конфиг:

```bash
sudo ln -s /etc/nginx/sites-available/kabanstore /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Деплой приложения

```bash
# Создание директории
sudo mkdir -p /var/www/kabanstore
cd /var/www/kabanstore

# Клонирование репозитория
sudo git clone https://github.com/your-repo/mini-market.git .

# Установка зависимостей бэкенда
cd backend
npm install

# Установка зависимостей фронтенда
cd ../frontend
npm install
npm run build
```

## Настройка переменных окружения

Создайте файл .env:

```bash
# Backend
cd /var/www/kabanstore/backend
cp .env.example .env
nano .env
```

Основные переменные:
```
PORT=3001
NODE_ENV=production
DB_TYPE=sqlite
DB_STORAGE=./database.sqlite
JWT_SECRET=your-secret-key
FRONTEND_URL=https://kabanstore.com
```

## Запуск с PM2

```bash
# Запуск бэкенда
cd /var/www/kabanstore/backend
pm2 start npm --name "kabanstore-backend" -- run start

# Запуск фронтенда
cd /var/www/kabanstore/frontend
pm2 start npm --name "kabanstore-frontend" -- run start

# Сохранение конфигурации PM2
pm2 save
```

## Настройка SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kabanstore.com -d www.kabanstore.com
```

## Автозапуск после перезагрузки

```bash
pm2 startup
# Следуйте инструкциям, которые выведет команда
```

## Команды управления

```bash
# Просмотр логов
pm2 logs kabanstore-backend
pm2 logs kabanstore-frontend

# Перезапуск
pm2 restart kabanstore-backend
pm2 restart kabanstore-frontend

# Статус
pm2 status
```
