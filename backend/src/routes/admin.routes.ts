import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../db/models/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  Product, 
  Category, 
  ActivationCode, 
  Activation,
  ProductFile,
  InstructionTemplate,
  AdminLog,
  Setting,
  Language,
  Translation,
  User
} from '../db/models/index.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware.js';
import { 
  generateCodes, 
  importCodesFromCSV, 
  exportCodes, 
  blockCode, 
  unblockCode 
} from '../services/code.service.js';
import { config } from '../config/index.js';

const router = Router();

// Применение middleware аутентификации ко всем маршрутам
router.use(authenticateToken);
router.use(requireAdmin);

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = config.upload.dir;
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла'));
    }
  }
});

// =====================================================
// КАТЕГОРИИ
// =====================================================

/**
 * GET /api/v1/admin/categories
 * Список категорий
 */
router.get('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC']],
      include: [{ model: Category, as: 'children' }]
    });
    res.json({ success: true, data: categories.map((c: any) => c.toJSON()) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения категорий' });
  }
});

/**
 * POST /api/v1/admin/categories
 * Создание категории
 */
router.post('/categories', async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, description, sortOrder, parentId } = req.body;
    
    const category = await Category.create({
      id: uuidv4(),
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      sortOrder: sortOrder || 0,
      parentId: parentId || null,
      isActive: true
    });

    // Логирование
    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'create',
      entityType: 'category',
      entityId: category.id,
      newData: category.toJSON(),
      ipAddress: req.ip || undefined
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка создания категории' });
  }
});

/**
 * PUT /api/v1/admin/categories/:id
 * Обновление категории
 */
router.put('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({ success: false, error: 'Категория не найдена' });
    }

    const oldData = category.toJSON();
    await category.update(req.body);

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'update',
      entityType: 'category',
      entityId: id,
      oldData,
      newData: category.toJSON(),
      ipAddress: req.ip || undefined
    });

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка обновления категории' });
  }
});

/**
 * DELETE /api/v1/admin/categories/:id
 * Удаление категории
 */
router.delete('/categories/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({ success: false, error: 'Категория не найдена' });
    }

    await category.update({ isActive: false });

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'delete',
      entityType: 'category',
      entityId: id,
      oldData: category.toJSON(),
      ipAddress: req.ip || undefined
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка удаления категории' });
  }
});

// =====================================================
// ТОВАРЫ
// =====================================================

/**
 * GET /api/v1/admin/products
 * Список товаров
 */
router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, categoryId, status, search } = req.query;
    
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const products = await Product.findAndCountAll({
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: InstructionTemplate, as: 'instructionTemplate', attributes: ['id', 'name'] }
      ]
    });

    res.json({ 
      success: true, 
      data: {
        products: products.rows.map((p: any) => p.toJSON()),
        total: products.count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения товаров' });
  }
});

/**
 * POST /api/v1/admin/products
 * Создание товара
 */
router.post('/products', async (req: AuthRequest, res: Response) => {
  try {
    const { name, categoryId, instructionTemplateId, description, shortDescription, type, instruction, status } = req.body;
    
    const product = await Product.create({
      id: uuidv4(),
      name,
      categoryId: categoryId || null,
      instructionTemplateId: instructionTemplateId || null,
      description,
      shortDescription,
      type: type || 'digital_file',
      instruction,
      status: status || 'active',
      isFeatured: req.body.isFeatured || false
    });

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'create',
      entityType: 'product',
      entityId: product.id,
      newData: product.toJSON(),
      ipAddress: req.ip || undefined
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка создания товара' });
  }
});

/**
 * PUT /api/v1/admin/products/:id
 * Обновление товара
 */
router.put('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Товар не найден' });
    }

    const oldData = product.toJSON();
    await product.update(req.body);

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'update',
      entityType: 'product',
      entityId: id,
      oldData,
      newData: product.toJSON(),
      ipAddress: req.ip || undefined
    });

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка обновления товара' });
  }
});

/**
 * DELETE /api/v1/admin/products/:id
 * Удаление товара (полное удаление из базы)
 */
router.delete('/products/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Товар не найден' });
    }

    // Удаляем связанные файлы
    const files = await ProductFile.findAll({ where: { productId: id } });
    for (const file of files) {
      const filePath = path.join(process.cwd(), file.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await file.destroy();
    }

    // Удаляем связанные коды и их активации
    const codes = await ActivationCode.findAll({ where: { productId: id } });
    for (const code of codes) {
      await Activation.destroy({ where: { codeId: code.id } });
    }
    await ActivationCode.destroy({ where: { productId: id } });

    // Удаляем связанные инструкции
    await InstructionTemplate.destroy({ where: { productId: id } });

    await product.destroy();

    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Ошибка удаления товара' });
  }
});

