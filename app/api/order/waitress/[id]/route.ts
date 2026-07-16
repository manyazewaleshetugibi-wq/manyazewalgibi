import { NextRequest, NextResponse } from 'next/server';
// ✅ NEW - Use this
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Define TypeScript interfaces
interface MenuItem {
  _id?: ObjectId;
  id?: string;
  item?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    image?: string;
    allergens?: string[];
    preparationTime?: number;
    imageUrl?: string;
  };
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  image?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  allergens?: string[];
  preparationTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
  variations?: Array<{
    name: string;
    price: number;
  }>;
  modifiers?: any[];
  categoryId?: string;
  tags?: string[];
  calories?: number;
}

interface OrderItem {
  itemId?: string;
  menuItemId?: string;
  id?: string;
  _id?: ObjectId | string;
  name?: string;
  price?: number;
  unitPrice?: number;
  quantity?: number;
  subtotal?: number;
  specialInstructions?: string;
  notes?: string;
  modifiers?: any[];
  status?: string;
  customizations?: any[];
  cookingInstructions?: string;
  description?: string;
  category?: string;
  image?: string;
  imageUrl?: string;
  variations?: Array<{
    name: string;
    price: number;
  }>;
  total?: number;
  // Uneditable/locked fields
  isUneditable?: boolean;
  uneditableAt?: string;
  uneditableBy?: string;
  isLocked?: boolean; // For backward compatibility
  lockedAt?: string;
  lockedBy?: string;
}

interface Order {
  _id: ObjectId | string;
  orderNumber?: string;
  tableNumber?: string;
  tableId?: string;
  waiterId: string | ObjectId;
  numberOfGuests?: number;
  items?: OrderItem[];
  orderItems?: OrderItem[];
  status?: string;
  totalAmount?: number;
  discount?: number;
  tax?: number;
  finalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  specialRequirements?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  stockProcessedAt?: Date;
  customerName?: string;
  notes?: string;
}

interface Waitress {
  _id: ObjectId;
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
  staffId?: string;
  phone?: string;
  shift?: string;
}

// Helper function to fetch menu item details in batches
async function fetchMenuItemDetails(db: any, itemIds: string[]): Promise<Map<string, MenuItem>> {
  if (!itemIds || itemIds.length === 0) return new Map();
  
  const uniqueItemIds = [...new Set(itemIds.filter(id => id && id !== 'undefined' && id !== 'null'))];
  
  if (uniqueItemIds.length === 0) return new Map();
  
  console.log(`[API] Fetching ${uniqueItemIds.length} menu items:`, uniqueItemIds);

  // Try to fetch by different ID formats
  const queryConditions = [];
  
  // Try ObjectId format
  const validObjectIds = uniqueItemIds.filter(id => {
    try {
      return ObjectId.isValid(id) && id.length === 24;
    } catch {
      return false;
    }
  }).map(id => new ObjectId(id));
  
  if (validObjectIds.length > 0) {
    queryConditions.push({ _id: { $in: validObjectIds } });
  }
  
  // Try string IDs (could be item.id or "item.id")
  const stringIds = uniqueItemIds.filter(id => !validObjectIds.some(oid => oid.toString() === id));
  if (stringIds.length > 0) {
    queryConditions.push({ "item.id": { $in: stringIds } });
    queryConditions.push({ id: { $in: stringIds } });
  }

  if (queryConditions.length === 0) return new Map();
  
  const query = { $or: queryConditions };

  try {
    const menuItems = await db.collection("items").find(query).toArray();
    console.log(`[API] Found ${menuItems.length} menu items`);

    // Create a map for quick lookup with multiple keys
    const menuItemMap = new Map<string, MenuItem>();
    
    menuItems.forEach((item: MenuItem) => {
      // Store by _id (ObjectId converted to string)
      const id = item._id?.toString();
      if (id) {
        menuItemMap.set(id, item);
      }
      
      // Store by item.id if available
      const itemId = item.item?.id || item.id;
      if (itemId) {
        menuItemMap.set(itemId, item);
      }
      
      // Also store by _id as string for any format
      if (item._id) {
        menuItemMap.set(item._id.toString(), item);
      }
    });

    return menuItemMap;
  } catch (error) {
    console.error('[API] Error fetching menu items:', error);
    return new Map();
  }
}

// Helper function to get item image URL
function getItemImage(item: MenuItem): string {
  if (item.imageUrl) return item.imageUrl;
  if (item.image) return item.image;
  if (item.item?.imageUrl) return item.item.imageUrl;
  if (item.item?.image) return item.item.image;
  return '/placeholder.svg';
}

// Helper function to get item name
function getItemName(item: MenuItem): string {
  if (item.name) return item.name;
  if (item.item?.name) return item.item.name;
  return 'Unknown Item';
}

