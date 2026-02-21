import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../connection.js';

interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  name: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'name' | 'isActive' | 'lastLogin' | 'createdAt' | 'updatedAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare role: string;
  declare name: string | null;
  declare isActive: boolean;
  declare lastLogin: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    role: {
      type: DataTypes.STRING(50),
      defaultValue: 'admin',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
  }
);

// =====================================================
// КАТЕГОРИИ
// =====================================================

interface CategoryAttributes {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'description' | 'sortOrder' | 'isActive' | 'parentId' | 'createdAt' | 'updatedAt'> {}

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  declare id: string;
  declare name: string;
  declare slug: string;
  declare description: string | null;
  declare sortOrder: number;
  declare isActive: boolean;
  declare parentId: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'categories',
    underscored: true,
    timestamps: true,
  }
);

// =====================================================
// ТОВАРЫ
// =====================================================

interface ProductAttributes {
  id: string;
  name: string;
  categoryId: string | null;
  description: string | null;
  shortDescription: string | null;
  type: string;
  instruction: string | null;
  instructionTemplateId: string | null;
  status: string;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'categoryId' | 'description' | 'shortDescription' | 'instruction' | 'instructionTemplateId' | 'status' | 'isFeatured' | 'createdAt' | 'updatedAt'> {}

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  declare id: string;
  declare name: string;
  declare categoryId: string | null;
  declare description: string | null;
  declare shortDescription: string | null;
  declare type: string;
  declare instruction: string | null;
  declare instructionTemplateId: string | null;
  declare status: string;
  declare isFeatured: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'category_id',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'short_description',
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: 'digital_file',
    },
    instruction: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    instructionTemplateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'instruction_template_id',
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'active',
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_featured',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'products',
    underscored: true,
    timestamps: true,
  }
);

// =====================================================
// ШАБЛОНЫ ИНСТРУКЦИЙ
// =====================================================

interface InstructionTemplateAttributes {
  id: string;
  name: string;
  productId: string | null;
  content: string | null;
  codeType: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface InstructionTemplateCreationAttributes extends Optional<InstructionTemplateAttributes, 'id' | 'productId' | 'content' | 'codeType' | 'sortOrder' | 'isActive' | 'createdAt' | 'updatedAt'> {}

export class InstructionTemplate extends Model<InstructionTemplateAttributes, InstructionTemplateCreationAttributes> implements InstructionTemplateAttributes {
  declare id: string;
  declare name: string;
  declare productId: string | null;
  declare content: string | null;
  declare codeType: string | null;
  declare sortOrder: number;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

InstructionTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'product_id',
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    codeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'code_type',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'instruction_templates',
    underscored: true,
    timestamps: true,
  }
);

// =====================================================
// ФАЙЛЫ ТОВАРОВ
// =====================================================

interface ProductFileAttributes {
  id: string;
  productId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  fileType: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
}

interface ProductFileCreationAttributes extends Optional<ProductFileAttributes, 'id' | 'fileSize' | 'mimeType' | 'fileType' | 'sortOrder' | 'isActive' | 'createdAt'> {}

export class ProductFile extends Model<ProductFileAttributes, ProductFileCreationAttributes> implements ProductFileAttributes {
  declare id: string;
  declare productId: string;
  declare fileName: string;
  declare originalName: string;
  declare filePath: string;
  declare fileSize: number | null;
  declare mimeType: string | null;
  declare fileType: string | null;
  declare sortOrder: number;
  declare isActive: boolean;
  declare createdAt: Date;
}

ProductFile.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'product_id',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_name',
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_path',
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'file_size',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type',
    },
    fileType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'file_type',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'product_files',
    underscored: true,
    timestamps: true,
  }
);

// =====================================================
// АКТИВАЦИОННЫЕ КОДЫ
// =====================================================

