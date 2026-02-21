import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ActivationCode, Activation, Product, ProductFile, InstructionTemplate, CodeAttempt, Setting } from '../db/models/index.js';
import { config } from '../config/index.js';

let settingsCache: Record<string, any> = {};
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60000;

async function getSettings(): Promise<Record<string, any>> {
  const now = Date.now();
  if (settingsCache && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
    return settingsCache;
  }
  
  try {
    const settings = await Setting.findAll();
    settingsCache = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    settingsCacheTime = now;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  return settingsCache;
}

export interface ActivationResult {
  success: boolean;
  error?: string;
  product?: {
    id: string;
    name: string;
    description: string | null;
    shortDescription: string | null;
    imageUrl: string | null;
    type: string;
    instruction: string | null;
    instructionType?: string;
    files: Array<{
      id: string;
      fileName: string;
      originalName: string;
      filePath: string;
      mimeType: string | null;
      fileType: string | null;
    }>;
  };
}

export interface CodeValidationResult {
  isValid: boolean;
  error?: string;
  blockedUntil?: Date;
}

/**
 * Проверка на блокировку IP (защита от brute-force)
 */
export async function checkIpBlocked(ip: string): Promise<CodeValidationResult> {
  const settings = await getSettings();
  const max = parseInt(settings.max_attempts) || config.security.codeAttempts.max;
  const windowMinutes = parseInt(settings.max_attempts_window_minutes) || config.security.codeAttempts.windowMinutes;
  const blockDurationMinutes = parseInt(settings.block_duration_minutes) || config.security.codeAttempts.blockDurationMinutes;
  
  const lastAttempt = await CodeAttempt.findOne({
    where: {
      ipAddress: ip,
      [Op.or]: [
        { blockedUntil: { [Op.gt]: new Date() } },
        { createdAt: { [Op.gt]: new Date(Date.now() - windowMinutes * 60 * 1000) } }
      ]
    },
    order: [['createdAt', 'DESC']]
  });

  if (lastAttempt?.blockedUntil && lastAttempt.blockedUntil > new Date()) {
    return {
      isValid: false,
      blockedUntil: lastAttempt.blockedUntil,
      error: `Слишком много попыток. Попробуйте позже.`
    };
  }

  const recentAttempts = await CodeAttempt.count({
    where: {
      ipAddress: ip,
      isSuccess: false,
      createdAt: { [Op.gt]: new Date(Date.now() - windowMinutes * 60 * 1000) }
    }
  });

  if (recentAttempts >= max) {
    const blockedUntil = new Date(Date.now() + blockDurationMinutes * 60 * 1000);
    await CodeAttempt.update(
      { blockedUntil },
      {
        where: {
          ipAddress: ip,
          blockedUntil: null
        }
      }
    );
    
    return {
      isValid: false,
      blockedUntil,
      error: `Слишком много неудачных попыток. До разблокировки: ${blockDurationMinutes} минут`
    };
  }

  return { isValid: true };
}

/**
 * Запись неудачной попытки
 */
export async function recordFailedAttempt(ip: string, codeHash?: string): Promise<void> {
  const settings = await getSettings();
  const windowMinutes = parseInt(settings.max_attempts_window_minutes) || config.security.codeAttempts.windowMinutes;
  
  const existing = await CodeAttempt.findOne({
    where: {
      ipAddress: ip,
      createdAt: { [Op.gt]: new Date(Date.now() - windowMinutes * 60 * 1000) }
    },
    order: [['createdAt', 'DESC']]
  });

  if (existing) {
    await existing.update({
      attemptCount: existing.attemptCount + 1,
      isSuccess: false,
      codeHash: codeHash || existing.codeHash
    });
  } else {
    await CodeAttempt.create({
      id: uuidv4(),
      ipAddress: ip,
      codeHash: codeHash || null,
      isSuccess: false,
      attemptCount: 1,
      blockedUntil: null
    });
  }
}

/**
 * Запись успешной попытки
 */
export async function recordSuccessAttempt(ip: string): Promise<void> {
  await CodeAttempt.create({
    id: uuidv4(),
    ipAddress: ip,
    codeHash: null,
    isSuccess: true,
    attemptCount: 1,
    blockedUntil: null
  });
}

/**
 * Основная функция активации кода
 */
export async function activateCode(code: string, userIp: string, userAgent?: string): Promise<ActivationResult> {
  try {
    const ipCheck = await checkIpBlocked(userIp);
    if (!ipCheck.isValid) {
      return {
        success: false,
        error: ipCheck.error || 'Слишком много попыток'
      };
    }

    const activationCode = await ActivationCode.findOne({
      where: { code },
      include: [
        {
          model: Product,
          as: 'product',
          where: { status: 'active' },
          required: false,
          include: [
            {
              model: ProductFile,
              as: 'files',
              where: { isActive: true },
              required: false
            },
            {
              model: InstructionTemplate,
              as: 'instructionTemplates',
              required: false
            }
          ]
        }
      ]
    });

    if (activationCode && (activationCode as any).product && (activationCode as any).product.instructionTemplateId) {
      const instructionTemplate = await InstructionTemplate.findByPk((activationCode as any).product.instructionTemplateId);
      if (instructionTemplate) {
        (activationCode as any).product.instructionTemplate = instructionTemplate;
      }
    }

    if (!activationCode) {
      await recordFailedAttempt(userIp);
      return {
        success: false,
        error: 'Код не найден'
      };
    }

    if (activationCode.status === 'blocked') {
      await recordFailedAttempt(userIp);
      return {
        success: false,
        error: 'Код заблокирован'
      };
    }

    // Проверка срока действия (без проверки статуса 'used' - код работает бесконечно)

    if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
      await activationCode.update({ status: 'expired' });
      await recordFailedAttempt(userIp);
      return {
        success: false,
        error: 'Срок действия кода истёк'
      };
    }

    // 6. Лимит использований убран - код работает бесконечно

    const product = (activationCode as any).product;
    if (!product) {
      await recordFailedAttempt(userIp);
      return {
        success: false,
        error: 'Код не привязан к товару'
      };
    }

    let instruction = product.instruction;
    
    if (!instruction && product.type === 'text_instruction') {
      instruction = product.description;
    }
    
    if (product.instructionTemplates && product.instructionTemplates.length > 0) {
      let template = product.instructionTemplates.find(
        (t: any) => t.codeType === activationCode.codeType
      );
      
      if (!template) {
        template = product.instructionTemplates.find((t: any) => t.isActive);
      }
      
      if (template && template.content) {
        instruction = template.content;
      }
    }
    
    if (!instruction && product.instructionTemplate && product.instructionTemplate.content) {
      instruction = product.instructionTemplate.content;
    }
    
    if (!instruction && product.description) {
      instruction = product.description;
    }

    if (activationCode.metadata && instruction) {
      instruction = applyMetadataToInstruction(instruction, activationCode.metadata);
    }

    await ActivationCode.update(
      {
        usageCount: activationCode.usageCount + 1,
        activatedAt: new Date(),
        userIp: userIp
      },
      { where: { id: activationCode.id } }
    );

    await Activation.create({
      id: uuidv4(),
      codeId: activationCode.id,
      userIp,
      userAgent,
      activatedAt: new Date(),
      sessionData: null
    });

    await recordSuccessAttempt(userIp);

    let instructionType = 'simple';
    if (product.instructionTemplate && product.instructionTemplate.type) {
      instructionType = product.instructionTemplate.type;
    } else if (product.instructionTemplates && product.instructionTemplates.length > 0) {
      const activeTemplate = product.instructionTemplates.find((t: any) => t.isActive);
      if (activeTemplate && activeTemplate.type) {
        instructionType = activeTemplate.type;
      }
    }
    
    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        shortDescription: product.shortDescription,
        imageUrl: product.imageUrl,
        type: product.type,
        instruction,
        instructionType,
        files: product.files ? product.files.map((f: any) => ({
          id: f.id,
          fileName: f.fileName,
          originalName: f.originalName,
          filePath: f.filePath,
          mimeType: f.mimeType,
          fileType: f.fileType
        })) : []
      }
    };

  } catch (error) {
    console.error('Ошибка активации кода:', error);
    await recordFailedAttempt(userIp);
    return {
      success: false,
      error: 'Внутренняя ошибка сервера'
    };
  }
}