// Helper function to extract item IDs from order
function extractItemIdsFromOrder(order: Order): string[] {
  const items = order.items || order.orderItems || [];
  const itemIds: string[] = [];
  
  items.forEach((item: any) => {
    // Try all possible ID fields
    const possibleIds = [
      item.itemId,
      item.menuItemId,
      item.id,
      item._id?.toString()
    ];
    
    possibleIds.forEach(id => {
      if (id && id !== 'undefined' && id !== 'null') {
        itemIds.push(id.toString());
      }
    });
  });
  
  return [...new Set(itemIds)]; // Remove duplicates
}

// Helper function to preserve uneditable status when updating items
function preserveUneditableStatus(existingItems: any[], newItems: any[]): any[] {
  // Create a map of existing items by their ID for quick lookup
  const existingItemsMap = new Map();
  
  existingItems.forEach((item: any) => {
    const itemId = item.menuItemId || item.itemId || item.id;
    if (itemId) {
      existingItemsMap.set(itemId.toString(), {
        isUneditable: item.isUneditable === true,
        uneditableAt: item.uneditableAt,
        uneditableBy: item.uneditableBy,
        isLocked: item.isLocked === true, // For backward compatibility
        lockedAt: item.lockedAt,
        lockedBy: item.lockedBy
      });
    }
  });
  
  // Apply preserved uneditable status to new items if they existed before
  return newItems.map((item: any) => {
    const itemId = item.menuItemId || item.itemId || item.id;
    const existingStatus = itemId ? existingItemsMap.get(itemId.toString()) : null;
    
    if (existingStatus && existingStatus.isUneditable) {
      // Preserve the uneditable status from existing item
      return {
        ...item,
        isUneditable: true,
        uneditableAt: existingStatus.uneditableAt,
        uneditableBy: existingStatus.uneditableBy,
        // For backward compatibility
        isLocked: true,
        lockedAt: existingStatus.lockedAt || existingStatus.uneditableAt,
        lockedBy: existingStatus.lockedBy || existingStatus.uneditableBy
      };
    }
    
    // Keep the new item's status (default to false if not specified)
    return {
      ...item,
      isUneditable: item.isUneditable === true || false,
      uneditableAt: item.uneditableAt || null,
      uneditableBy: item.uneditableBy || null,
      // For backward compatibility
      isLocked: item.isLocked === true || item.isUneditable === true,
      lockedAt: item.lockedAt || item.uneditableAt || null,
      lockedBy: item.lockedBy || item.uneditableBy || null
    };
  });
}

