export interface ParsedQuery {
  originalQuery: string;
  intent: SearchIntent;
  entities: QueryEntities;
  collections: string[];
  aggregation: AggregationPipeline;
  timeRange: TimeRange | null;
  filters: Record<string, any>;
  limit: number;
}

export type SearchIntent = 
  | 'sales_analytics'
  | 'staff_performance'
  | 'inventory_management'
  | 'customer_insights'
  | 'menu_performance'
  | 'financials'
  | 'operations'
  | 'delivery_tracking'
  | 'deletion_audit'
  | 'general_search';

export interface QueryEntities {
  metrics?: string[];
  dimensions?: string[];
  timePeriod?: string;
  topBottom?: 'top' | 'bottom';
  limit?: number;
  compareWith?: string;
  filters?: Record<string, any>;
}

export interface AggregationPipeline {
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  calculations?: string[];
  stages: any[];
}

export interface TimeRange {
  type: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';
  start?: Date;
  end?: Date;
}

export class AdvancedBusinessNLU {
  private intentPatterns: Record<SearchIntent, RegExp[]> = {
    sales_analytics: [
      /sales|revenue|income|earnings|total\s*sales|how\s*much\s*(?:did|have)\s*we\s*(?:make|earn)/i,
      /best\s*selling|top\s*items|most\s*popular|highest\s*grossing/i,
      /daily\s*sales|weekly\s*sales|monthly\s*sales|sales\s*report/i,
      /this\s*week'?\s*sales|last\s*week'?\s*sales|this\s*month'?\s*sales/i
    ],
    staff_performance: [
      /best\s*performer|top\s*waiter|best\s*waitress|employee\s*of\s*the\s*(?:week|month)/i,
      /waiter\s*performance|waitress\s*performance|staff\s*performance|server\s*sales/i,
      /who\s*sold\s*the\s*most|highest\s*sales\s*by\s*staff|top\s*earning\s*staff/i,
      /most\s*orders\s*taken|most\s*tables\s*served|busiest\s*staff/i
    ],
    inventory_management: [
      /low\s*stock|out\s*of\s*stock|inventory\s*alert|restock|reorder/i,
      /stock\s*level|current\s*inventory|available\s*stock|remaining\s*stock/i,
      /expiring|expired|near\s*expiry|about\s*to\s*expire/i,
      /most\s*used\s*ingredient|high\s*consumption|fast\s*moving\s*stock/i
    ],
    customer_insights: [
      /vip\s*customer|loyal\s*customer|regular\s*customer|frequent\s*diner/i,
      /top\s*customer|best\s*customer|highest\s*spending\s*customer/i,
      /customer\s*preference|favorite\s*dish|most\s*ordered\s*by\s*customer/i,
      /new\s*customer|first\s*time\s*customer|recent\s*customer/i
    ],
    menu_performance: [
      /best\s*selling\s*dish|most\s*popular\s*item|top\s*menu\s*item/i,
      /least\s*selling|slow\s*moving|worst\s*performing\s*item/i,
      /most\s*profitable|highest\s*margin|best\s*profit\s*item/i,
      /item\s*popularity|dish\s*ranking|menu\s*performance/i
    ],
    financials: [
      /profit|profitability|net\s*profit|gross\s*profit|margin/i,
      /expense|cost|spending|overhead|operating\s*cost/i,
      /common\s*expense|recurring\s*cost|fixed\s*cost/i,
      /total\s*revenue|total\s*expense|net\s*income/i
    ],
    operations: [
      /table\s*arrangement|floor\s*plan|seating\s*layout|table\s*status/i,
      /available\s*tables|occupied\s*tables|free\s*tables/i,
      /preparation\s*time|cooking\s*time|recipe\s*steps/i,
      /preparation\s*log|cooking\s*log|kitchen\s*activity/i
    ],
    delivery_tracking: [
      /delivery\s*acceptance|delivery\s*status|order\s*acceptance/i,
      /delivered\s*orders|pending\s*delivery|confirmed\s*delivery/i,
      /delivery\s*performance|acceptance\s*rate|delivery\s*time/i
    ],
    deletion_audit: [
      /deleted\s*orders|cancelled\s*orders|removed\s*orders/i,
      /deletion\s*request|delete\s*request|cancellation\s*request/i,
      /who\s*deleted|deleted\s*by|deletion\s*log/i,
      /why\s*was\s*deleted|reason\s*for\s*deletion/i
    ],
    general_search: [
      /find|search|look\s*for|show\s*me|get\s*me|i\s*want\s*to\s*see/i
    ]
  };

