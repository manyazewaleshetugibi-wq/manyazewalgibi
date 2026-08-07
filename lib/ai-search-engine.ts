// lib/ai-search-engine.ts - Executes AI-planned queries against PostgreSQL via Prisma

import { prisma } from './prisma';
import { AIClient, AIUnderstanding } from './ai-client';

export interface AISearchResult {
  success: boolean;
  query: string;
  aiResponse: string;
  insights: string[];
  data: any[];
  suggestedQuestions: string[];
  metadata: {
    intent: string;
    collectionsUsed: string[];
    total: number;
    processingTime: number;
    aiExplanation: string;
  };
}

// Mongo collection name -> Prisma model delegate name
const COLLECTION_TO_MODEL: Record<string, string> = {
  orders: 'order',
  deleted_orders: 'deletedOrder',
  items: 'item',
  itemCategories: 'itemCategory',
  stocks: 'stock',
  stock_categories: 'stockCategory',
  used_stock: 'usedStock',
  stock_wastages: 'stockWastage',
  stock_purchases: 'stockPurchase',
  users: 'user',
  waitresses: 'waitress',
  waitress: 'waitressLegacy',
  expense: 'expense',
  expenses: 'expenseRecord',
  commonExpenses: 'commonExpense',
  delivery_accepter: 'deliveryAccepter',
  deletion_logs: 'deletionLog',
  deletion_requests: 'deletionRequest',
  preparation_recipes: 'preparationRecipe',
  preparation_logs: 'preparationLog',
  healthy_menu: 'healthyMenu',
  prizes: 'prize',
  lottery_winners: 'lotteryWinner',
  tablearrangements: 'tableArrangement',
  blogs: 'blog',
  books: 'book',
  feedback: 'feedback',
  content: 'content',
  contents: 'content',
  cultures: 'culture',
  tasks: 'task',
  trainings: 'training',
  restaurants: 'restaurant',
  dailyCash: 'dailyCash',
  notifications: 'notification',
  audit: 'audit',
  security_logs: 'securityLog',
  telegram_bot_users: 'telegramBotUser',
  promocodes: 'promocode',
  referrals: 'referral',
  meal_plan_templates: 'mealPlanTemplate',
  salary: 'salary',
  staff: 'staff',
  employee_activities: 'employeeActivity',
  employee_rank: 'employeeRank',
  standards: 'standard',
  standards_logs: 'standardsLog',
  qrhistories: 'qRHistory',
  system_settings: 'systemSetting',
  userPoints: 'userPoint',
  purchase_requests: 'purchaseRequest',
};

// Tables the AI may query against when introspecting the schema
const SEARCH_TABLES = [
  'orders',
  'deleted_orders',
  'items',
  'stocks',
  'used_stock',
  'stock_wastages',
  'stock_purchases',
  'users',
  'waitresses',
  'expense',
  'commonExpenses',
  'delivery_accepter',
  'deletion_logs',
  'deletion_requests',
  'preparation_recipes',
  'preparation_logs',
  'healthy_menu',
  'prizes',
  'lottery_winners',
  'tablearrangements',
  'blogs',
  'books',
  'feedback',
  'content',
  'cultures',
  'restaurants',
];

const isPlainObject = (v: any): v is Record<string, any> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const modelFor = (collection: string): string | null =>
  COLLECTION_TO_MODEL[collection] || null;

// Translate a Mongo-style $match object into a Prisma where clause
const translateMatch = (match: any, delegate: any): any => {
  if (!isPlainObject(match)) return {};
  const where: any = {};

  for (const [key, val] of Object.entries(match)) {
    if (key === '$or') {
      where.OR = (val as any[]).map((v) => translateMatch(v, delegate));
      continue;
    }
    if (key === '$and') {
      where.AND = (val as any[]).map((v) => translateMatch(v, delegate));
      continue;
    }
    if (key === '$expr') {
      const expr = translateExpr(val, delegate);
      if (expr) Object.assign(where, expr);
      continue;
    }

    if (isPlainObject(val)) {
      const cond: any = {};
      for (const [op, operand] of Object.entries(val)) {
        switch (op) {
          case '$gte':
            cond.gte = operand;
            break;
          case '$gt':
            cond.gt = operand;
            break;
          case '$lte':
            cond.lte = operand;
            break;
          case '$lt':
            cond.lt = operand;
            break;
          case '$ne':
            cond.not = operand;
            break;
          case '$in':
            cond.in = Array.isArray(operand) ? operand : [operand];
            break;
          case '$nin':
            cond.notIn = Array.isArray(operand) ? operand : [operand];
            break;
          case '$regex': {
            const pattern =
              typeof operand === 'string'
                ? operand
                : operand?.source || String(operand);
            cond.contains = pattern;
            cond.mode = 'insensitive';
            break;
          }
          case '$exists':
            if (operand === false) cond.not = null;
            break;
          default:
            break;
        }
      }
      where[key] = cond;
    } else {
      where[key] = val;
    }
  }

  return where;
};