// GET: Fetch all orders for current waitress with full item details
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  console.log(`[API] Fetching orders request for ID: ${params.id}`);

  try {
    const session = await auth();
    
    if (!session || !session.user) {
      console.log('[API] Unauthorized: No session found');
      return NextResponse.json(
        { error: 'Unauthorized. Please login.' },
        { status: 401 }
      );
    }

    const waitressId = params.id;
    
    console.log(`[API] Session User ID: ${session.user.id}, Requested ID: ${waitressId}`);
    console.log(`[API] Session User Email: ${session.user.email}`);

    // Verify the current user matches the requested waitress ID
    if (session.user.id !== waitressId) {
      console.log('[API] Access denied: ID mismatch');
      return NextResponse.json(
        { error: 'Access denied. You can only view your own orders.' },
        { status: 403 }
      );
    }

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    // Find waitress by email
    console.log(`[API] Looking for waitress with email: ${session.user.email}`);
    
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email },
      { projection: { name: 1, email: 1, role: 1, staffId: 1, phone: 1, shift: 1, userId: 1 } }
    ) as Waitress | null;

    if (!waitress) {
      console.log('[API] Waitress not found with email:', session.user.email);
      
      // For debugging
      const allWaitresses = await db.collection("waitresses").find({}).limit(5).toArray();
      console.log('[API] First 5 waitresses in database:', allWaitresses.map((w: any) => ({
        id: w._id,
        userId: w.userId,
        email: w.email,
        name: w.name,
        role: w.role
      })));
      
      return NextResponse.json(
        { 
          error: 'Waitress profile not found',
          message: 'Your waitress profile was not found. Please contact administrator.',
          success: false
        },
        { status: 404 }
      );
    }

    console.log(`[API] Found waitress: ${waitress.name} (ID: ${waitress._id}, Email: ${waitress.email})`);

    // Collect all possible IDs for this user to fetch all registered orders
    const possibleIds = [
      waitress._id,                    // ObjectId from waitresses collection
      waitress._id.toString(),         // String ID from waitresses collection
      waitress.userId,                 // User ID linked in waitresses collection
      session.user.id                  // Session User ID
    ].filter(id => id);                // Filter out undefined/null/empty

    console.log(`[API] Searching orders for waiter IDs:`, possibleIds);

    // Query orders where waiterId matches any of the possible IDs
    const query: any = { 
      waiterId: { $in: possibleIds },
      status: 'PENDING'
    };

    const orders = await db.collection("orders").find(query).sort({ createdAt: -1 }).toArray() as Order[];

    console.log(`[API] Found ${orders.length} orders total`);

    // Collect all item IDs from all orders for batch fetching
    const allItemIds: string[] = [];
    orders.forEach((order: Order) => {
      const itemIds = extractItemIdsFromOrder(order);
      allItemIds.push(...itemIds);
    });

    console.log(`[API] Collecting ${allItemIds.length} unique item IDs from orders`);

    // Fetch all menu item details in one batch
    const menuItemMap = await fetchMenuItemDetails(db, allItemIds);
    
    // Transform orders with full item details
    const transformedOrders = await Promise.all(orders.map(async (order: Order) => {
      // Extract order items with full details and preserve uneditable status
      const orderItems = await Promise.all((order.items || order.orderItems || []).map(async (item: any, index: number) => {
        // Try to find the item by different ID fields
        let menuItem: MenuItem | undefined;
        const possibleIds = [
          item.itemId,
          item.menuItemId,
          item.id,
          item._id?.toString()
        ];
        
        for (const id of possibleIds) {
          if (id && menuItemMap.has(id.toString())) {
            menuItem = menuItemMap.get(id.toString());
            break;
          }
        }
        
        // Get item details from menuItem or use order data
        const itemId = (item.itemId || item.menuItemId || item.id || item._id || '').toString();
        const name = menuItem ? getItemName(menuItem) : item.name || `Item ${itemId}`;
        const unitPrice = item.unitPrice || item.price || menuItem?.price || menuItem?.item?.price || 0;
        const quantity = item.quantity || 1;
        const subtotal = item.subtotal || item.total || (unitPrice * quantity);
        
        // Get additional item details
        const description = menuItem?.description || menuItem?.item?.description || item.description || '';
        const category = menuItem?.category || menuItem?.item?.category || item.category || '';
        const image = menuItem ? getItemImage(menuItem) : item.image || item.imageUrl || '';
        const isAvailable = menuItem?.isAvailable !== false;
        const variations = menuItem?.variations || item.variations || [];
        const modifiers = menuItem?.modifiers || item.modifiers || [];
        const categoryId = menuItem?.categoryId || '';
        const tags = menuItem?.tags || [];
        const calories = menuItem?.calories || 0;
        const preparationTime = menuItem?.preparationTime || menuItem?.item?.preparationTime || 0;
        
        // Preserve uneditable status (check both isUneditable and isLocked for backward compatibility)
        const isUneditable = item.isUneditable === true || item.isLocked === true;
        
        return {
          id: item.id || item._id?.toString() || itemId,
          menuItemId: itemId, // This is the key field for frontend
          itemId: itemId,
          name: name,
          description: description,
          category: category,
          categoryId: categoryId,
          price: unitPrice,
          unitPrice: unitPrice,
          quantity: quantity,
          subtotal: subtotal,
          total: subtotal,
          specialInstructions: item.specialInstructions || item.notes || '',
          modifiers: modifiers,
          variations: variations,
          status: item.status || 'PENDING',
          image: image,
          imageUrl: image,
          isAvailable: isAvailable,
          // Add customizations/modifiers
          customizations: item.customizations || [],
          cookingInstructions: item.cookingInstructions || '',
          allergens: menuItem?.allergens || menuItem?.item?.allergens || [],
          preparationTime: preparationTime,
          tags: tags,
          calories: calories,
          // Uneditable/locked fields
          isUneditable: isUneditable,
          uneditableAt: item.uneditableAt || item.lockedAt || null,
          uneditableBy: item.uneditableBy || item.lockedBy || null,
          isLocked: isUneditable, // For backward compatibility
          lockedAt: item.lockedAt || item.uneditableAt || null,
          lockedBy: item.lockedBy || item.uneditableBy || null,
          // Include all original data
          originalData: item
        };
      }));

      // Calculate totals if not present
      const calculatedTotal = orderItems.reduce((sum: number, item: any) => 
        sum + (item.subtotal || 0), 0
      );
      
      const totalAmount = order.totalAmount || calculatedTotal;
      const tax = order.tax || 0;
      const discount = order.discount || 0;
      const finalAmount = order.finalAmount || totalAmount - discount + tax;

      return {
        id: order._id.toString(),
        _id: order._id.toString(),
        orderId: order._id.toString(),
        orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
        status: order.status || 'PENDING',
        totalAmount: totalAmount,
        subtotal: totalAmount - tax,
        tax: tax,
        discount: discount,
        finalAmount: finalAmount,
        numberOfGuests: order.numberOfGuests || 1,
        tableNumber: order.tableNumber || order.tableId || 'N/A',
        customerName: order.customerName || 'Walk-in Customer',
        notes: order.notes || order.specialRequirements || '',
        specialRequirements: order.specialRequirements || '',
        paymentMethod: order.paymentMethod || '',
        paymentStatus: order.paymentStatus || 'PENDING',
        isActive: order.isActive !== false,
        createdAt: new Date(order.createdAt || new Date()).toISOString(),
        updatedAt: new Date(order.updatedAt || new Date()).toISOString(),
        completedAt: order.completedAt ? new Date(order.completedAt).toISOString() : null,
        stockProcessedAt: order.stockProcessedAt ? new Date(order.stockProcessedAt).toISOString() : null,
        orderItems: orderItems,
        waiterInfo: {
          id: waitress._id.toString(),
          userId: waitress.userId,
          name: waitress.name || 'Waitress',
          email: waitress.email || '',
          phone: waitress.phone || '',
          role: waitress.role || 'WAITER',
          shift: waitress.shift || '',
          staffId: waitress.staffId || ''
        }
      };
    }));

    return NextResponse.json({ 
      success: true,
      orders: transformedOrders,
      count: transformedOrders.length,
      userRole: waitress.role || 'WAITER',
      waiterInfo: {
        id: waitress._id.toString(),
        userId: waitress.userId,
        name: waitress.name,
        email: waitress.email,
        phone: waitress.phone,
        role: waitress.role,
        shift: waitress.shift,
        staffId: waitress.staffId
      }
    });
    
  } catch (error) {
    console.error('[API] Critical error fetching orders:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        success: false,
        orders: [],
        count: 0,
        message: error instanceof Error ? error.message : 'Unknown database error'
      },
      { status: 500 }
    );
  }
}

