# Инструкция по настройке PostgreSQL

## Шаг 1: Сброс пароля PostgreSQL

Введите в терминале следующую команду (вам потребуется ввести пароль от вашего Mac):

```bash
sudo sed -i '' 's/md5/trust/g' /Library/PostgreSQL/15/data/pg_hba.conf
```

Затем перезагрузите PostgreSQL:

```bash
pg_ctl reload -D /Library/PostgreSQL/15/data
```

## Шаг 2: Создание базы данных

После сброса пароля создайте базу данных:

```bash
createdb mini_market -U postgres
```

## Шаг 3: Запуск приложения

```bash
cd /Users/chupapa/Documents/vscode/mini-market
npm run dev
```

---

## Альтернативный способ (через psql)

Если первый способ не работает:

1. Остановите текущий PostgreSQL:
```bash
sudo launchctl stop com.postgreslaunchd.postgres
```

2. Запустите в безопасном режиме:
```bash
sudo -u postgres /Library/PostgreSQL/15/bin/postgres -D /Library/PostgreSQL/15/data -c "listen_addresses=''" -c "unix_socket_directories='/tmp'"
```

3. В другом терминале подключитесь:
```bash
psql -U postgres -h localhost
```

4. Измените пароль:
```sql
ALTER USER postgres WITH PASSWORD 'ваш_новый_пароль';
\q
```

5. Остановите безопасный режим (Ctrl+C) и запустите正常но:
```bash
sudo launchctl start com.postgreslaunchd.postgres
```
