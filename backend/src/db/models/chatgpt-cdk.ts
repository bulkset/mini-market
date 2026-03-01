import { DataTypes } from 'sequelize';
import {sequelize} from '../connection.js';

export const ChatGPTCDK = sequelize.define('ChatGPTCDK', {
  id: {
    type: DataTypes.TEXT,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  cdk: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  gptType: {
    type: DataTypes.STRING, // 'plus_1m', 'plus_12m', 'go_12m'
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'available'
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  orderCode: {
    type: DataTypes.STRING, // код заказа который активировал
    allowNull: true
  }
}, {
  tableName: 'chatgpt_cdks',
  timestamps: true
});

export async function getAvailableCDK(gptType: string, orderCode?: string | null): Promise<string | null> {
  const cdk = await ChatGPTCDK.findOne({
    where: {
      gptType,
      status: 'available'
    },
    order: [['created_at', 'ASC']]
  });
  
  if (!cdk) return null;
  
  await (cdk as any).update({
    status: 'pending',
    usedAt: null,
    orderCode: orderCode || null
  });
  return (cdk as any).cdk;
}

export async function importCDKs(gptType: string, cdks: string[]): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;
  
  for (const cdk of cdks) {
    try {
      const exists = await ChatGPTCDK.findOne({ where: { cdk } });
      if (exists) {
        errors.push(`CDK ${cdk} уже существует`);
        continue;
      }
      
      await ChatGPTCDK.create({
        cdk,
        gptType,
        status: 'available'
      });
      
      imported++;
    } catch (error) {
      errors.push(`Ошибка импорта CDK ${cdk}`);
    }
  }
  
  return { imported, errors };
}