// =====================================================
// ФАЙЛЫ ТОВАРОВ
// =====================================================

/**
 * POST /api/v1/admin/products/:id/files
 * Загрузка файла к товару
 */
router.post('/products/:id/files', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Товар не найден' });
    }

    const fileType = req.file.mimetype.split('/')[0];
    const mimeType = req.file.mimetype;

    const productFile = await ProductFile.create({
      id: uuidv4(),
      productId: id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType,
      fileType: mimeType === 'application/pdf' ? 'pdf' : 
                mimeType.startsWith('image/') ? 'image' : 
                mimeType.includes('zip') || mimeType.includes('rar') ? 'archive' : 'other',
      isActive: true
    });

    res.status(201).json({ success: true, data: productFile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка загрузки файла' });
  }
});

/**
 * DELETE /api/v1/admin/files/:id
 * Удаление файла
 */
router.delete('/files/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = await ProductFile.findByPk(id);
    
    if (!file) {
      return res.status(404).json({ success: false, error: 'Файл не найден' });
    }

    // Удаление физического файла
    const filePath = path.join(process.cwd(), file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await file.destroy();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка удаления файла' });
  }
});

// =====================================================
// КОДЫ
// =====================================================

/**
 * GET /api/v1/admin/codes
 * Список кодов
 */
router.get('/codes', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, productId, status, search } = req.query;
    
    const where: any = {};
    if (productId) where.productId = productId;
    if (status) where.status = status;
    if (search) where.code = { [Op.iLike]: `%${search}%` };

    const codes = await ActivationCode.findAndCountAll({
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name'] }
      ]
    });

    res.json({ 
      success: true, 
      data: {
        codes: codes.rows.map((c: any) => c.toJSON()),
        total: codes.count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения кодов' });
  }
});

/**
 * POST /api/v1/admin/codes/generate
 * Генерация кодов
 */
router.post('/codes/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { productId, count, prefix, length, usageLimit, expiresInDays, codeType } = req.body;
    
    if (!productId || !count) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID товара и количество кодов обязательны' 
      });
    }

    const codes = await generateCodes(
      productId,
      Number(count),
      prefix || '',
      Number(length) || 12,
      Number(usageLimit) || 1,
      expiresInDays ? Number(expiresInDays) : null,
      codeType || null,
      req.user?.id || null
    );

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'generate_codes',
      entityType: 'product',
      entityId: productId,
      newData: { count, prefix, codeType },
      ipAddress: req.ip || undefined
    });

    res.status(201).json({ success: true, data: { codes } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка генерации кодов' });
  }
});

/**
 * POST /api/v1/admin/codes/import
 * Импорт кодов из CSV
 */
router.post('/codes/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    // Чтение и парсинг CSV
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });

    const result = await importCodesFromCSV(data, req.user?.id || null);

    // Удаление временного файла
    fs.unlinkSync(req.file.path);

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'import_codes',
      entityType: 'codes',
      newData: { imported: result.imported, errors: result.errors },
      ipAddress: req.ip || undefined
    });

    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка импорта кодов' });
  }
});

/**
 * GET /api/v1/admin/codes/export
 * Экспорт кодов
 */
router.get('/codes/export', async (req: AuthRequest, res: Response) => {
  try {
    const { productId, status } = req.query;
    
    const codes = await exportCodes(
      productId as string, 
      status as string
    );

    // Формирование CSV
    const headers = ['code', 'product', 'status', 'usage_limit', 'usage_count', 'expires_at', 'created_at'];
    const csv = [
      headers.join(','),
      ...codes.map(c => [
        c.code,
        (c as any).product?.name || '',
        c.status,
        c.usageLimit,
        c.usageCount,
        c.expiresAt ? new Date(c.expiresAt).toISOString() : '',
        new Date(c.createdAt).toISOString()
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=codes.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка экспорта кодов' });
  }
});

/**
 * POST /api/v1/admin/codes/:id/block
 * Блокировка кода
 */
router.post('/codes/:id/block', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await blockCode(id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Код не найден' });
    }

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'block_code',
      entityType: 'code',
      entityId: id,
      ipAddress: req.ip || undefined
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка блокировки кода' });
  }
});

/**
 * POST /api/v1/admin/codes/:id/unblock
 * Разблокировка кода
 */
router.post('/codes/:id/unblock', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const success = await unblockCode(id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Код не найден' });
    }

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'unblock_code',
      entityType: 'code',
      entityId: id,
      ipAddress: req.ip || undefined
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка разблокировки кода' });
  }
});

// =====================================================
// СТАТИСТИКА
// =====================================================