  private timePatterns: Record<string, RegExp> = {
    today: /today|current\s*day|this\s*day/i,
    yesterday: /yesterday|previous\s*day/i,
    this_week: /this\s*week|current\s*week/i,
    last_week: /last\s*week|previous\s*week|past\s*week/i,
    this_month: /this\s*month|current\s*month/i,
    last_month: /last\s*month|previous\s*month/i,
    this_year: /this\s*year|current\s*year/i,
    last_year: /last\s*year|previous\s*year/i
  };

  parse(query: string): ParsedQuery {
    const lowerQuery = query.toLowerCase();
    
    // Detect intent
    const intent = this.detectIntent(lowerQuery);
    
    // Extract time range
    const timeRange = this.extractTimeRange(lowerQuery);
    
    // Extract entities (metrics, dimensions, etc.)
    const entities = this.extractEntities(lowerQuery, intent);
    
    // Determine collections to search
    const collections = this.determineCollections(intent, entities);
    
    // Build aggregation pipeline
    const aggregation = this.buildAggregation(intent, entities, timeRange);
    
    // Extract filters
    const filters = this.extractFilters(lowerQuery);
    
    return {
      originalQuery: query,
      intent,
      entities,
      collections,
      aggregation,
      timeRange,
      filters,
      limit: entities.limit || 20
    };
  }

