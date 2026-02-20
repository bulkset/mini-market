# Как удалить PostgreSQL с macOS

## Способ 1: Через Homebrew (если установлен через brew)

```bash
brew uninstall postgresql@14
brew uninstall postgresql@15
brew uninstall postgresql@16
brew cleanup
```

## Способ 2: Удаление вручную (для PostgreSQL 15)

1. **Остановите PostgreSQL** (если запущен):
   - Системные настройки → PostgreSQL → Stop Server
   - или через терминал: `sudo launchctl unload /Library/LaunchDaemons/com.postgreslaunchd.postgres.plist`

2. **Удалите файлы** (нужен пароль администратора):
   ```bash
   sudo rm -rf /Library/PostgreSQL/15
   sudo rm -rf /var/postgres
   sudo rm -rf /Users/ваше_имя/postgres
   ```

3. **Удалите пользователя postgres**:
   ```bash
   sudo dscl . -delete /Users/postgres
   ```

4. **Удалите службу** (если есть):
   ```bash
   sudo rm /Library/LaunchDaemons/com.postgreslaunchd.postgres.plist
   ```

## После удаления

Установите свежий PostgreSQL через Homebrew:

```bash
brew install postgresql@15
brew services start postgresql@15

# Создайте базу данных
createdb mini_market -U postgres
```

---

## Затем запустите проект:

```bash
cd /Users/chupapa/Documents/vscode/mini-market
npm run dev
```
