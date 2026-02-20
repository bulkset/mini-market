# Сброс пароля PostgreSQL на macOS

## Способ 1: Через Homebrew (рекомендуемый)

### Шаг 1: Остановите PostgreSQL
```bash
brew services stop postgresql
```

### Шаг 2: Запустите в однопользовательском режиме
```bash
mkdir -p /usr/local/var/postgres
pg_ctl -D /usr/local/var/postgres -l /usr/local/var/postgres/logfile start
```

### Шаг 3: Измените пароль
```bash
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

### Шаг 4: Остановите и перезапустите
```bash
pg_ctl -D /usr/local/var/postgres stop
brew services start postgresql
```

---

## Способ 2: Переустановка PostgreSQL

```bash
# Остановка и удаление
brew services stop postgresql
brew uninstall postgresql

# Чистая установка
brew install postgresql@14
brew services start postgresql@14

# Создание суперпользователя (если нужно)
createuser -s postgres
```

---

## Способ 3: Изменение метода аутентификации

### Найдите файл pg_hba.conf:
```bash
sudo find /usr -name "pg_hba.conf" 2>/dev/null
```

Обычно находится в:
- `/usr/local/var/postgresql@14/pg_hba.conf`
- или `/opt/homebrew/var/postgresql@14/pg_hba.conf`

### Измените строку:
```
# Было:
host    all             all             127.0.0.1/32            md5

# Стало:
host    all             all             127.0.0.1/32            trust
```

### Перезагрузите PostgreSQL:
```bash
brew services restart postgresql
```

---

## После сброса пароля

1. Создайте базу данных:
```bash
createdb mini_market -U postgres
```

2. Обновите пароль в файле `backend/.env`:
```
DB_PASSWORD=postgres
```

3. Запустите сервер:
```bash
cd mini-market
npm run dev
```
