import { z } from 'zod';
import { RxJsonSchema } from 'rxdb';

// Zod schema for Model
export const ModelSchema = z.object({
  id: z.string().max(100, 'ID must be 100 characters or less'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  period: z.number().min(1, 'Period must be positive'),
  housingUnits: z.number().min(1, 'Housing units must be positive').optional(), // for collections only
  startingAmount: z.number().min(0, 'Starting amount must be non-negative'),
  fiscalYear: z.number().min(1900, 'Invalid fiscal year').max(2200, 'Fiscal year must be before 2200'),
  monthlyReserveFeesPerHousingUnit: z.number().min(0, 'Monthly reserve fees must be non-negative'),
  minimumCollectionFee: z.number().min(0, 'Minimum collection fee must be non-negative'),
  inflationRate: z.number().min(0, 'Inflation rate must be non-negative').max(100, 'Inflation rate must be less than 100'),
  maximumAllowableFeeIncrease: z.number().min(0, 'Maximum fee increase must be non-negative').max(100, 'Maximum fee increase must be less than 100'),
  bankInterestRate: z.number().min(0, 'Bank interest rate must be non-negative').max(100, 'Bank interest rate must be less than 100'),
  safetyNetPercentage: z.number().min(0, 'Safety net percentage must be non-negative').max(100, 'Safety net percentage must be less than 100'),
  cashReserveThresholdPercentage: z.number().min(0, 'Cash reserve threshold must be non-negative').max(100, 'Cash reserve threshold must be less than 100'),
  createdAt: z.string().max(50, 'Created date must be 50 characters or less'),
  updatedAt: z.string().max(50, 'Updated date must be 50 characters or less'),
});

// Zod schema for Expenses
export const ExpenseSchema = z.object({
  id: z.string().max(100, 'ID must be 100 characters or less'),
  modelId: z.string().max(100, 'Model ID must be 100 characters or less'), // Reference to the Model
  sirs: z.boolean(), // SIRS (boolean)
  expectedLife: z.number().min(1, 'Expected life must be positive'),
  remainingLife: z.number().min(0, 'Remaining life must be non-negative'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  cost: z.number().min(0, 'Cost must be non-negative'),
  createdAt: z.string().max(50, 'Created date must be 50 characters or less'),
  updatedAt: z.string().max(50, 'Updated date must be 50 characters or less'),
}).refine((data) => data.remainingLife <= data.expectedLife, {
    message: 'Remaining life cannot exceed expected life',
    path: ['remainingLife'],
  })
  .refine((data) => data.cost >= 0, {
    message: 'Cost must be non-negative',
    path: ['cost'],
  });

// TypeScript types derived from Zod schemas
export type Model = z.infer<typeof ModelSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;

// RxDB schema for Model collection
export const modelRxSchema: RxJsonSchema<Model> = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    name: {
      type: 'string',
      maxLength: 200,
    },
    period: {
      type: 'number',
      minimum: 1,
    },
    housingUnits: {
      type: 'number',
      minimum: 1,
    },
    startingAmount: {
      type: 'number',
      minimum: 0,
    },
    fiscalYear: {
      type: 'number',
      minimum: 1900,
      maximum: 2200,
      multipleOf: 1,
    },
    monthlyReserveFeesPerHousingUnit: {
      type: 'number',
      minimum: 0,
    },
    minimumCollectionFee: {
      type: 'number',
      minimum: 0,
    },
    inflationRate: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    maximumAllowableFeeIncrease: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    bankInterestRate: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    safetyNetPercentage: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    cashReserveThresholdPercentage: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: [
    'id',
    'name',
    'period',
    'startingAmount',
    'fiscalYear',
    'monthlyReserveFeesPerHousingUnit',
    'minimumCollectionFee',
    'inflationRate',
    'maximumAllowableFeeIncrease',
    'bankInterestRate',
    'safetyNetPercentage',
    'cashReserveThresholdPercentage',
    'createdAt',
    'updatedAt',
  ],
  indexes: ['name', 'fiscalYear', 'createdAt'],
};

// RxDB schema for Expense collection
export const expenseRxSchema: RxJsonSchema<Expense> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100,
    },
    modelId: {
      type: 'string',
      ref: 'models', // Reference to models collection
      maxLength: 100,
    },
    sirs: {
      type: 'boolean',
    },
    expectedLife: {
      type: 'number',
      minimum: 1,
    },
    remainingLife: {
      type: 'number',
      minimum: 0,
    },
    name: {
      type: 'string',
      maxLength: 200,
    },
    cost: {
      type: 'number',
      minimum: 0,
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      maxLength: 50,
    },
  },
  required: [
    'id',
    'modelId',
    'sirs',
    'expectedLife',
    'remainingLife',
    'name',
    'cost',
    'createdAt',
    'updatedAt',
  ],
  indexes: ['modelId', 'name', 'sirs', 'createdAt'],
};