interface ActivationCodeAttributes {
  id: string;
  code: string;
  productId: string | null;
  status: string;
  usageLimit: number;
  usageCount: number;
  activatedAt: Date | null;
  expiresAt: Date | null;
  userIp: string | null;
  userEmail: string | null;
  codeType: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ActivationCodeCreationAttributes extends Optional<ActivationCodeAttributes, 'id' | 'productId' | 'status' | 'usageLimit' | 'usageCount' | 'activatedAt' | 'expiresAt' | 'userIp' | 'userEmail' | 'codeType' | 'metadata' | 'createdBy' | 'createdAt' | 'updatedAt'> {}

export class ActivationCode extends Model<ActivationCodeAttributes, ActivationCodeCreationAttributes> implements ActivationCodeAttributes {
  declare id: string;
  declare code: string;
  declare productId: string | null;
  declare status: string;
  declare usageLimit: number;
  declare usageCount: number;
  declare activatedAt: Date | null;
  declare expiresAt: Date | null;
  declare userIp: string | null;
  declare userEmail: string | null;
  declare codeType: string | null;
  declare metadata: Record<string, unknown> | null;
  declare createdBy: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

ActivationCode.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'product_id',
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'active',
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'usage_limit',
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'usage_count',
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'activated_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    userIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'user_ip',
    },
    userEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'user_email',
    },
    codeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'code_type',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'created_by',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'activation_codes',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['code'] },
      { fields: ['status'] },
      { fields: ['product_id'] },
      { fields: ['expires_at'] },
    ],
  }
);

// =====================================================
// АКТИВАЦИИ (ЛОГ)
// =====================================================

interface ActivationAttributes {
  id: string;
  codeId: string;
  userIp: string | null;
  userAgent: string | null;
  activatedAt: Date;
  sessionData: Record<string, unknown> | null;
}

interface ActivationCreationAttributes extends Optional<ActivationAttributes, 'id' | 'userIp' | 'userAgent' | 'activatedAt' | 'sessionData'> {}

export class Activation extends Model<ActivationAttributes, ActivationCreationAttributes> implements ActivationAttributes {
  declare id: string;
  declare codeId: string;
  declare userIp: string | null;
  declare userAgent: string | null;
  declare activatedAt: Date;
  declare sessionData: Record<string, unknown> | null;
}

Activation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    codeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'code_id',
    },
    userIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'user_ip',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent',
    },
    activatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'activated_at',
    },
    sessionData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'session_data',
    },
  },
  {
    sequelize,
    tableName: 'activations',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['code_id'] },
      { fields: ['activated_at'] },
    ],
  }
);

// =====================================================
// ЛОГИ АДМИНА
// =====================================================

interface AdminLogAttributes {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

interface AdminLogCreationAttributes extends Optional<AdminLogAttributes, 'id' | 'userId' | 'entityType' | 'entityId' | 'oldData' | 'newData' | 'ipAddress' | 'createdAt'> {}

export class AdminLog extends Model<AdminLogAttributes, AdminLogCreationAttributes> implements AdminLogAttributes {
  declare id: string;
  declare userId: string | null;
  declare action: string;
  declare entityType: string | null;
  declare entityId: string | null;
  declare oldData: Record<string, unknown> | null;
  declare newData: Record<string, unknown> | null;
  declare ipAddress: string | null;
  declare createdAt: Date;
}

AdminLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'entity_id',
    },
    oldData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'old_data',
    },
    newData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'new_data',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'admin_logs',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['created_at'] },
    ],
  }
);

// =====================================================
// ЯЗЫКИ
// =====================================================

interface LanguageAttributes {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface LanguageCreationAttributes extends Optional<LanguageAttributes, 'id' | 'isDefault' | 'isActive' | 'sortOrder'> {}

export class Language extends Model<LanguageAttributes, LanguageCreationAttributes> implements LanguageAttributes {
  declare id: string;
  declare code: string;
  declare name: string;
  declare isDefault: boolean;
  declare isActive: boolean;
  declare sortOrder: number;
}

Language.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
    },
  },
  {
    sequelize,
    tableName: 'languages',
    underscored: true,
    timestamps: false,
  }
);