  private detectIntent(query: string): SearchIntent {
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          return intent as SearchIntent;
        }
      }
    }
    return 'general_search';
  }

  private extractTimeRange(query: string): TimeRange | null {
    for (const [type, pattern] of Object.entries(this.timePatterns)) {
      if (pattern.test(query)) {
        const now = new Date();
        const range: TimeRange = { type: type as any };
        
        switch (type) {
          case 'today':
            range.start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            range.end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'yesterday':
            range.start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            range.end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'this_week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            range.start = startOfWeek;
            range.end = now;
            break;
          case 'last_week':
            range.start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            range.end = now;
            break;
          case 'this_month':
            range.start = new Date(now.getFullYear(), now.getMonth(), 1);
            range.end = now;
            break;
          case 'last_month':
            range.start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            range.end = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        }
        
        return range;
      }
    }
    return null;
  }

  private extractEntities(query: string, intent: SearchIntent): QueryEntities {
    const entities: QueryEntities = {};
    
    // Extract top/bottom
    if (/\b(top|best|highest|most)\b/i.test(query)) {
      entities.topBottom = 'top';
    } else if (/\b(bottom|worst|lowest|least)\b/i.test(query)) {
      entities.topBottom = 'bottom';
    }
    
    // Extract limit
    const limitMatch = query.match(/(?:top|bottom|best|worst)\s+(\d+)/i);
    if (limitMatch) {
      entities.limit = parseInt(limitMatch[1]);
    }
    
    // Extract metrics based on intent
    switch (intent) {
      case 'sales_analytics':
        entities.metrics = ['total_amount', 'order_count', 'avg_order_value'];
        entities.dimensions = ['date', 'item', 'category'];
        break;
      case 'staff_performance':
        entities.metrics = ['total_sales', 'order_count', 'avg_order_value', 'table_count'];
        entities.dimensions = ['waiter_name', 'shift'];
        break;
      case 'menu_performance':
        entities.metrics = ['quantity_sold', 'revenue', 'profit_margin'];
        entities.dimensions = ['item_name', 'category'];
        break;
      case 'customer_insights':
        entities.metrics = ['total_spent', 'visit_count', 'avg_order_value'];
        entities.dimensions = ['customer_name', 'loyalty_tier'];
        break;
    }
    
    return entities;
  }

  private determineCollections(intent: SearchIntent, entities: QueryEntities): string[] {
    const collectionMap: Record<SearchIntent, string[]> = {
      sales_analytics: ['orders', 'items', 'used_stock'],
      staff_performance: ['orders', 'waitresses', 'users'],
      inventory_management: ['stocks', 'used_stock', 'stock_categories', 'purchase_requests'],
      customer_insights: ['orders', 'users', 'userPoints', 'referrals'],
      menu_performance: ['items', 'orders', 'healthy_menu'],
      financials: ['expenses', 'commonExpenses', 'orders'],
      operations: ['tablearrangements', 'preparation_recipes', 'preparation_logs'],
      delivery_tracking: ['delivery_accepter', 'orders'],
      deletion_audit: ['deletion_logs', 'deletion_requests'],
      general_search: ['orders', 'items', 'stocks', 'users', 'waitresses', 'expenses']
    };
    
    return collectionMap[intent];
  }

  private buildAggregation(intent: SearchIntent, entities: QueryEntities, timeRange: TimeRange | null): AggregationPipeline {
    const stages: any[] = [];
    
    // Add time filter
    if (timeRange?.start && timeRange?.end) {
      stages.push({
        $match: {
          createdAt: { $gte: timeRange.start, $lte: timeRange.end }
        }
      });
    }
    
    // Build grouping based on intent
    switch (intent) {
      case 'sales_analytics':
        if (entities.dimensions?.includes('date')) {
          stages.push({
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              total_sales: { $sum: "$finalAmount" },
              order_count: { $sum: 1 },
              avg_order_value: { $avg: "$finalAmount" }
            }
          });
        }
        break;
        
      case 'staff_performance':
        stages.push({
          $group: {
            _id: "$waiterName",
            total_sales: { $sum: "$finalAmount" },
            order_count: { $sum: 1 },
            avg_order_value: { $avg: "$finalAmount" },
            tables_served: { $addToSet: "$tableNumber" }
          }
        });
        
        if (entities.topBottom === 'top') {
          stages.push({ $sort: { total_sales: -1 } });
        } else if (entities.topBottom === 'bottom') {
          stages.push({ $sort: { total_sales: 1 } });
        }
        break;
        
      case 'menu_performance':
        stages.push(
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.itemName",
              quantity_sold: { $sum: "$items.quantity" },
              revenue: { $sum: "$items.total" },
              order_count: { $sum: 1 }
            }
          }
        );
        
        if (entities.topBottom === 'top') {
          stages.push({ $sort: { quantity_sold: -1 } });
        }
        break;
        
      case 'customer_insights':
        stages.push({
          $group: {
            _id: "$customerId",
            total_spent: { $sum: "$finalAmount" },
            visit_count: { $sum: 1 },
            avg_spent: { $avg: "$finalAmount" }
          }
        });
        
        if (entities.topBottom === 'top') {
          stages.push({ $sort: { total_spent: -1 } });
        }
        break;
        
      case 'inventory_management':
        // Find low stock items
        stages.push({
          $match: {
            $expr: { $lt: ["$currentStock", "$minimumStock"] }
          }
        });
        break;
    }
    
    // Add limit
    if (entities.limit) {
      stages.push({ $limit: entities.limit });
    }
    
    return {
      groupBy: entities.dimensions?.[0],
      sortBy: entities.topBottom === 'top' ? 'desc' : entities.topBottom === 'bottom' ? 'asc' : undefined,
      calculations: entities.metrics,
      stages
    };
  }

  private extractFilters(query: string): Record<string, any> {
    const filters: Record<string, any> = {};
    
    // Status filters
    if (/\b(pending|waiting|unconfirmed)\b/i.test(query)) filters.status = 'PENDING';
    if (/\b(confirmed|accepted|approved)\b/i.test(query)) filters.status = 'CONFIRMED';
    if (/\b(preparing|cooking|in progress)\b/i.test(query)) filters.status = 'PREPARING';
    if (/\b(completed|done|finished|served)\b/i.test(query)) filters.status = 'COMPLETED';
    if (/\b(cancelled|canceled|void)\b/i.test(query)) filters.status = 'CANCELLED';
    if (/\b(delivered|received)\b/i.test(query)) filters.status = 'DELIVERED';
    
    // Priority filters
    if (/\b(urgent|high priority|asap|critical)\b/i.test(query)) filters.priority = 'high';
    if (/\b(low priority|whenever|not urgent)\b/i.test(query)) filters.priority = 'low';
    
    // Shift filters
    if (/\b(morning|day shift)\b/i.test(query)) filters.shift = 'MORNING';
    if (/\b(evening|night shift)\b/i.test(query)) filters.shift = 'EVENING';
    
    // Customer tier
    if (/\b(vip|premium|regular customer)\b/i.test(query)) filters.customerTier = 'vip';
    
    return filters;
  }
}