// Additional API to get single order with full details
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const waitressId = params.id;
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Verify the current user matches the requested waitress ID
    if (session.user.id !== waitressId) {
      return NextResponse.json(
        { error: 'Access denied. You can only view your own orders.' },
        { status: 403 }
      );
    }

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get waitress by email
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    ) as Waitress | null;

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress._id.toString();
    
    // Try different query variations to find the order
    let order: Order | null = null;
    
    // Try by ObjectId first
    if (ObjectId.isValid(orderId)) {
      order = await db.collection("orders").findOne({
        _id: new ObjectId(orderId),
        waiterId: waitressDbId
      }) as Order | null;
    }
    
    // If not found, try by order number
    if (!order) {
      order = await db.collection("orders").findOne({
        orderNumber: orderId,
        waiterId: waitressDbId
      }) as Order | null;
    }

    // If still not found, try with string waiterId
    if (!order) {
      const queryVariations = [
        { _id: orderId, waiterId: waitressDbId },
        { orderNumber: orderId, waiterId: waitressDbId },
        { _id: orderId, waiterId: waitress._id }
      ];

      for (const query of queryVariations) {
        order = await db.collection("orders").findOne(query) as Order | null;
        if (order) break;
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    // Collect item IDs from the order for batch fetching
    const itemIds = extractItemIdsFromOrder(order);
    
    console.log(`[API] Fetching details for ${itemIds.length} items in order ${order.orderNumber}`);

    // Fetch menu item details
    const menuItemMap = await fetchMenuItemDetails(db, itemIds);
    
    // Transform order items with full details including name and image, preserving uneditable status
    const orderItems = await Promise.all((order.items || order.orderItems || []).map(async (item: any) => {
      // Try to find the item by different ID fields
      let menuItem: MenuItem | undefined;
      const possibleIds = [
        item.itemId,
        item.menuItemId,
        item.id,
        item._id?.toString()
      ];
      
      for (const id of possibleIds) {
        if (id && menuItemMap.has(id.toString())) {
          menuItem = menuItemMap.get(id.toString());
          break;
        }
      }
      
      const itemId = (item.itemId || item.menuItemId || item.id || item._id || '').toString();
      const name = menuItem ? getItemName(menuItem) : item.name || `Item ${itemId}`;
      const unitPrice = item.unitPrice || item.price || menuItem?.price || menuItem?.item?.price || 0;
      const quantity = item.quantity || 1;
      const subtotal = item.subtotal || item.total || (unitPrice * quantity);
      const image = menuItem ? getItemImage(menuItem) : item.image || item.imageUrl || '';
      
      // Get additional details
      const description = menuItem?.description || menuItem?.item?.description || item.description || '';
      const category = menuItem?.category || menuItem?.item?.category || item.category || '';
      const categoryId = menuItem?.categoryId || '';
      const tags = menuItem?.tags || [];
      const calories = menuItem?.calories || 0;
      const preparationTime = menuItem?.preparationTime || menuItem?.item?.preparationTime || 0;
      
      // Preserve uneditable status
      const isUneditable = item.isUneditable === true || item.isLocked === true;
      
      return {
        id: item.id || item._id?.toString() || itemId,
        menuItemId: itemId, // This is the key field for frontend
        itemId: itemId,
        name: name,
        description: description,
        category: category,
        categoryId: categoryId,
        price: unitPrice,
        unitPrice: unitPrice,
        quantity: quantity,
        subtotal: subtotal,
        total: subtotal,
        specialInstructions: item.specialInstructions || item.notes || '',
        modifiers: menuItem?.modifiers || item.modifiers || [],
        variations: menuItem?.variations || item.variations || [],
        status: item.status || 'PENDING',
        image: image,
        imageUrl: image,
        isAvailable: menuItem?.isAvailable !== false,
        customizations: item.customizations || [],
        cookingInstructions: item.cookingInstructions || '',
        allergens: menuItem?.allergens || menuItem?.item?.allergens || [],
        preparationTime: preparationTime,
        tags: tags,
        calories: calories,
        // Uneditable/locked fields
        isUneditable: isUneditable,
        uneditableAt: item.uneditableAt || item.lockedAt || null,
        uneditableBy: item.uneditableBy || item.lockedBy || null,
        isLocked: isUneditable, // For backward compatibility
        lockedAt: item.lockedAt || item.uneditableAt || null,
        lockedBy: item.lockedBy || item.uneditableBy || null,
        // Include all original data
        originalData: item
      };
    }));

    // Calculate totals
    const calculatedTotal = orderItems.reduce((sum: number, item: any) => 
      sum + (item.subtotal || 0), 0
    );
    
    const totalAmount = order.totalAmount || calculatedTotal;
    const tax = order.tax || 0;
    const discount = order.discount || 0;
    const finalAmount = order.finalAmount || totalAmount - discount + tax;

    const transformedOrder = {
      id: order._id.toString(),
      _id: order._id.toString(),
      orderId: order._id.toString(),
      orderNumber: order.orderNumber || `ORD-${order._id.toString().slice(-6)}`,
      status: order.status || 'PENDING',
      totalAmount: totalAmount,
      subtotal: totalAmount - tax,
      tax: tax,
      discount: discount,
      finalAmount: finalAmount,
      numberOfGuests: order.numberOfGuests || 1,
      tableNumber: order.tableNumber || order.tableId || 'N/A',
      customerName: order.customerName || 'Walk-in Customer',
      notes: order.notes || order.specialRequirements || '',
      specialRequirements: order.specialRequirements || '',
      paymentMethod: order.paymentMethod || '',
      paymentStatus: order.paymentStatus || 'PENDING',
      isActive: order.isActive !== false,
      createdAt: new Date(order.createdAt || new Date()).toISOString(),
      updatedAt: new Date(order.updatedAt || new Date()).toISOString(),
      completedAt: order.completedAt ? new Date(order.completedAt).toISOString() : null,
      stockProcessedAt: order.stockProcessedAt ? new Date(order.stockProcessedAt).toISOString() : null,
      orderItems: orderItems,
      waiterInfo: {
        id: waitress._id.toString(),
        userId: waitress.userId,
        name: waitress.name || 'Waitress',
        email: waitress.email || '',
        phone: waitress.phone || '',
        role: waitress.role || 'WAITER',
        shift: waitress.shift || '',
        staffId: waitress.staffId || ''
      }
    };

    return NextResponse.json({
      success: true,
      order: transformedOrder
    });

  } catch (error) {
    console.error('[API] Error fetching single order:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT: Update an order with proper item structure and preserve uneditable status
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const waitressId = params.id;
    
    // Verify the current user matches the requested waitress ID
    if (session.user.id !== waitressId) {
      return NextResponse.json(
        { error: 'Access denied. You can only update your own orders.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('[API] Received update request:', JSON.stringify(body, null, 2));
    
    const { 
      orderId, 
      orderItems,  // Changed from items to orderItems
      notes, 
      tableNumber, 
      status, 
      customerName,
      numberOfGuests,
      discount,
      tax,
      totalAmount,
      finalAmount,
      waiterId,
      restaurantId,
      restaurantName
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    // Get waitress by email
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    ) as Waitress | null;

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress._id.toString();
    
    // Verify the order belongs to this waitress
    let existingOrder: Order | null = null;
    
    // Try with ObjectId first
    if (ObjectId.isValid(orderId)) {
      existingOrder = await db.collection("orders").findOne({
        _id: new ObjectId(orderId),
        waiterId: waitressDbId
      }) as Order | null;
    }
    
    // If not found with ObjectId, try string ID
    if (!existingOrder) {
      existingOrder = await db.collection("orders").findOne({
        _id: orderId,
        waiterId: waitressDbId
      }) as Order | null;
    }

    // Try with order number
    if (!existingOrder) {
      existingOrder = await db.collection("orders").findOne({
        orderNumber: orderId,
        waiterId: waitressDbId
      }) as Order | null;
    }

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Handle order items if provided
    if (orderItems && Array.isArray(orderItems)) {
      console.log(`[API] Processing ${orderItems.length} order items for update`);
      
      // Get existing items to preserve uneditable status
      const existingItems = existingOrder.items || existingOrder.orderItems || [];
      
      // Transform order items to database format with preserved uneditable status
      const dbOrderItems = preserveUneditableStatus(existingItems, orderItems.map((item: any) => {
        const menuItemId = item.menuItemId || item._id || item.id;
        const quantity = item.quantity || 1;
        const price = item.price || item.unitPrice || 0;
        const subtotal = item.subtotal || item.total || (price * quantity);
        
        return {
          menuItemId: menuItemId,  // Store the menu item ID
          itemId: menuItemId,       // For compatibility
          name: item.name,
          price: price,
          unitPrice: price,
          quantity: quantity,
          subtotal: subtotal,
          total: subtotal,
          specialInstructions: item.specialInstructions || '',
          status: item.status || 'PENDING',
          customizations: item.customizations || [],
          cookingInstructions: item.cookingInstructions || '',
          image: item.image || item.imageUrl || '',
          imageUrl: item.image || item.imageUrl || '',
          description: item.description || '',
          category: item.category || '',
          categoryId: item.categoryId || '',
          // Preserve uneditable status from existing items
          isUneditable: item.isUneditable === true,
          uneditableAt: item.uneditableAt || null,
          uneditableBy: item.uneditableBy || null,
          isLocked: item.isLocked === true || item.isUneditable === true,
          lockedAt: item.lockedAt || item.uneditableAt || null,
          lockedBy: item.lockedBy || item.uneditableBy || null
        };
      }));

      updateData.orderItems = dbOrderItems;
      updateData.items = dbOrderItems; // For backward compatibility
      
      // Calculate totals based on items if not provided
      const calculatedTotalAmount = dbOrderItems.reduce((sum: number, item: any) => 
        sum + (item.subtotal || 0), 0
      );
      
      updateData.totalAmount = totalAmount !== undefined ? totalAmount : calculatedTotalAmount;
    }

    // Update other fields
    if (notes !== undefined) updateData.notes = notes;
    if (tableNumber !== undefined) updateData.tableNumber = tableNumber;
    if (status !== undefined) updateData.status = status;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (numberOfGuests !== undefined) updateData.numberOfGuests = numberOfGuests;
    if (discount !== undefined) updateData.discount = discount;
    if (tax !== undefined) updateData.tax = tax;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount;
    if (restaurantId !== undefined) updateData.restaurantId = restaurantId;
    if (restaurantName !== undefined) updateData.restaurantName = restaurantName;
    
    // Calculate final amount
    const updatedTotalAmount = updateData.totalAmount || existingOrder.totalAmount || 0;
    const updatedDiscount = discount !== undefined ? discount : existingOrder.discount || 0;
    const updatedTax = tax !== undefined ? tax : existingOrder.tax || 0;
    
    if (finalAmount !== undefined) {
      updateData.finalAmount = finalAmount;
    } else {
      updateData.finalAmount = updatedTotalAmount - updatedDiscount + updatedTax;
    }

    // Determine which ID to use for update
    let updateQuery: any;
    if (ObjectId.isValid(orderId)) {
      updateQuery = { 
        _id: new ObjectId(orderId),
        waiterId: waitressDbId
      };
    } else {
      // Try to find by orderNumber if not an ObjectId
      const order = await db.collection("orders").findOne({
        orderNumber: orderId,
        waiterId: waitressDbId
      }) as Order | null;
      
      if (order) {
        updateQuery = { 
          _id: order._id,
          waiterId: waitressDbId
        };
      } else {
        updateQuery = { 
          _id: orderId,
          waiterId: waitressDbId
        };
      }
    }

    console.log('[API] Updating order with query:', updateQuery);
    console.log('[API] Update data:', updateData);

    const result = await db.collection("orders").updateOne(
      updateQuery,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`[API] Order updated successfully: ${result.modifiedCount} document(s) modified`);

    // Fetch updated order with full details
    let updatedOrder: Order | null;
    if (ObjectId.isValid(orderId)) {
      updatedOrder = await db.collection("orders").findOne({
        _id: new ObjectId(orderId)
      }) as Order | null;
    } else {
      updatedOrder = await db.collection("orders").findOne({
        _id: orderId
      }) as Order | null;
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated order' },
        { status: 404 }
      );
    }

    // Fetch menu item details for the updated order
    const itemIds = extractItemIdsFromOrder(updatedOrder);
    const menuItemMap = await fetchMenuItemDetails(db, itemIds);
    
    // Transform order items with full details and preserve uneditable status
    const transformedOrderItems = await Promise.all((updatedOrder.items || updatedOrder.orderItems || []).map(async (item: any) => {
      // Try to find the item by different ID fields
      let menuItem: MenuItem | undefined;
      const possibleIds = [
        item.itemId,
        item.menuItemId,
        item.id,
        item._id?.toString()
      ];
      
      for (const id of possibleIds) {
        if (id && menuItemMap.has(id.toString())) {
          menuItem = menuItemMap.get(id.toString());
          break;
        }
      }
      
      const itemId = (item.itemId || item.menuItemId || item.id || item._id || '').toString();
      const name = menuItem ? getItemName(menuItem) : item.name || `Item ${itemId}`;
      const unitPrice = item.unitPrice || item.price || menuItem?.price || menuItem?.item?.price || 0;
      const quantity = item.quantity || 1;
      const subtotal = item.subtotal || item.total || (unitPrice * quantity);
      const image = menuItem ? getItemImage(menuItem) : item.image || item.imageUrl || '';
      
      // Get additional details
      const description = menuItem?.description || menuItem?.item?.description || item.description || '';
      const category = menuItem?.category || menuItem?.item?.category || item.category || '';
      const categoryId = menuItem?.categoryId || '';
      const tags = menuItem?.tags || [];
      const calories = menuItem?.calories || 0;
      const preparationTime = menuItem?.preparationTime || menuItem?.item?.preparationTime || 0;
      
      // Preserve uneditable status
      const isUneditable = item.isUneditable === true || item.isLocked === true;
      
      return {
        id: item.id || item._id?.toString() || itemId,
        menuItemId: itemId, // This is the key field for frontend
        itemId: itemId,
        name: name,
        description: description,
        category: category,
        categoryId: categoryId,
        price: unitPrice,
        unitPrice: unitPrice,
        quantity: quantity,
        subtotal: subtotal,
        total: subtotal,
        specialInstructions: item.specialInstructions || item.notes || '',
        modifiers: menuItem?.modifiers || item.modifiers || [],
        variations: menuItem?.variations || item.variations || [],
        status: item.status || 'PENDING',
        image: image,
        imageUrl: image,
        isAvailable: menuItem?.isAvailable !== false,
        customizations: item.customizations || [],
        cookingInstructions: item.cookingInstructions || '',
        allergens: menuItem?.allergens || menuItem?.item?.allergens || [],
        preparationTime: preparationTime,
        tags: tags,
        calories: calories,
        // Uneditable/locked fields
        isUneditable: isUneditable,
        uneditableAt: item.uneditableAt || item.lockedAt || null,
        uneditableBy: item.uneditableBy || item.lockedBy || null,
        isLocked: isUneditable, // For backward compatibility
        lockedAt: item.lockedAt || item.uneditableAt || null,
        lockedBy: item.lockedBy || item.uneditableBy || null
      };
    }));

    const transformedOrder = {
      id: updatedOrder._id.toString(),
      orderNumber: updatedOrder.orderNumber || `ORD-${updatedOrder._id.toString().slice(-6)}`,
      status: updatedOrder.status || 'PENDING',
      totalAmount: updatedOrder.totalAmount || 0,
      tax: updatedOrder.tax || 0,
      discount: updatedOrder.discount || 0,
      finalAmount: updatedOrder.finalAmount || 0,
      notes: updatedOrder.notes || '',
      tableNumber: updatedOrder.tableNumber || updatedOrder.tableId || '',
      customerName: updatedOrder.customerName || '',
      numberOfGuests: updatedOrder.numberOfGuests || 1,
      specialRequirements: updatedOrder.specialRequirements || '',
      paymentStatus: updatedOrder.paymentStatus || 'PENDING',
      paymentMethod: updatedOrder.paymentMethod || '',
      updatedAt: updatedOrder.updatedAt?.toISOString() || new Date().toISOString(),
      orderItems: transformedOrderItems,
      waiterId: updatedOrder.waiterId?.toString() || waitressDbId,
      waiterInfo: {
        id: waitress._id.toString(),
        userId: waitress.userId,
        name: waitress.name || 'Waitress',
        email: waitress.email || '',
        phone: waitress.phone || '',
        role: waitress.role || 'WAITER',
        shift: waitress.shift || '',
        staffId: waitress.staffId || ''
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Order updated successfully',
      order: transformedOrder
    });
    
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete an order
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const waitressId = params.id;
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Verify the current user matches the requested waitress ID
    if (session.user.id !== waitressId) {
      return NextResponse.json(
        { error: 'Access denied. You can only delete your own orders.' },
        { status: 403 }
      );
    }

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    // Get waitress by email
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    ) as Waitress | null;

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress._id.toString();
    
    // Delete order only if it belongs to this waitress
    let result;
    
    if (ObjectId.isValid(orderId)) {
      result = await db.collection("orders").deleteOne({
        _id: new ObjectId(orderId),
        waiterId: waitressDbId
      });
    } else {
      result = await db.collection("orders").deleteOne({
        _id: orderId,
        waiterId: waitressDbId
      });
    }

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add a new PATCH endpoint for marking items as uneditable
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const waitressId = params.id;
    const body = await request.json();
    const { orderId, itemIndex, isUneditable, uneditableBy, uneditableAt } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (itemIndex === undefined) {
      return NextResponse.json(
        { error: 'Item index is required' },
        { status: 400 }
      );
    }

    // Verify the current user matches the requested waitress ID
    if (session.user.id !== waitressId) {
      return NextResponse.json(
        { error: 'Access denied. You can only update your own orders.' },
        { status: 403 }
      );
    }

    // Connect to MongoDB
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    // Get waitress by email
    const waitress = await db.collection("waitresses").findOne(
      { email: session.user.email }
    ) as Waitress | null;

    if (!waitress) {
      return NextResponse.json(
        { error: 'Waitress not found' },
        { status: 404 }
      );
    }

    const waitressDbId = waitress._id.toString();

    // Find the order
    let order: Order | null = null;
    let updateQuery: any;

    if (ObjectId.isValid(orderId)) {
      updateQuery = { _id: new ObjectId(orderId), waiterId: waitressDbId };
      order = await db.collection("orders").findOne(updateQuery) as Order | null;
    } else {
      updateQuery = { orderNumber: orderId, waiterId: waitressDbId };
      order = await db.collection("orders").findOne(updateQuery) as Order | null;
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      );
    }

    // Get the items array
    const items = order.items || order.orderItems || [];
    
    if (itemIndex < 0 || itemIndex >= items.length) {
      return NextResponse.json(
        { error: 'Invalid item index' },
        { status: 400 }
      );
    }

    // Prepare update fields
    const updateFields: any = {};
    const itemPath = `items.${itemIndex}`;
    
    updateFields[`${itemPath}.isUneditable`] = isUneditable;
    
    if (isUneditable) {
      updateFields[`${itemPath}.uneditableAt`] = uneditableAt || new Date().toISOString();
      updateFields[`${itemPath}.uneditableBy`] = uneditableBy || waitress.name || waitress.email || "Unknown";
      // Also update isLocked for backward compatibility
      updateFields[`${itemPath}.isLocked`] = true;
      updateFields[`${itemPath}.lockedAt`] = uneditableAt || new Date().toISOString();
      updateFields[`${itemPath}.lockedBy`] = uneditableBy || waitress.name || waitress.email || "Unknown";
    } else {
      updateFields[`${itemPath}.uneditableAt`] = null;
      updateFields[`${itemPath}.uneditableBy`] = null;
      updateFields[`${itemPath}.isLocked`] = false;
      updateFields[`${itemPath}.lockedAt`] = null;
      updateFields[`${itemPath}.lockedBy`] = null;
    }
    
    updateFields.updatedAt = new Date();

    // Update the order
    const result = await db.collection("orders").updateOne(
      updateQuery,
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch the updated order
    const updatedOrder = await db.collection("orders").findOne(updateQuery) as Order | null;
    
    // Check if all items are now uneditable
    const updatedItems = updatedOrder?.items || updatedOrder?.orderItems || [];
    const allItemsUneditable = updatedItems.length > 0 && updatedItems.every((item: any) => 
      item.isUneditable === true || item.isLocked === true
    );

    // If all items are uneditable, optionally update order status
    if (allItemsUneditable && updatedOrder?.status !== 'COMPLETED' && updatedOrder?.status !== 'SERVED') {
      await db.collection("orders").updateOne(
        updateQuery,
        { $set: { status: 'SERVED', updatedAt: new Date() } }
      );
    }

    return NextResponse.json({
      success: true,
      message: isUneditable ? 'Item marked as uneditable' : 'Item marked as editable',
      allItemsUneditable,
      itemIndex,
      isUneditable
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating item uneditable status:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update item status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}