// =====================================================
// ПЕРЕВОДЫ
// =====================================================

interface TranslationAttributes {
  id: string;
  languageId: string;
  entityType: string;
  entityId: string;
  field: string;
  value: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TranslationCreationAttributes extends Optional<TranslationAttributes, 'id' | 'value' | 'createdAt' | 'updatedAt'> {}

export class Translation extends Model<TranslationAttributes, TranslationCreationAttributes> implements TranslationAttributes {
  declare id: string;
  declare languageId: string;
  declare entityType: string;
  declare entityId: string;
  declare field: string;
  declare value: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Translation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    languageId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'language_id',
    },
    entityType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'entity_id',
    },
    field: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'translations',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['language_id', 'entity_type', 'entity_id', 'field'], unique: true },
    ],
  }
);

// =====================================================
// НАСТРОЙКИ
// =====================================================

interface SettingAttributes {
  id: string;
  key: string;
  value: Record<string, unknown> | null;
  description: string | null;
  category: string | null;
  updatedAt: Date;
}

interface SettingCreationAttributes extends Optional<SettingAttributes, 'id' | 'value' | 'description' | 'category' | 'updatedAt'> {}

export class Setting extends Model<SettingAttributes, SettingCreationAttributes> implements SettingAttributes {
  declare id: string;
  declare key: string;
  declare value: Record<string, unknown> | null;
  declare description: string | null;
  declare category: string | null;
  declare updatedAt: Date;
}

Setting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'settings',
    underscored: true,
    timestamps: false,
  }
);

// =====================================================
// ПОПЫТКИ ВВОДА КОДА
// =====================================================

interface CodeAttemptAttributes {
  id: string;
  ipAddress: string;
  codeHash: string | null;
  isSuccess: boolean;
  attemptCount: number;
  blockedUntil: Date | null;
  createdAt: Date;
}

interface CodeAttemptCreationAttributes extends Optional<CodeAttemptAttributes, 'id' | 'codeHash' | 'isSuccess' | 'attemptCount' | 'blockedUntil' | 'createdAt'> {}

export class CodeAttempt extends Model<CodeAttemptAttributes, CodeAttemptCreationAttributes> implements CodeAttemptAttributes {
  declare id: string;
  declare ipAddress: string;
  declare codeHash: string | null;
  declare isSuccess: boolean;
  declare attemptCount: number;
  declare blockedUntil: Date | null;
  declare createdAt: Date;
}

CodeAttempt.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: false,
      field: 'ip_address',
    },
    codeHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'code_hash',
    },
    isSuccess: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_success',
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'attempt_count',
    },
    blockedUntil: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'blocked_until',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'code_attempts',
    underscored: true,
    timestamps: false,
    indexes: [
      { fields: ['ip_address'] },
      { fields: ['blocked_until'] },
    ],
  }
);

// =====================================================
// СВЯЗИ
// =====================================================

// Категории
Category.hasMany(Category, { as: 'children', foreignKey: 'parentId' });
Category.belongsTo(Category, { as: 'parent', foreignKey: 'parentId' });

// Товары
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
Product.belongsTo(InstructionTemplate, { foreignKey: 'instructionTemplateId', as: 'instructionTemplate' });
Product.hasMany(ProductFile, { foreignKey: 'productId', as: 'files' });
Product.hasMany(InstructionTemplate, { foreignKey: 'productId', as: 'instructionTemplates' });
Product.hasMany(ActivationCode, { foreignKey: 'productId', as: 'codes' });

// Файлы товаров
ProductFile.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Шаблоны инструкций
InstructionTemplate.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Коды
ActivationCode.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ActivationCode.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
ActivationCode.hasMany(Activation, { foreignKey: 'codeId', as: 'activations' });

// Активации
Activation.belongsTo(ActivationCode, { foreignKey: 'codeId', as: 'code' });

// Логи
AdminLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Переводы
Translation.belongsTo(Language, { foreignKey: 'languageId', as: 'language' });

export { sequelize };