// Translate a Mongo $expr object like { $lt: ["$currentStock", "$minimumStock"] }
// into a Prisma field-comparison condition
const translateExpr = (expr: any, delegate: any): any => {
  if (!isPlainObject(expr)) return {};
  const ops: Record<string, string> = {
    $lt: 'lt',
    $lte: 'lte',
    $gt: 'gt',
    $gte: 'gte',
    $eq: 'equals',
    $ne: 'not',
  };
  const result: any = {};
  for (const [op, operand] of Object.entries(expr)) {
    const prismaOp = ops[op];
    if (!prismaOp || !Array.isArray(operand) || operand.length < 2) continue;
    const [left, right] = operand;
    const leftField = typeof left === 'string' ? left.replace(/^\$/, '') : null;
    const rightField =
      typeof right === 'string' ? right.replace(/^\$/, '') : null;
    if (!leftField) continue;
    if (rightField && delegate?.fields?.[rightField]) {
      result[leftField] = { [prismaOp]: delegate.fields[rightField] };
    } else {
      result[leftField] = { [prismaOp]: right };
    }
  }
  return result;
};

const translateSort = (sort: any): any => {
  if (!isPlainObject(sort)) return undefined;
  const orderBy: any[] = [];
  for (const [field, dir] of Object.entries(sort)) {
    orderBy.push({ [field]: dir === -1 ? 'desc' : 'asc' });
  }
  return orderBy.length ? orderBy : undefined;
};

const selectFromProjection = (projection?: string[]): any => {
  if (!projection || projection.length === 0) return undefined;
  const select: any = { id: true };
  for (const field of projection) select[field] = true;
  return select;
};

export class AISearchEngine {
  private aiClient: AIClient;
  private schemaLoaded: boolean = false;

  constructor() {
    this.aiClient = new AIClient();
  }

