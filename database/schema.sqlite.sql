-- =====================================================
-- СИСТЕМА АКТИВАЦИОННЫХ КОДОВ - SQLite Database
-- =====================================================

-- -----------------------------------------------------
-- Таблица пользователей (администраторов)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    name TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица категорий товаров
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица товаров
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    short_description TEXT,
    type TEXT DEFAULT 'digital_file',
    instruction TEXT,
    instruction_template_id TEXT REFERENCES instruction_templates(id) ON DELETE SET NULL,
    image_url TEXT,
    status TEXT DEFAULT 'active',
    price REAL DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица шаблонов инструкций
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS instruction_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    content TEXT,
    code_type TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица файлов товаров
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS product_files (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    file_type TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица активационных кодов
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS activation_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    usage_limit INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    activated_at TEXT,
    expires_at TEXT,
    user_ip TEXT,
    user_email TEXT,
    code_type TEXT,
    metadata TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы кодов
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_status ON activation_codes(status);
CREATE INDEX IF NOT EXISTS idx_activation_codes_product ON activation_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_expires ON activation_codes(expires_at);

-- -----------------------------------------------------
-- Таблица активаций (лог всех активаций)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS activations (
    id TEXT PRIMARY KEY,
    code_id TEXT REFERENCES activation_codes(id) ON DELETE CASCADE,
    user_ip TEXT,
    user_agent TEXT,
    activated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    session_data TEXT
);

CREATE INDEX IF NOT EXISTS idx_activations_code ON activations(code_id);
CREATE INDEX IF NOT EXISTS idx_activations_date ON activations(activated_at);

-- -----------------------------------------------------
-- Таблица логов действий (для админ-панели)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_data TEXT,
    new_data TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_user ON admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_entity ON admin_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_date ON admin_logs(created_at);

-- -----------------------------------------------------
-- Таблица языков (для мультиязычности)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
);

-- -----------------------------------------------------
-- Таблица переводов
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS translations (
    id TEXT PRIMARY KEY,
    language_id TEXT REFERENCES languages(id) ON DELETE CASCADE,
    entity_type TEXT,
    entity_id TEXT,
    field TEXT NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language_id, entity_type, entity_id, field)
);

-- -----------------------------------------------------
-- Таблица настроек
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица попыток ввода кода (для защиты от brute-force)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS code_attempts (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    code_hash TEXT,
    is_success INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 1,
    blocked_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_code_attempts_ip ON code_attempts(ip_address);

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================

-- Языки
INSERT OR IGNORE INTO languages (id, code, name, is_default, is_active, sort_order) VALUES
('lang-1', 'ru', 'Русский', 1, 1, 1),
('lang-2', 'en', 'English', 0, 1, 2),
('lang-3', 'uz', 'O''zbekcha', 0, 1, 3);

-- Категории
INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order) VALUES
('cat-1', 'Цифровые товары', 'digital', 'Цифровые файлы и программы', 1),
('cat-2', 'Игры', 'games', 'Игровые ключи и контент', 2),
('cat-3', 'Программное обеспечение', 'software', 'Лицензии и программы', 3),
('cat-4', 'Курсы', 'courses', 'Обучающие материалы', 4);

-- Настройки
INSERT OR IGNORE INTO settings (id, key, value, description, category) VALUES
('set-1', 'site_name', '"KABAN STORE"', 'Название сайта', 'general'),
('set-2', 'site_description', '"Система активационных кодов"', 'Описание сайта', 'general'),
('set-3', 'dark_mode_enabled', 'true', 'Включена ли тёмная тема', 'general'),
('set-4', 'max_attempts', '5', 'Максимальное количество попыток ввода кода', 'security'),
('set-5', 'attempt_window_minutes', '15', 'Окно времени для подсчёта попыток (минуты)', 'security'),
('set-6', 'block_duration_minutes', '30', 'Длительность блокировки после превышения попыток', 'security'),
('set-7', 'codes_expiration_days', '365', 'Срок действия кодов по умолчанию (дни)', 'general'),
('set-8', 'files_storage_path', '"./uploads"', 'Путь для хранения файлов', 'storage');
