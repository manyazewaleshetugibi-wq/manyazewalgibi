import clientPromise from './mongodb';

export interface SearchResult {
  success: boolean;
  summary: string;
  insights: string[];
  data: any;
  metadata: {
    queryType: string;
    total: number;
    collectionsUsed: string[];
    filtersApplied?: any;
    limit?: number;
  };
}

export class WorkingSearchEngine {
  
  async search(query: string): Promise<SearchResult> {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'gold');
    
    const lowerQuery = query.toLowerCase();
    
    // Extract number limit from query
    let limit = this.extractNumberLimit(query);
    
    // Sales & Menu Items
    if (lowerQuery.includes('most frequently sold') || 
        (lowerQuery.includes('top') && lowerQuery.includes('selling') && lowerQuery.includes('item')) ||
        (lowerQuery.includes('best') && lowerQuery.includes('seller')) ||
        (lowerQuery.includes('popular') && lowerQuery.includes('item')) ||
        (lowerQuery.includes('least') && lowerQuery.includes('selling'))) {
      
      let category: string | null = null;
      if (lowerQuery.includes('food') && !lowerQuery.includes('beverage')) category = 'food';
      else if (lowerQuery.includes('beverage') || lowerQuery.includes('drink')) category = 'beverage';
      else if (lowerQuery.includes('hot drink')) category = 'hot drink';
      else if (lowerQuery.includes('juice')) category = 'juice';
      else if (lowerQuery.includes('mocktails')) category = 'mocktails';
      else if (lowerQuery.includes('soft drink')) category = 'soft drink';
      else if (lowerQuery.includes('extras')) category = 'extras';
      else if (lowerQuery.includes('appetizer')) category = 'appetizer';
      else if (lowerQuery.includes('dessert')) category = 'dessert';
      
      const sortOrder = lowerQuery.includes('least') ? 'asc' : 'desc';
      return await this.getTopSellingItems(db, query, category, limit, sortOrder);
    }
    
    // Deletion & Flagged Orders
    if (lowerQuery.includes('deleted') || lowerQuery.includes('cancelled') || 
        lowerQuery.includes('flagged') || lowerQuery.includes('marked for deletion') ||
        lowerQuery.includes('deletion request')) {
      return await this.getDeletionData(db, query, limit);
    }
    
    // Staff Performance
    if (lowerQuery.includes('best performer') || 
        (lowerQuery.includes('top') && (lowerQuery.includes('waiter') || lowerQuery.includes('waitress'))) ||
        lowerQuery.includes('employee of the')) {
      return await this.getTopPerformers(db, query, limit);
    }
    
    // Delivery Acceptance
    if ((lowerQuery.includes('delivery') && lowerQuery.includes('accepter')) ||
        lowerQuery.includes('delivery acceptance')) {
      return await this.getDeliveryAcceptance(db, query, limit);
    }
    
    // Inventory & Stock
    if (lowerQuery.includes('low stock') || lowerQuery.includes('inventory') || 
        lowerQuery.includes('stock level') || lowerQuery.includes('critical stock')) {
      return await this.getInventoryStatus(db, query, limit);
    }
    
    // Expenses & Financials
    if (lowerQuery.includes('expense') || lowerQuery.includes('cost') || 
        lowerQuery.includes('spending') || lowerQuery.includes('profit')) {
      return await this.getExpenses(db, query, limit);
    }
    
    // Customers & VIP
    if (lowerQuery.includes('customer') || lowerQuery.includes('vip') || 
        lowerQuery.includes('loyal') || lowerQuery.includes('top spender')) {
      return await this.getCustomers(db, query, limit);
    }
    
    // Tables & Seating
    if (lowerQuery.includes('table') || lowerQuery.includes('seating') || 
        lowerQuery.includes('floor') || lowerQuery.includes('layout')) {
      return await this.getTableStatus(db, query, limit);
    }
    
    // Orders
    if (lowerQuery.includes('order') || lowerQuery.includes('sale') || 
        lowerQuery.includes('transaction') || lowerQuery.includes('bill')) {
      return await this.getOrders(db, query, limit);
    }
    