/**
 * GET /api/v1/admin/stats
 * Общая статистика
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // Общее количество кодов
    const totalCodes = await ActivationCode.count();
    
    // Использованные коды
    const usedCodes = await ActivationCode.count({ where: { status: 'used' } });
    
    // Активные коды
    const activeCodes = await ActivationCode.count({ where: { status: 'active' } });
    
    // Блокированные коды
    const blockedCodes = await ActivationCode.count({ where: { status: 'blocked' } });
    
    // Статистика по товарам
    const productStats = await ActivationCode.findAll({
      attributes: [
        [sequelize.col('ActivationCode.product_id'), 'productId'],
        [sequelize.fn('COUNT', sequelize.col('ActivationCode.id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN "ActivationCode".status = \'used\' THEN 1 ELSE 0 END')), 'used']
      ],
      include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
      group: ['ActivationCode.product_id', 'product.id'],
      raw: false
    });

    // Статистика по датам (последние 30 дней)
    const dateStats = await Activation.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('activated_at')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        activatedAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('activated_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('activated_at')), 'ASC']]
    });

    res.json({
      success: true,
      data: {
        codes: {
          total: totalCodes,
          used: usedCodes,
          active: activeCodes,
          blocked: blockedCodes
        },
        byProduct: productStats,
        byDate: dateStats
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения статистики' });
  }
});

// =====================================================
// НАСТРОЙКИ
// =====================================================

/**
 * GET /api/v1/admin/settings
 * Получение настроек
 */
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await Setting.findAll();
    res.json({ 
      success: true, 
      data: settings.reduce((acc: any, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {})
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения настроек' });
  }
});

/**
 * PUT /api/v1/admin/settings
 * Обновление настроек
 */
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await Setting.upsert({
        key,
        value: value as any,
        category: 'general'
      });
    }

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'update_settings',
      entityType: 'settings',
      newData: settings,
      ipAddress: req.ip || undefined
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка обновления настроек' });
  }
});

// =====================================================
// ЛОГИ
// =====================================================

/**
 * GET /api/v1/admin/logs
 * Список логов
 */
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, action, entityType } = req.query;
    
    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const logs = await AdminLog.findAndCountAll({
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['email', 'name'] }]
    });

    res.json({ 
      success: true, 
      data: {
        logs: logs.rows,
        total: logs.count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка получения логов' });
  }
});

// =====================================================
// ИНСТРУКЦИИ
// =====================================================

/**
 * GET /api/v1/admin/instructions
 * Список инструкций
 */
router.get('/instructions', async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const where: any = {};
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    const instructions = await InstructionTemplate.findAndCountAll({
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({ 
      success: true, 
      data: {
        instructions: instructions.rows.map((i: any) => i.toJSON()),
        total: instructions.count,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('Instructions error:', error);
    res.status(500).json({ success: false, error: 'Ошибка получения инструкций' });
  }
});

/**
 * POST /api/v1/admin/instructions
 * Создание инструкции
 */
router.post('/instructions', async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, sortOrder, isActive } = req.body;
    
    const instruction = await InstructionTemplate.create({
      id: uuidv4(),
      name: title,
      content,
      sortOrder: sortOrder || 0,
      isActive: isActive !== false
    });

    res.status(201).json({ success: true, data: instruction.toJSON() });
  } catch (error) {
    console.error('Create instruction error:', error);
    res.status(500).json({ success: false, error: 'Ошибка создания инструкции' });
  }
});

/**
 * PUT /api/v1/admin/instructions/:id
 * Обновление инструкции
 */
router.put('/instructions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instruction = await InstructionTemplate.findByPk(id);
    
    if (!instruction) {
      return res.status(404).json({ success: false, error: 'Инструкция не найдена' });
    }

    const oldData = instruction.toJSON();
    // Поддержка как title так и name для обратной совместимости
    const updateData = { ...req.body };
    if (updateData.title && !updateData.name) {
      updateData.name = updateData.title;
    }
    await instruction.update(updateData);

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'update',
      entityType: 'instruction',
      entityId: id,
      oldData,
      newData: instruction.toJSON(),
      ipAddress: req.ip || undefined
    });

    res.json({ success: true, data: instruction });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка обновления инструкции' });
  }
});

/**
 * DELETE /api/v1/admin/instructions/:id
 * Удаление инструкции
 */
router.delete('/instructions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instruction = await InstructionTemplate.findByPk(id);
    
    if (!instruction) {
      return res.status(404).json({ success: false, error: 'Инструкция не найдена' });
    }

    await instruction.destroy();

    await AdminLog.create({
      id: uuidv4(),
      userId: req.user?.id,
      action: 'delete',
      entityType: 'instruction',
      entityId: id,
      oldData: instruction.toJSON(),
      ipAddress: req.ip || undefined
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Ошибка удаления инструкции' });
  }
});

export { router as adminRoutes };
