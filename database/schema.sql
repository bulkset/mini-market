-- =====================================================
-- СИСТЕМА АКТИВАЦИОННЫХ КОДОВ - База данных PostgreSQL
-- =====================================================

-- Включение расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ТАБЛИЦЫ
-- =====================================================

-- -----------------------------------------------------
-- Таблица пользователей (администраторов)
-- -----------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица категорий товаров
-- -----------------------------------------------------
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица товаров
-- -----------------------------------------------------
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    short_description VARCHAR(500),
    type VARCHAR(50) DEFAULT 'digital_file', -- digital_file, text_instruction, link, closed_page
    instruction HTML, -- HTML контент для инструкции
    instruction_template_id UUID REFERENCES instruction_templates(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, hidden, draft
    price DECIMAL(10, 2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица шаблонов инструкций (для разных типов кодов)
-- -----------------------------------------------------
CREATE TABLE instruction_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    content TEXT, -- HTML шаблон инструкции
    code_type VARCHAR(100), -- тип кода, для которого применяется этот шаблон
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица файлов товаров
-- -----------------------------------------------------
CREATE TABLE product_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_type VARCHAR(50), -- pdf, image, archive, other
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица активационных кодов
-- -----------------------------------------------------
CREATE TABLE activation_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) UNIQUE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, used, blocked, expired
    usage_limit INT DEFAULT 1, -- количество возможных активаций
    usage_count INT DEFAULT 0, -- количество использований
    activated_at TIMESTAMP, -- дата активации
    expires_at TIMESTAMP, -- срок действия
    user_ip INET, -- IP при активации
    user_email VARCHAR(255), -- email при активации (если требуется)
    code_type VARCHAR(100), -- тип кода для выбора шаблона инструкции
    metadata JSONB, -- дополнительные данные (уникальный контент для кода)
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы кодов
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_activation_codes_status ON activation_codes(status);
CREATE INDEX idx_activation_codes_product ON activation_codes(product_id);
CREATE INDEX idx_activation_codes_expires ON activation_codes(expires_at);

-- -----------------------------------------------------
-- Таблица активаций (лог всех активаций)
-- -----------------------------------------------------
CREATE TABLE activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID REFERENCES activation_codes(id) ON DELETE CASCADE,
    user_ip INET,
    user_agent TEXT,
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_data JSONB
);

CREATE INDEX idx_activations_code ON activations(code_id);
CREATE INDEX idx_activations_date ON activations(activated_at);

-- -----------------------------------------------------
-- Таблица логов действий (для админ-панели)
-- -----------------------------------------------------
CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100), -- product, category, code, user
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_logs_user ON admin_logs(user_id);
CREATE INDEX idx_admin_logs_entity ON admin_logs(entity_type, entity_id);
CREATE INDEX idx_admin_logs_date ON admin_logs(created_at);

-- -----------------------------------------------------
-- Таблица языков (для мультиязычности)
-- -----------------------------------------------------
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL, -- ru, en, uz
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0
);

-- -----------------------------------------------------
-- Таблица переводов
-- -----------------------------------------------------
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
    entity_type VARCHAR(100), -- product, category
    entity_id UUID,
    field VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(language_id, entity_type, entity_id, field)
);

-- -----------------------------------------------------
-- Таблица настроек
-- -----------------------------------------------------
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    category VARCHAR(100), -- general, security, email, etc.
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Таблица попыток ввода кода (для защиты от brute-force)
-- -----------------------------------------------------
CREATE TABLE code_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ip_address INET NOT NULL,
    code_hash VARCHAR(255), -- хэш введённого кода
    is_success BOOLEAN DEFAULT false,
    attempt_count INT DEFAULT 1,
    blocked_until TIMESTAMP, -- время до разблокировки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_code_attempts_ip ON code_attempts(ip_address);
CREATE INDEX idx_code_attempts_blocked ON code_attempts(blocked_until) WHERE blocked_until IS NOT NULL;

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================

-- Языки
INSERT INTO languages (code, name, is_default, is_active, sort_order) VALUES
('ru', 'Русский', true, true, 1),
('en', 'English', false, true, 2),
('uz', 'O\'zbekcha', false, true, 3);

-- Категории
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Цифровые товары', 'digital', 'Цифровые файлы и программы', 1),
('Игры', 'games', 'Игровые ключи и контент', 2),
('Программное обеспечение', 'software', 'Лицензии и программы', 3),
('Курсы', 'courses', 'Обучающие материалы', 4);

-- Настройки
INSERT INTO settings (key, value, description, category) VALUES
('site_name', '"KABAN STORE"', 'Название сайта', 'general'),
('site_description', '"Система активационных кодов"', 'Описание сайта', 'general'),
('dark_mode_enabled', 'true', 'Включена ли тёмная тема', 'general'),
('max_attempts', '5', 'Максимальное количество попыток ввода кода', 'security'),
('attempt_window_minutes', '15', 'Окно времени для подсчёта попыток (минуты)', 'security'),
('block_duration_minutes', '30', 'Длительность блокировки после превышения попыток', 'security'),
('codes_expiration_days', '365', 'Срок действия кодов по умолчанию (дни)', 'general'),
('files_storage_path', '"./uploads"', 'Путь для хранения файлов', 'storage');

-- =====================================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- =====================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activation_codes_updated_at BEFORE UPDATE ON activation_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для очистки старых попыток ввода
CREATE OR REPLACE FUNCTION cleanup_old_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM code_attempts 
    WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ СТАТИСТИКИ
-- =====================================================

-- Статистика по активациям
CREATE OR REPLACE VIEW activation_stats AS
SELECT 
    DATE(activated_at) as date,
    COUNT(*) as total_activations,
    COUNT(DISTINCT user_ip) as unique_ips,
    COUNT(DISTINCT code_id) as unique_codes
FROM activations
GROUP BY DATE(activated_at);

-- Статистика по товарам
CREATE OR REPLACE VIEW product_activation_stats AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    COUNT(ac.id) as total_codes,
    COUNT(CASE WHEN ac.status = 'used' THEN 1 END) as used_codes,
    COUNT(CASE WHEN ac.status = 'active' THEN 1 END) as active_codes,
    COUNT(CASE WHEN ac.status = 'blocked' THEN 1 END) as blocked_codes,
    SUM(ac.usage_count) as total_activations
FROM products p
LEFT JOIN activation_codes ac ON ac.product_id = p.id
GROUP BY p.id, p.name;

-- =====================================================
-- ПРАВА ДОСТУПА
-- =====================================================

-- Создание ролей (для использования с PostgreSQL)
-- CREATE ROLE admin_user WITH LOGIN PASSWORD 'your_password';
-- GRANT ALL PRIVILEGES ON DATABASE mini_market TO admin_user;