  private async ensureSchemaLoaded(): Promise<void> {
    if (!this.schemaLoaded) {
      const schema: Record<string, string[]> = {};
      for (const table of SEARCH_TABLES) {
        try {
          const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
            table
          );
          schema[table] = rows.map((r) => r.column_name);
        } catch {
          // table may not exist yet
        }
      }
      await this.aiClient.setDatabaseSchema(schema);
      this.schemaLoaded = true;
    }
  }

  async search(userQuery: string): Promise<AISearchResult> {
    const startTime = Date.now();

    try {
      await this.ensureSchemaLoaded();


      const understanding = await this.aiClient.understandQuery(userQuery);


      const results = await this.executeQuery(understanding);
      const aiResponse = await this.aiClient.generateResponse(userQuery, results, understanding);
      const suggestedQuestions = await this.aiClient.suggestFollowUps(userQuery, results, understanding);
      const insights = this.generateInsights(results, understanding);

      return {
        success: true,
        query: userQuery,
        aiResponse: aiResponse,
        insights: insights,
        data: results,
        suggestedQuestions: suggestedQuestions,
        metadata: {
          intent: understanding.intent || 'search',
          collectionsUsed: understanding.collections || [],
          total: results.length,
          processingTime: Date.now() - startTime,
          aiExplanation: understanding.explanation || 'Processed query'
        }
      };
    } catch (error) {
      console.error('Search Error:', error);
      return {
        success: false,
        query: userQuery,
        aiResponse: `I couldn't process your question. Please try rephrasing.`,
        insights: [],
        data: [],
        suggestedQuestions: ['Show me total revenue this month', 'Compare with last month', 'Show me low stock items'],
        metadata: {
          intent: 'error',
          collectionsUsed: [],
          total: 0,
          processingTime: 0,
          aiExplanation: 'Fallback mode'
        }
      };
    }
  }

  private async executeQuery(understanding: AIUnderstanding): Promise<any[]> {
    const allResults: any[] = [];

    // Handle COMPARISON queries (compare two time periods)
    if (understanding.comparison === true && understanding.currentPeriod && understanding.previousPeriod) {


      const aggregatePeriod = async (start: Date, end: Date) => {
        const r = await prisma.order.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: start, lte: end },
          },
          _sum: { finalAmount: true },
          _count: true,
        });
        return {
          totalRevenue: r._sum.finalAmount || 0,
          orderCount: r._count,
        };
      };

      const [current, previous] = await Promise.all([
        aggregatePeriod(understanding.currentPeriod.start, understanding.currentPeriod.end),
        aggregatePeriod(understanding.previousPeriod.start, understanding.previousPeriod.end),
      ]);

      allResults.push(
        { ...current, _period: 'current', _periodLabel: 'This Period' },
        { ...previous, _period: 'previous', _periodLabel: 'Previous Period' }
      );

      return allResults;
    }

    // Handle regular queries
    for (const collectionName of understanding.collections || ['orders']) {
      try {
        const modelName = modelFor(collectionName);
        if (!modelName || !(prisma as any)[modelName]) {
          console.warn(`No Prisma model for collection: ${collectionName}`);
          continue;
        }
        const delegate = (prisma as any)[modelName];
        const mongoQuery = understanding.mongoQuery || {};

        const isAggregation = mongoQuery && (
          mongoQuery.$match || mongoQuery.$group ||
          mongoQuery.$unwind || mongoQuery.$sort ||
          understanding.aggregation === true
        );

        let results: any[] = [];

        if (isAggregation && mongoQuery.$group) {
          results = await this.runAggregation(delegate, mongoQuery);
        } else if (isAggregation && mongoQuery.$match && !mongoQuery.$group) {
          const where = translateMatch(mongoQuery.$match, delegate);
          const orderBy = translateSort(mongoQuery.$sort);
          const docs = await delegate.findMany({
            where,
            orderBy,
            take: mongoQuery.$limit || understanding.limit || 50,
          });
          results = docs.map((d: any) => ({ ...d }));
        } else {
          const where = translateMatch(mongoQuery, delegate);
          const orderBy = translateSort(mongoQuery.$sort);
          const select = selectFromProjection(understanding.projection);
          const docs = await delegate.findMany({
            where,
            orderBy,
            select,
            take: understanding.limit || 50,
          });
          results = docs.map((d: any) => ({ ...d }));
        }

        results.forEach((doc: any) => {
          allResults.push({
            ...doc,
            _collection: collectionName,
            _id: doc.id?.toString(),
          });
        });
      } catch (error) {
        console.error(`Error in ${collectionName}:`, error);
      }
    }

    return allResults;
  }

  private async runAggregation(delegate: any, mongoQuery: any): Promise<any[]> {
    const where = translateMatch(mongoQuery.$match, delegate);
    const group = mongoQuery.$group;
    const sort = translateSort(mongoQuery.$sort);

    // $group with _id: null -> simple aggregate
    if (!group || group._id === null || group._id === undefined) {
      const sumFields: Record<string, boolean> = {};
      const avgFields: Record<string, boolean> = {};
      let countField = false;
      const fieldMappings: Record<string, { outKey: string; source: string | null }> = {};

      for (const [outKey, spec] of Object.entries(group || {})) {
        if (outKey === '_id') continue;
        if (spec && typeof spec === 'object' && '$sum' in spec) {
          const source = (spec as any).$sum;
          if (source === 1) {
            countField = true;
            fieldMappings[outKey] = { outKey, source: null };
          } else {
            const field = String(source).replace(/^\$/, '');
            sumFields[field] = true;
            fieldMappings[outKey] = { outKey, source: field };
          }
        } else if (spec && typeof spec === 'object' && '$avg' in spec) {
          const field = String((spec as any).$avg).replace(/^\$/, '');
          avgFields[field] = true;
          fieldMappings[outKey] = { outKey, source: field };
        }
      }

      const aggArgs: any = { where };
      if (Object.keys(sumFields).length) aggArgs._sum = sumFields;
      if (Object.keys(avgFields).length) aggArgs._avg = avgFields;
      if (countField) aggArgs._count = true;

      const agg = await delegate.aggregate(aggArgs);

      const result: any = {};
      for (const { outKey, source } of Object.values(fieldMappings)) {
        if (source === null) result[outKey] = agg._count;
        else if (agg._sum && source in agg._sum) result[outKey] = (agg._sum as any)[source] || 0;
        else if (agg._avg && source in agg._avg) result[outKey] = (agg._avg as any)[source] || 0;
        else result[outKey] = 0;
      }
      return [result];
    }

    // $group with _id: "$field" -> groupBy
    const idField = String(group._id).replace(/^\$/, '');
    const sumFields: Record<string, boolean> = {};
    const countFields: Record<string, boolean> = {};
    const fieldMappings: Record<string, { outKey: string; source: string | null; idField?: string }> = {};

    for (const [outKey, spec] of Object.entries(group)) {
      if (outKey === '_id') continue;
      if (spec && typeof spec === 'object' && '$sum' in spec) {
        const source = (spec as any).$sum;
        if (source === 1) {
          countFields[outKey] = true;
          fieldMappings[outKey] = { outKey, source: null };
        } else {
          const field = String(source).replace(/^\$/, '');
          sumFields[field] = true;
          fieldMappings[outKey] = { outKey, source: field };
        }
      } else if (spec && typeof spec === 'object' && '$avg' in spec) {
        const field = String((spec as any).$avg).replace(/^\$/, '');
        sumFields[field] = true;
        fieldMappings[outKey] = { outKey, source: field };
      }
    }

    const groupByArgs: any = {
      by: [idField],
      where,
    };
    if (Object.keys(sumFields).length) groupByArgs._sum = sumFields;
    if (Object.keys(countFields).length) groupByArgs._count = true;
    if (sort) groupByArgs.orderBy = sort;

    const groupByRes: any[] = await delegate.groupBy(groupByArgs);

    return groupByRes.map((row: any) => {
      const out: any = { _id: row[idField] };
      for (const { outKey, source } of Object.values(fieldMappings)) {
        if (source === null) out[outKey] = row._count || 0;
        else if (row._sum && source in row._sum) out[outKey] = row._sum[source] || 0;
        else out[outKey] = 0;
      }
      return out;
    });
  }

  private generateInsights(results: any[], understanding: AIUnderstanding): string[] {
    const insights: string[] = [];

    if (results.length === 0) {
      insights.push('📭 No results found');
      return insights;
    }

    // Comparison insights
    if (understanding.comparison === true && results.length >= 2) {
      const current = results.find(r => r._period === 'current') || results[0];
      const previous = results.find(r => r._period === 'previous') || results[1];

      const currentRevenue = current?.totalRevenue || 0;
      const previousRevenue = previous?.totalRevenue || 0;
      const difference = currentRevenue - previousRevenue;
      const percentChange = previousRevenue > 0 ? (difference / previousRevenue) * 100 : 0;

      insights.push(`📈 ${understanding.compareType?.replace('_', ' vs ') || 'Comparison'}`);
      insights.push(`💰 Current: ${currentRevenue.toFixed(2)} birr`);
      insights.push(`📉 Previous: ${previousRevenue.toFixed(2)} birr`);
      insights.push(`📊 Change: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} birr (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%)`);
      return insights;
    }

    // Regular insights
    if (understanding.aggregation === true && results[0]) {
      const totalRevenue = results[0].totalRevenue || results[0].total || 0;
      insights.push(`💰 Total Revenue: ${totalRevenue.toFixed(2)} birr`);
      if (results[0].orderCount) {
        insights.push(`📊 Total Orders: ${results[0].orderCount}`);
      }
    }

    insights.push(`📊 Found ${results.length} result(s)`);
    if (understanding.explanation) {
      insights.push(`💡 ${understanding.explanation}`);
    }

    return insights;
  }
}
