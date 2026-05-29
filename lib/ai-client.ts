// lib/ai-client.ts - Complete with time comparisons

export interface AIUnderstanding {
  intent: string;
  collections: string[];
  mongoQuery: any;
  projection: string[];
  limit: number;
  explanation: string;
  aggregation?: boolean;
  comparison?: boolean;
  currentPeriod?: { start: Date; end: Date };
  previousPeriod?: { start: Date; end: Date };
  compareType?: 'month_over_month' | 'week_over_week' | 'day_over_day';
}

export class AIClient {
  private groqApiKey: string;
  private dbSchema: string = '';
  private currentModel: string;
  private queryCache: Map<string, AIUnderstanding> = new Map();

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    this.currentModel = 'llama-3.1-8b-instant';
    console.log('🤖 AI Model ready');
  }

  async setDatabaseSchema(db: any): Promise<void> {
    const collections = await db.listCollections().toArray();
    const schema: any = {};
    
    for (const collection of collections) {
      const colName = collection.name;
      const sample = await db.collection(colName).findOne({});
      if (sample) {
        schema[colName] = Object.keys(sample);
      }
    }
    
    this.dbSchema = JSON.stringify(schema, null, 2);
    console.log('📚 Schema loaded:', Object.keys(schema).length, 'collections');
  }

  private async callGroqAPI(prompt: string, retries: number = 2): Promise<string> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.currentModel,
            messages: [
              {
                role: 'system',
                content: 'You are a MongoDB query expert. Return ONLY valid JSON. No explanations, no markdown.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 2000,
          }),
        });

        if (response.status === 429) {
          const waitTime = Math.pow(2, i) * 1000;
          console.log(`⏳ Rate limit, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          if (i === retries - 1) throw new Error(`API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        return data.choices[0].message.content;
        
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private getDateRanges(type: string): { current: { start: Date; end: Date }; previous: { start: Date; end: Date } } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (type) {
      case 'month_over_month':
        // Current month: from 1st of this month to today
        const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentEnd = today;
        
        // Previous month: from 1st of last month to last day of last month
        const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        return {
          current: { start: currentStart, end: currentEnd },
          previous: { start: previousStart, end: previousEnd }
        };
        
      case 'week_over_week':
        // Current week: from Sunday to today
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        
        // Previous week: 7 days before current week start
        const previousWeekStart = new Date(currentWeekStart);
        previousWeekStart.setDate(currentWeekStart.getDate() - 7);
        const previousWeekEnd = new Date(currentWeekStart);
        previousWeekEnd.setDate(currentWeekStart.getDate() - 1);
        
        return {
          current: { start: currentWeekStart, end: today },
          previous: { start: previousWeekStart, end: previousWeekEnd }
        };
        
      case 'day_over_day':
        // Yesterday
        const yesterdayStart = new Date(now);
        yesterdayStart.setDate(now.getDate() - 1);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(now);
        yesterdayEnd.setDate(now.getDate() - 1);
        yesterdayEnd.setHours(23, 59, 59, 999);
        
        // Day before yesterday
        const dayBeforeStart = new Date(now);
        dayBeforeStart.setDate(now.getDate() - 2);
        dayBeforeStart.setHours(0, 0, 0, 0);
        const dayBeforeEnd = new Date(now);
        dayBeforeEnd.setDate(now.getDate() - 2);
        dayBeforeEnd.setHours(23, 59, 59, 999);
        
        return {
          current: { start: yesterdayStart, end: yesterdayEnd },
          previous: { start: dayBeforeStart, end: dayBeforeEnd }
        };
        
      default:
        const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const defaultPrevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const defaultPrevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        
        return {
          current: { start: defaultStart, end: today },
          previous: { start: defaultPrevStart, end: defaultPrevEnd }
        };
    }
  }

  async understandQuery(userQuery: string): Promise<AIUnderstanding> {
    const cacheKey = userQuery.toLowerCase().trim();
    if (this.queryCache.has(cacheKey)) {
      console.log('📦 Cache hit');
      return this.queryCache.get(cacheKey)!;
    }
    
    const prompt = `You are a MongoDB expert for a restaurant database.

DATABASE SCHEMA:
${this.dbSchema}

USER QUESTION: "${userQuery}"

IMPORTANT RULES:
1. For "total revenue", "total sales" → use aggregation with $sum on finalAmount
2. For "compare", "vs", "versus", "difference", "change" → return comparison query
3. For time periods: "this month", "last month", "this week", "last week", "today", "yesterday"
4. For completed orders → filter by status "COMPLETED"

Return JSON with appropriate structure:

FOR SINGLE PERIOD (no comparison):
{
  "intent": "description",
  "collections": ["orders"],
  "mongoQuery": {
    "$match": { "status": "COMPLETED", "createdAt": { "$gte": "2026-05-01T00:00:00.000Z" } },
    "$group": { "_id": null, "totalRevenue": { "$sum": "$finalAmount" }, "orderCount": { "$sum": 1 } }
  },
  "limit": 1,
  "aggregation": true,
  "explanation": "Calculating total revenue this month",
  "comparison": false
}

FOR COMPARISON (compare with last month/week):
{
  "intent": "comparison",
  "collections": ["orders"],
  "compareType": "month_over_month",
  "aggregation": true,
  "comparison": true,
  "explanation": "Comparing revenue this month vs last month"
}

EXAMPLES:
- "total revenue this month" → {"intent":"revenue","collections":["orders"],"mongoQuery":{"$match":{"status":"COMPLETED","createdAt":{"$gte":"2026-05-01T00:00:00.000Z"}},"$group":{"_id":null,"totalRevenue":{"$sum":"$finalAmount"}}},"limit":1,"aggregation":true,"comparison":false}
- "compare revenue with last month" → {"intent":"comparison","collections":["orders"],"compareType":"month_over_month","aggregation":true,"comparison":true}
- "sales vs last week" → {"intent":"comparison","collections":["orders"],"compareType":"week_over_week","aggregation":true,"comparison":true}
- "show me all users with admin" → {"intent":"admin users","collections":["users"],"mongoQuery":{"role":"admin"},"projection":["name","email"],"limit":50,"aggregation":false,"comparison":false}
- "low stock items" → {"intent":"low stock","collections":["stocks"],"mongoQuery":{"$expr":{"$lt":["$currentStock","$minimumStock"]}},"projection":["name","currentStock","minimumStock"],"limit":50,"aggregation":false,"comparison":false}

Return ONLY valid JSON.`;

    try {
      const response = await this.callGroqAPI(prompt);
      let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
      const understanding = JSON.parse(cleaned);
      
      // If comparison, add the date ranges
      if (understanding.comparison === true && understanding.compareType) {
        const ranges = this.getDateRanges(understanding.compareType);
        understanding.currentPeriod = ranges.current;
        understanding.previousPeriod = ranges.previous;
        understanding.mongoQuery = null; // Will be built in search engine
      } else if (understanding.mongoQuery) {
        understanding.mongoQuery = this.convertDateStrings(understanding.mongoQuery);
      }
      
      this.queryCache.set(cacheKey, understanding);
      if (this.queryCache.size > 100) {
        const firstKey = this.queryCache.keys().next().value;
        this.queryCache.delete(firstKey);
      }
      
      console.log('📋 AI Understanding:', JSON.stringify(understanding, null, 2));
      return understanding;
    } catch (error) {
      console.error('AI Error:', error);
      return this.getFallbackUnderstanding(userQuery);
    }
  }

  private getFallbackUnderstanding(query: string): AIUnderstanding {
    const lowerQuery = query.toLowerCase();
    const now = new Date();
    
    // COMPARISON queries
    if ((lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus') ||
         lowerQuery.includes('difference') || lowerQuery.includes('change')) &&
        (lowerQuery.includes('month') || lowerQuery.includes('week'))) {
      
      let compareType = 'month_over_month';
      if (lowerQuery.includes('week')) compareType = 'week_over_week';
      if (lowerQuery.includes('day')) compareType = 'day_over_day';
      
      const ranges = this.getDateRanges(compareType);
      
      return {
        intent: "comparison",
        collections: ["orders"],
        compareType: compareType,
        aggregation: true,
        comparison: true,
        currentPeriod: ranges.current,
        previousPeriod: ranges.previous,
        explanation: `Comparing revenue ${compareType.replace('_', ' ')}`,
        limit: 1
      };
    }
    
    // TOTAL REVENUE queries
    if ((lowerQuery.includes('total revenue') || lowerQuery.includes('total sales') || 
         lowerQuery.includes('revenue this month'))) {
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      return {
        intent: "total revenue",
        collections: ["orders"],
        mongoQuery: {
          $match: {
            status: "COMPLETED",
            createdAt: { $gte: startOfMonth }
          },
          $group: {
            _id: null,
            totalRevenue: { $sum: "$finalAmount" },
            orderCount: { $sum: 1 }
          }
        },
        limit: 1,
        aggregation: true,
        comparison: false,
        explanation: "Calculating total revenue from completed orders this month"
      };
    }
    
    // User/Admin queries
    if (lowerQuery.includes('user') || lowerQuery.includes('admin') || lowerQuery.includes('pos')) {
      let role = null;
      if (lowerQuery.includes('admin')) role = 'admin';
      if (lowerQuery.includes('pos')) role = 'pos';
      
      return {
        intent: role ? `${role} users` : "All users",
        collections: ["users"],
        mongoQuery: role ? { role: role } : {},
        projection: ["name", "email", "role", "phone", "status"],
        limit: 50,
        aggregation: false,
        comparison: false,
        explanation: role ? `Finding users with ${role} role` : "Finding all users"
      };
    }
    
    // Low stock items
    if (lowerQuery.includes('low stock')) {
      return {
        intent: "Low stock items",
        collections: ["stocks"],
        mongoQuery: { $expr: { $lt: ["$currentStock", "$minimumStock"] } },
        projection: ["name", "currentStock", "minimumStock", "unit"],
        limit: 50,
        aggregation: false,
        comparison: false,
        explanation: "Items where current stock is below minimum"
      };
    }
    
    // Default
    return {
      intent: "General search",
      collections: ["orders", "items", "stocks", "expenses", "waitresses"],
      mongoQuery: {},
      projection: [],
      limit: 20,
      aggregation: false,
      comparison: false,
      explanation: "Searching across main collections"
    };
  }

  private convertDateStrings(obj: any): any {
    if (!obj) return obj;
    const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        obj[key] = this.convertDateStrings(obj[key]);
      } else if (typeof obj[key] === 'string' && datePattern.test(obj[key])) {
        obj[key] = new Date(obj[key]);
      }
    }
    return obj;
  }

  async generateResponse(query: string, results: any[], understanding: AIUnderstanding): Promise<string> {
    if (!results || results.length === 0) {
      if (understanding.comparison) {
        return `📊 No data found for comparison period.`;
      }
      if (understanding.intent === 'total revenue') {
        return `💰 Total revenue this month: 0 birr (No completed orders found)`;
      }
      return `No results found for "${query}".`;
    }

    // COMPARISON response
    if (understanding.comparison === true && results.length >= 2) {
      const currentValue = results[0]?.totalRevenue || 0;
      const previousValue = results[1]?.totalRevenue || 0;
      const difference = currentValue - previousValue;
      const percentChange = previousValue > 0 ? (difference / previousValue) * 100 : 0;
      const trend = difference >= 0 ? '📈 increase' : '📉 decrease';
      
      let periodText = '';
      if (understanding.compareType === 'month_over_month') periodText = 'vs last month';
      else if (understanding.compareType === 'week_over_week') periodText = 'vs last week';
      else periodText = 'vs previous period';
      
      return `📊 Revenue ${periodText}: ${currentValue.toFixed(2)} birr (${trend} of ${Math.abs(difference).toFixed(2)} birr, ${Math.abs(percentChange).toFixed(1)}% change)`;
    }
    
    // Single period revenue
    if (understanding.intent === 'total revenue' && results.length > 0) {
      const totalRevenue = results[0]?.totalRevenue || 0;
      const orderCount = results[0]?.orderCount || 0;
      return `💰 Total revenue this month: ${totalRevenue.toFixed(2)} birr from ${orderCount} completed order(s)`;
    }
    
    // User/Admin response
    if (understanding.collections?.includes('users')) {
      const userList = results.map((u: any) => `${u.name || u.email} (${u.role || 'no role'})`).join('\n• ');
      return `👥 Found ${results.length} user(s):\n• ${userList}`;
    }
    
    // Low stock response
    if (understanding.intent === 'low stock' && results.length > 0) {
      const items = results.map((r: any) => `${r.name}: ${r.currentStock}/${r.minimumStock} ${r.unit || ''}`).join('\n• ');
      return `⚠️ Found ${results.length} low stock item(s):\n• ${items}`;
    }
    
    return `Found ${results.length} result(s) for your query.`;
  }

  async suggestFollowUps(query: string, results: any[], understanding: AIUnderstanding): Promise<string[]> {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('revenue') || lowerQuery.includes('total')) {
      return ['Compare with last month', 'Show daily breakdown', 'Show top selling items'];
    }
    
    if (lowerQuery.includes('compare')) {
      return ['Show this month only', 'Show weekly trend', 'Export comparison data'];
    }
    
    if (lowerQuery.includes('user') || lowerQuery.includes('admin')) {
      return ['Show me all users', 'Show me POS users', 'Show user permissions'];
    }
    
    return ['Show me more details', 'Export this data', 'Compare with previous period'];
  }
}