/**
 * Применение метаданных кода к инструкции (уникальный контент)
 */
function applyMetadataToInstruction(instruction: string, metadata: Record<string, unknown>): string {
  let result = instruction;
  
  for (const [key, value] of Object.entries(metadata)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  
  return result;
}

/**
 * Генерация уникальных кодов
 */
export async function generateCodes(
  productId: string,
  count: number,
  prefix: string = '',
  length: number = 12,
  usageLimit: number = 1,
  expiresInDays: number | null = null,
  codeType: string | null = null,
  createdBy: string | null = null
): Promise<string[]> {
  const settings = await getSettings();
  const defaultExpiration = settings.default_expiration_days ? parseInt(settings.default_expiration_days) : config.security.defaultCodesExpirationDays;
  
  const effectiveExpiresInDays = expiresInDays !== null ? expiresInDays : defaultExpiration;
  
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  for (let i = 0; i < count; i++) {
    let code = prefix;
    for (let j = 0; j < length; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const exists = await ActivationCode.findOne({ where: { code } });
    if (exists) {
      i--;
      continue;
    }
    
    const expiresAt = effectiveExpiresInDays 
      ? new Date(Date.now() + effectiveExpiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    await ActivationCode.create({
      id: uuidv4(),
      code,
      productId,
      status: 'active',
      usageLimit,
      usageCount: 0,
      expiresAt,
      codeType,
      createdBy: createdBy || null
    });
    
    codes.push(code);
  }
  
  return codes;
}

/**
 * Импорт кодов из CSV
 */
export async function importCodesFromCSV(
  data: Array<{code: string; productId?: string; usageLimit?: number; expiresAt?: string; codeType?: string}>,
  createdBy: string | null = null
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  
  for (const row of data) {
    try {
    const exists = await ActivationCode.findOne({ where: { code: row.code } });
      if (exists) {
        errors.push(`Код ${row.code} уже существует`);
        continue;
      }
      
      await ActivationCode.create({
        id: uuidv4(),
        code: row.code,
        productId: row.productId || null,
        status: 'active',
        usageLimit: row.usageLimit || 1,
        usageCount: 0,
        expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
        codeType: row.codeType || null,
        createdBy: createdBy || null
      });
      
      imported++;
    } catch (error) {
      errors.push(`Ошибка импорта кода ${row.code}`);
    }
  }
  
  return { imported, errors };
}

/**
 * Экспорт кодов
 */
export async function exportCodes(productId?: string, status?: string): Promise<ActivationCode[]> {
  const where: any = {};
  
  if (productId) where.productId = productId;
  if (status) where.status = status;
  
  return ActivationCode.findAll({
    where,
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'name']
      }
    ],
    order: [['createdAt', 'DESC']]
  });
}

/**
 * Блокировка кода
 */
export async function blockCode(codeId: string): Promise<boolean> {
  const result = await ActivationCode.update(
    { status: 'blocked' },
    { where: { id: codeId } }
  );
  
  return result[0] > 0;
}

/**
 * Разблокировка кода
 */
export async function unblockCode(codeId: string): Promise<boolean> {
  const code = await ActivationCode.findByPk(codeId);
  
  if (!code) return false;
  
  const result = await ActivationCode.update(
    { status: 'active' },
    { where: { id: codeId } }
  );
  
  return result[0] > 0;
}