    // Waitresses
    if (lowerQuery.includes('waitress') || lowerQuery.includes('waiter') || 
        lowerQuery.includes('server')) {
      return await this.getWaitresses(db, query, limit);
    }
    
    // Menu Items
    if (lowerQuery.includes('menu') || lowerQuery.includes('item') || 
        lowerQuery.includes('dish') || lowerQuery.includes('food item')) {
      return await this.getMenuItems(db, query, limit);
    }
    
    // Prizes & Lottery
    if (lowerQuery.includes('prize') || lowerQuery.includes('lottery') || 
        lowerQuery.includes('winner')) {
      return await this.getPrizes(db, query, limit);
    }
    
    // Recipes & Preparation
    if (lowerQuery.includes('recipe') || lowerQuery.includes('preparation') || 
        lowerQuery.includes('cooking')) {
      return await this.getRecipes(db, query, limit);
    }
    
    // Healthy Menu
    if (lowerQuery.includes('healthy') || lowerQuery.includes('diet') || 
        lowerQuery.includes('nutrition')) {
      return await this.getHealthyMenu(db, query, limit);
    }
    
    // General Search
    return await this.generalSearch(db, query, limit);
  }

  private extractNumberLimit(query: string): number {
    const patterns = [
      /top\s+(\d+)/i,
      /best\s+(\d+)/i,
      /most\s+frequently\s+sold\s+(\d+)/i,
      /(\d+)\s+(?:items|products|dishes|foods)/i,
      /limit\s+(\d+)/i,
      /first\s+(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return 10;
  }

  // Category helper methods
  private isFoodItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    
    const foodKeywords = [
      'burger', 'pizza', 'pasta', 'rice', 'bread', 'sandwich', 'salad', 'soup',
      'meat', 'chicken', 'beef', 'fish', 'seafood', 'vegetable', 'fries', 'potato',
      'egg', 'cheese', 'wrap', 'taco', 'burrito', 'noodle', 'curry', 'stew',
      'birtat', 'shiro', 'wat', 'doro', 'kitfo', 'tibs', 'injera', 'fosesse'
    ];
    
    return foodKeywords.some(keyword => lowerName.includes(keyword) || lowerDesc.includes(keyword));
  }

  private isBeverageItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const lowerDesc = (description || '').toLowerCase();
    
    const beverageKeywords = [
      'coffee', 'tea', 'juice', 'soda', 'water', 'coke', 'pepsi', 'sprite',
      'lemonade', 'smoothie', 'milkshake', 'beer', 'wine', 'cocktail', 'mocktail',
      'macchiato', 'latte', 'cappuccino', 'espresso', 'americano', 'mocha'
    ];
    
    return beverageKeywords.some(keyword => lowerName.includes(keyword) || lowerDesc.includes(keyword));
  }

  private isHotDrinkItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const hotDrinkKeywords = ['coffee', 'tea', 'macchiato', 'latte', 'cappuccino', 'espresso', 'americano', 'mocha', 'hot chocolate'];
    return hotDrinkKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isJuiceItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const juiceKeywords = ['juice', 'orange', 'apple', 'mango', 'pineapple', 'watermelon', 'lemon', 'lime'];
    return juiceKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isMocktailItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const mocktailKeywords = ['mocktail', 'virgin', 'non-alcoholic', 'fruit punch'];
    return mocktailKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isSoftDrinkItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const softDrinkKeywords = ['soda', 'coke', 'pepsi', 'sprite', 'fanta', '7up', 'soft drink'];
    return softDrinkKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isExtrasItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const extrasKeywords = ['extra', 'side', 'sauce', 'dip', 'topping', 'add-on'];
    return extrasKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isAppetizerItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const appetizerKeywords = ['appetizer', 'starter', 'finger food', 'snack', 'nibble', 'spring roll', 'samosa', 'dip'];
    return appetizerKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isMainCourseItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const mainKeywords = ['main', 'entree', 'platter', 'special', 'grill', 'roast', 'steak'];
    return mainKeywords.some(keyword => lowerName.includes(keyword));
  }

  private isDessertItem(name: string, description: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const dessertKeywords = ['dessert', 'cake', 'pie', 'ice cream', 'sorbet', 'pudding', 'mousse', 'cheesecake', 'brownie'];
    return dessertKeywords.some(keyword => lowerName.includes(keyword));
  }

  private getItemCategory(item: any): string {
    const name = item.name || '';
    const description = item.description || '';
    
    if (this.isHotDrinkItem(name, description)) return 'hot drink';
    if (this.isJuiceItem(name, description)) return 'juice';
    if (this.isMocktailItem(name, description)) return 'mocktails';
    if (this.isSoftDrinkItem(name, description)) return 'soft drink';
    if (this.isExtrasItem(name, description)) return 'extras';
    if (this.isBeverageItem(name, description)) return 'beverage';
    if (this.isFoodItem(name, description)) return 'food';
    if (this.isAppetizerItem(name, description)) return 'appetizer';
    if (this.isDessertItem(name, description)) return 'dessert';
    
    return 'uncategorized';
  }

  private async getTopSellingItems(db: any, query: string, category: string | null, limit: number = 10, sortOrder: string = 'desc'): Promise<SearchResult> {
    try {
      const lowerQuery = query.toLowerCase();
      let dateFilter: any = {};
      let period = 'this month';
      const now = new Date();
      
      if (lowerQuery.includes('this month') || lowerQuery.includes('current month')) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
        period = 'this month';
      } else if (lowerQuery.includes('last month')) {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilter = { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } };
        period = 'last month';
      } else if (lowerQuery.includes('this week')) {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        dateFilter = { createdAt: { $gte: startOfWeek } };
        period = 'this week';
      } else if (lowerQuery.includes('today')) {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: startOfDay } };
        period = 'today';
      } else if (lowerQuery.includes('all time')) {
        period = 'all time';
      }
      
      const ordersCollection = db.collection('orders');
      const itemsCollection = db.collection('items');
      
      // Build item category map
      const allItems = await itemsCollection.find({}).toArray();
      const itemCategoryMap = new Map();
      
      for (const item of allItems) {
        itemCategoryMap.set(item._id.toString(), {
          name: item.name,
          categoryId: item.categoryId,
          category: this.getItemCategory(item),
          isFood: this.isFoodItem(item.name, item.description),
          isBeverage: this.isBeverageItem(item.name, item.description),
          isHotDrink: this.isHotDrinkItem(item.name, item.description),
          isJuice: this.isJuiceItem(item.name, item.description),
          isMocktail: this.isMocktailItem(item.name, item.description),
          isSoftDrink: this.isSoftDrinkItem(item.name, item.description),
          isExtras: this.isExtrasItem(item.name, item.description)
        });
      }
      
      // Build aggregation pipeline
      const pipeline: any[] = [];
      if (Object.keys(dateFilter).length > 0) {
        pipeline.push({ $match: dateFilter });
      }
      
      pipeline.push(
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.itemId",
            itemName: { $first: "$items.itemName" },
            totalQuantity: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.total" },
            orderCount: { $sum: 1 },
            avgPrice: { $avg: "$items.unitPrice" }
          }
        }
      );
      
      // Apply sorting
      if (sortOrder === 'desc') {
        pipeline.push({ $sort: { totalQuantity: -1 } });
      } else {
        pipeline.push({ $sort: { totalQuantity: 1 } });
      }
      
      pipeline.push({ $limit: limit * 2 }); // Get more for filtering
      
      let topItems = await ordersCollection.aggregate(pipeline).toArray();
      
      // Enrich items with category info and filter by category
      const enrichedItems = [];
      for (const item of topItems) {
        const itemId = item._id.toString();
        const categoryInfo = itemCategoryMap.get(itemId) || { category: 'uncategorized' };
        
        const enrichedItem = {
          ...item,
          itemId: itemId,
          categoryId: categoryInfo.categoryId,
          category: categoryInfo.category,
          isFood: categoryInfo.isFood || false,
          isBeverage: categoryInfo.isBeverage || false,
          isHotDrink: categoryInfo.isHotDrink || false,
          isJuice: categoryInfo.isJuice || false,
          isMocktail: categoryInfo.isMocktail || false,
          isSoftDrink: categoryInfo.isSoftDrink || false,
          isExtras: categoryInfo.isExtras || false
        };
        
        // Apply category filter
        let shouldInclude = true;
        if (category) {
          switch(category) {
            case 'food': shouldInclude = enrichedItem.isFood; break;
            case 'beverage': shouldInclude = enrichedItem.isBeverage; break;
            case 'hot drink': shouldInclude = enrichedItem.isHotDrink; break;
            case 'juice': shouldInclude = enrichedItem.isJuice; break;
            case 'mocktails': shouldInclude = enrichedItem.isMocktail; break;
            case 'soft drink': shouldInclude = enrichedItem.isSoftDrink; break;
            case 'extras': shouldInclude = enrichedItem.isExtras; break;
            default: shouldInclude = true;
          }
        }
        
        if (shouldInclude) {
          enrichedItems.push(enrichedItem);
        }
      }
      
      const finalItems = enrichedItems.slice(0, limit);
      const orderText = sortOrder === 'desc' ? 'Top' : 'Least';
      const categoryText = category ? `${category} ` : '';
      
      const summary = `${orderText} ${limit} ${categoryText}selling items ${period}: ${finalItems[0]?.itemName || 'None'} with ${finalItems[0]?.totalQuantity || 0} units sold`;
      
      const insights: string[] = [
        `📊 Showing ${finalItems.length} ${categoryText}items for ${period}`,
        finalItems[0] ? `🥇 #1: ${finalItems[0].itemName} - ${finalItems[0].totalQuantity} units (${finalItems[0].totalRevenue?.toFixed(2) || 0} birr)` : '',
        finalItems[1] ? `🥈 #2: ${finalItems[1].itemName} - ${finalItems[1].totalQuantity} units` : '',
        finalItems[2] ? `🥉 #3: ${finalItems[2].itemName} - ${finalItems[2].totalQuantity} units` : '',
        `💰 Total revenue: ${finalItems.reduce((sum: number, i: any) => sum + (i.totalRevenue || 0), 0).toFixed(2)} birr`
      ].filter(Boolean);
      
      return {
        success: true,
        summary,
        insights,
        data: finalItems,
        metadata: {
          queryType: 'top_selling_items',
          total: finalItems.length,
          collectionsUsed: ['orders', 'items'],
          filtersApplied: { period, category: category || 'all', limit, sortOrder },
          limit
        }
      };
      
    } catch (error) {
      console.error('Error in getTopSellingItems:', error);
      return {
        success: false,
        summary: 'Error fetching top selling items',
        insights: ['An error occurred while processing your request'],
        data: [],
        metadata: { queryType: 'top_selling_items', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getTopPerformers(db: any, query: string, limit: number = 10): Promise<SearchResult> {
    try {
      const lowerQuery = query.toLowerCase();
      let dateFilter: any = {};
      let period = 'this week';
      const now = new Date();
      
      if (lowerQuery.includes('this month')) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
        period = 'this month';
      } else if (lowerQuery.includes('today')) {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = { createdAt: { $gte: startOfDay } };
        period = 'today';
      } else {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        dateFilter = { createdAt: { $gte: startOfWeek } };
      }
      
      const ordersCollection = db.collection('orders');
      const waitressesCollection = db.collection('waitresses');
      
      const pipeline: any[] = [];
      if (Object.keys(dateFilter).length > 0) {
        pipeline.push({ $match: dateFilter });
      }
      
      pipeline.push(
        {
          $group: {
            _id: "$waiterName",
            totalSales: { $sum: "$finalAmount" },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: "$finalAmount" },
            tablesServed: { $addToSet: "$tableNumber" }
          }
        },
        {
          $project: {
            name: { $ifNull: ["$_id", "Unassigned"] },
            totalSales: 1,
            orderCount: 1,
            avgOrderValue: 1,
            tablesCount: { $size: "$tablesServed" }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: limit }
      );
      
      let performers = await ordersCollection.aggregate(pipeline).toArray();
      performers = performers.filter((p: any) => p.name && p.name !== 'Unassigned');
      
      for (const performer of performers) {
        const waitress = await waitressesCollection.findOne({ name: performer.name });
        if (waitress) {
          performer.shift = waitress.shift;
          performer.phone = waitress.phone;
          performer.email = waitress.email;
        }
      }
      
      const summary = `🏆 Top ${limit} performers ${period}: ${performers[0]?.name || 'None'} with ${performers[0]?.totalSales?.toFixed(2) || 0} birr`;
      
      const insights = performers.slice(0, 5).map((p: any, i: number) => 
        `${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}️⃣`} ${p.name}: ${p.totalSales?.toFixed(2) || 0} birr (${p.orderCount} orders)`
      );
      
      return {
        success: true,
        summary,
        insights,
        data: performers,
        metadata: { queryType: 'top_performers', total: performers.length, collectionsUsed: ['orders', 'waitresses'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching top performers',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'top_performers', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getDeliveryAcceptance(db: any, query: string, limit: number = 10): Promise<SearchResult> {
    try {
      const deliveryCollection = db.collection('delivery_accepter');
      
      const accepters = await deliveryCollection.aggregate([
        {
          $group: {
            _id: "$accepterName",
            totalAcceptances: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ["$orderDetails.finalAmount", 0] } },
            uniqueOrders: { $addToSet: "$orderId" }
          }
        },
        {
          $project: {
            name: { $ifNull: ["$_id", "Unknown"] },
            totalAcceptances: 1,
            totalAmount: 1,
            uniqueOrdersCount: { $size: "$uniqueOrders" }
          }
        },
        { $sort: { totalAcceptances: -1 } },
        { $limit: limit }
      ]).toArray();
      
      const totalBirr = accepters.reduce((sum: number, a: any) => sum + (a.totalAmount || 0), 0);
      const totalOrders = accepters.reduce((sum: number, a: any) => sum + a.totalAcceptances, 0);
      
      const summary = `🚚 Delivery Acceptance: Top ${accepters.length} staff accepted ${totalOrders} orders worth ${totalBirr.toFixed(2)} birr`;
      
      const insights: string[] = [
        `💰 Total delivery value: ${totalBirr.toFixed(2)} birr`,
        `🏆 Top accepter: ${accepters[0]?.name} (${accepters[0]?.totalAcceptances} orders, ${accepters[0]?.totalAmount?.toFixed(2) || 0} birr)`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: accepters,
        metadata: { queryType: 'delivery_acceptance', total: accepters.length, collectionsUsed: ['delivery_accepter'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching delivery data',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'delivery_acceptance', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getInventoryStatus(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const stocksCollection = db.collection('stocks');
      let stocks = await stocksCollection.find({}).toArray();
      
      const criticalStocks = stocks.filter((s: any) => s.currentStock < s.minimumStock);
      const lowStocks = stocks.filter((s: any) => s.currentStock >= s.minimumStock && s.currentStock < 20);
      
      const limitedCritical = criticalStocks.slice(0, limit);
      const limitedLow = lowStocks.slice(0, limit);
      
      const summary = `📦 Inventory: ${criticalStocks.length} critically low, ${lowStocks.length} low, ${stocks.length - criticalStocks.length - lowStocks.length} healthy`;
      
      const insights: string[] = [
        criticalStocks.length > 0 ? `⚠️ CRITICAL: ${limitedCritical.map((s: any) => s.name).join(', ')}` : '✅ No critical stock issues',
        lowStocks.length > 0 ? `📉 LOW: ${limitedLow.map((s: any) => s.name).slice(0, 5).join(', ')}` : '✅ No low stock issues',
        `✅ Total items: ${stocks.length}`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: { critical: limitedCritical, low: limitedLow, all: stocks.slice(0, limit) },
        metadata: { queryType: 'inventory', total: stocks.length, collectionsUsed: ['stocks'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching inventory',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'inventory', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getCustomers(db: any, query: string, limit: number = 10): Promise<SearchResult> {
    try {
      const ordersCollection = db.collection('orders');
      const usersCollection = db.collection('users');
      
      let customers = await ordersCollection.aggregate([
        {
          $group: {
            _id: "$customerId",
            totalSpent: { $sum: "$finalAmount" },
            orderCount: { $sum: 1 },
            avgSpent: { $avg: "$finalAmount" },
            lastOrder: { $max: "$createdAt" }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: limit }
      ]).toArray();
      
      for (const customer of customers) {
        if (customer._id && customer._id !== 'walk-in') {
          const user = await usersCollection.findOne({ _id: customer._id });
          if (user) {
            customer.name = user.name;
            customer.email = user.email;
            customer.phone = user.phone;
          } else {
            customer.name = customer._id;
          }
        } else {
          customer.name = 'Walk-in Customer';
        }
        customer.customerId = customer._id;
        delete customer._id;
      }
      
      const vipCount = customers.filter((c: any) => c.totalSpent > 5000).length;
      const totalSpent = customers.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
      
      const summary = `👥 Top ${customers.length} Customers: ${vipCount} VIPs, total spending ${totalSpent.toFixed(2)} birr`;
      
      const insights: string[] = [
        `⭐ VIP customers: ${vipCount}`,
        `🏆 Top spender: ${customers[0]?.name} (${customers[0]?.totalSpent?.toFixed(2) || 0} birr)`,
        `📊 Total customer spending: ${totalSpent.toFixed(2)} birr`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: customers,
        metadata: { queryType: 'customers', total: customers.length, collectionsUsed: ['orders', 'users'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching customers',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'customers', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getOrders(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const ordersCollection = db.collection('orders');
      const lowerQuery = query.toLowerCase();
      
      let filter: any = {};
      
      if (lowerQuery.includes('pending')) filter.status = 'PENDING';
      if (lowerQuery.includes('confirmed')) filter.status = 'CONFIRMED';
      if (lowerQuery.includes('completed')) filter.status = 'COMPLETED';
      if (lowerQuery.includes('cancelled')) filter.status = 'CANCELLED';
      
      const now = new Date();
      if (lowerQuery.includes('today')) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filter.createdAt = { $gte: start };
      }
      
      const orders = await ordersCollection.find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
      const totalAmount = orders.reduce((sum: number, o: any) => sum + (o.finalAmount || 0), 0);
      
      const summary = `📋 Orders: ${orders.length} orders found (${totalAmount.toFixed(2)} birr total)`;
      
      const insights: string[] = [
        `💰 Total order value: ${totalAmount.toFixed(2)} birr`,
        `📊 Average order value: ${(totalAmount / (orders.length || 1)).toFixed(2)} birr`,
        `🍽️ Total items: ${orders.reduce((sum: number, o: any) => sum + (o.items?.length || 0), 0)}`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: orders,
        metadata: { queryType: 'orders', total: orders.length, collectionsUsed: ['orders'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching orders',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'orders', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getWaitresses(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const waitressesCollection = db.collection('waitresses');
      const lowerQuery = query.toLowerCase();
      
      let filter: any = { isActive: true };
      if (lowerQuery.includes('morning')) filter.shift = 'MORNING';
      if (lowerQuery.includes('evening')) filter.shift = 'EVENING';
      
      const waitresses = await waitressesCollection.find(filter).limit(limit).toArray();
      
      const summary = `👥 Waitresses: ${waitresses.length} active staff members`;
      
      const insights: string[] = [
        `📊 Total staff: ${waitresses.length}`,
        `🌅 Morning shift: ${waitresses.filter((w: any) => w.shift === 'MORNING').length}`,
        `🌙 Evening shift: ${waitresses.filter((w: any) => w.shift === 'EVENING').length}`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: waitresses,
        metadata: { queryType: 'waitresses', total: waitresses.length, collectionsUsed: ['waitresses'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching waitresses',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'waitresses', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getMenuItems(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const itemsCollection = db.collection('items');
      const lowerQuery = query.toLowerCase();
      
      let filter: any = {};
      if (lowerQuery.includes('active')) filter.isActive = true;
      if (lowerQuery.includes('featured')) filter.isFeatured = true;
      
      const items = await itemsCollection.find(filter).limit(limit).toArray();
      const avgPrice = items.reduce((sum: number, i: any) => sum + (i.price || 0), 0) / (items.length || 1);
      
      const summary = `🍽️ Menu Items: ${items.length} items found`;
      
      const insights: string[] = [
        `📊 Total items: ${items.length}`,
        `✅ Active items: ${items.filter((i: any) => i.isActive).length}`,
        `💰 Average price: ${avgPrice.toFixed(2)} birr`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: items,
        metadata: { queryType: 'menu_items', total: items.length, collectionsUsed: ['items'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching menu items',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'menu_items', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getPrizes(db: any, query: string, limit: number = 10): Promise<SearchResult> {
    try {
      const prizesCollection = db.collection('prizes');
      const winnersCollection = db.collection('lottery_winners');
      
      const prizes = await prizesCollection.find({ isActive: true }).limit(limit).toArray();
      const winners = await winnersCollection.find({}).sort({ winDate: -1 }).limit(limit).toArray();
      
      const summary = `🎁 Prizes & Lottery: ${prizes.length} active prizes, ${winners.length} recent winners`;
      
      const insights: string[] = [
        `🏆 Total prizes: ${prizes.length}`,
        `⭐ Legendary prizes: ${prizes.filter((p: any) => p.rarity === 'legendary').length}`,
        `👑 Recent winners: ${winners.slice(0, 3).map((w: any) => w.employeeName).join(', ')}`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: { prizes, winners },
        metadata: { queryType: 'prizes', total: prizes.length + winners.length, collectionsUsed: ['prizes', 'lottery_winners'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching prizes',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'prizes', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getRecipes(db: any, query: string, limit: number = 10): Promise<SearchResult> {
    try {
      const recipesCollection = db.collection('preparation_recipes');
      const logsCollection = db.collection('preparation_logs');
      
      const recipes = await recipesCollection.find({ isActive: true }).limit(limit).toArray();
      const logs = await logsCollection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
      
      const summary = `📖 Recipes: ${recipes.length} active recipes available`;
      
      const insights: string[] = [
        `👨‍🍳 Total recipes: ${recipes.length}`,
        `📝 Recent preparations: ${logs.length} logs`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: { recipes, logs },
        metadata: { queryType: 'recipes', total: recipes.length, collectionsUsed: ['preparation_recipes', 'preparation_logs'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching recipes',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'recipes', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getHealthyMenu(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const healthyCollection = db.collection('healthy_menu');
      const items = await healthyCollection.find({ isActive: true }).limit(limit).toArray();
      
      const avgPrice = items.reduce((sum: number, i: any) => sum + (i.price || 0), 0) / (items.length || 1);
      
      const summary = `🥗 Healthy Menu: ${items.length} healthy items available`;
      
      const insights: string[] = [
        `📊 Total healthy items: ${items.length}`,
        `💰 Average price: ${avgPrice.toFixed(2)} birr`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: items,
        metadata: { queryType: 'healthy_menu', total: items.length, collectionsUsed: ['healthy_menu'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching healthy menu',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'healthy_menu', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getDeletionData(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const deletionLogs = db.collection('deletion_logs');
      const deletionRequests = db.collection('deletion_requests');
      const ordersCollection = db.collection('orders');
      
      const logs = await deletionLogs.find({}).sort({ deletedAt: -1 }).limit(limit).toArray();
      const requests = await deletionRequests.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
      const flaggedOrders = await ordersCollection.find({ 
        $or: [
          { specialRequirements: { $regex: /flag|cancel|delete/i } },
          { status: 'CANCELLED' }
        ]
      }).limit(limit).toArray();
      
      const totalDeletedValue = logs.reduce((sum: number, d: any) => sum + (d.orderData?.finalAmount || 0), 0);
      const pendingRequests = requests.filter((r: any) => r.status === 'PENDING').length;
      
      const summary = `🗑️ Deletion Summary: ${logs.length} orders deleted (${totalDeletedValue.toFixed(2)} birr), ${pendingRequests} pending deletion requests`;
      
      const insights: string[] = [
        `💰 Total value of deleted orders: ${totalDeletedValue.toFixed(2)} birr`,
        `📋 Deletion requests: ${requests.length} total (${pendingRequests} pending)`,
        `👤 Most deletions by: ${logs[0]?.deletedBy || 'N/A'}`,
        `🚩 Flagged orders: ${flaggedOrders.length} orders need attention`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: { deletion_logs: logs, deletion_requests: requests, flagged_orders: flaggedOrders },
        metadata: {
          queryType: 'deletion_data',
          total: logs.length + requests.length,
          collectionsUsed: ['deletion_logs', 'deletion_requests', 'orders'],
          limit
        }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching deletion data',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'deletion_data', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getExpenses(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const expensesCollection = db.collection('expenses');
      const commonExpensesCollection = db.collection('commonExpenses');
      
      const expenses = await expensesCollection.find({}).limit(limit).toArray();
      const commonExpenses = await commonExpensesCollection.find({ isActive: true }).limit(limit).toArray();
      
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const totalCommon = commonExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      
      const summary = `💰 Expenses: ${totalExpenses.toFixed(2)} birr one-time + ${totalCommon.toFixed(2)} birr recurring = ${(totalExpenses + totalCommon).toFixed(2)} birr total`;
      
      const insights: string[] = [
        `📊 One-time expenses: ${expenses.length} transactions`,
        `🔄 Recurring expenses: ${commonExpenses.length} active`,
        `💵 Total: ${(totalExpenses + totalCommon).toFixed(2)} birr`
      ];
      
      return {
        success: true,
        summary,
        insights,
        data: { oneTime: expenses, recurring: commonExpenses },
        metadata: { queryType: 'expenses', total: expenses.length + commonExpenses.length, collectionsUsed: ['expenses', 'commonExpenses'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching expenses',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'expenses', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async getTableStatus(db: any, query: string, limit: number = 10): Promise<SearchResult> {
    try {
      const tablesCollection = db.collection('tablearrangements');
      const tables = await tablesCollection.find({}).limit(limit).toArray();
      
      const totalAvailable = tables.reduce((sum: number, t: any) => sum + (t.availableTables || 0), 0);
      const totalOccupied = tables.reduce((sum: number, t: any) => sum + (t.occupiedTables || 0), 0);
      
      const summary = `🪑 Tables: ${totalAvailable} available, ${totalOccupied} occupied (showing ${tables.length} of ${await tablesCollection.countDocuments()} total)`;
      
      const insights = tables.map((t: any) => `${t.floor}: ${t.availableTables}/${t.totalTables} available`);
      
      return {
        success: true,
        summary,
        insights,
        data: tables,
        metadata: { queryType: 'tables', total: tables.length, collectionsUsed: ['tablearrangements'], limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error fetching table status',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'tables', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }

  private async generalSearch(db: any, query: string, limit: number = 20): Promise<SearchResult> {
    try {
      const collections = ['orders', 'items', 'stocks', 'users', 'waitresses', 'expenses'];
      const results: any[] = [];
      
      for (const colName of collections) {
        const collection = db.collection(colName);
        const docs = await collection.find({}).limit(Math.ceil(limit / collections.length)).toArray();
        results.push(...docs.map((d: any) => ({ ...d, _collection: colName })));
      }
      
      return {
        success: true,
        summary: `Found ${results.length} items across ${collections.length} collections`,
        insights: [`Searched in: ${collections.join(', ')}`, `Showing top ${results.length} results`],
        data: results.slice(0, limit),
        metadata: { queryType: 'general', total: results.length, collectionsUsed: collections, limit }
      };
      
    } catch (error) {
      return {
        success: false,
        summary: 'Error in general search',
        insights: ['An error occurred'],
        data: [],
        metadata: { queryType: 'general', total: 0, collectionsUsed: [], limit: 0 }
      };
    }
  }
}
