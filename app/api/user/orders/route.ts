import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;

export async function GET(req: NextRequest) {
  const client = new MongoClient(uri || '');
  try {
    // Check MongoDB URI
    if (!uri) {
      console.error('MONGODB_URI is not defined');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database configuration error',
          message: 'Database connection is not properly configured'
        },
        { status: 500 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get current user session
    const session = await auth();
    
    if (!session?.user) {
      console.log('No session or user found');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Please sign in to view your orders'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userRole = session.user.role;
    
    console.log('Fetching orders for user:', { userId, userEmail, userRole });

    await client.connect();
    const db = client.db();
    
    // Check if collections exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Available collections:', collectionNames);
    
    // Helper function to find user in different collections
    async function findUserInCollections() {
      let userData = null;
      let foundInCollection = '';
      
      // Try users collection
      if (collectionNames.includes('users')) {
        const usersCollection = db.collection('users');
        userData = await usersCollection.findOne({
          $or: [
            { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null },
            { id: userId },
            { userId: userId },
            { email: userEmail }
          ].filter(condition => condition !== null)
        });
        
        if (userData) {
          foundInCollection = 'users';
          return { userData, foundInCollection };
        }
      }
      
      // Try staff collection
      if (collectionNames.includes('staff')) {
        const staffCollection = db.collection('staff');
        userData = await staffCollection.findOne({
          $or: [
            { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null },
            { id: userId },
            { userId: userId },
            { email: userEmail }
          ].filter(condition => condition !== null)
        });
        
        if (userData) {
          foundInCollection = 'staff';
          return { userData, foundInCollection };
        }
      }
      
      // Try customers collection
      if (collectionNames.includes('customers')) {
        const customersCollection = db.collection('customers');
        userData = await customersCollection.findOne({
          $or: [
            { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null },
            { id: userId },
            { userId: userId },
            { email: userEmail }
          ].filter(condition => condition !== null)
        });
        
        if (userData) {
          foundInCollection = 'customers';
          return { userData, foundInCollection };
        }
      }
      
      return { userData: null, foundInCollection: '' };
    }

    const { userData, foundInCollection } = await findUserInCollections();
    
    if (userData) {
      console.log(`User found in ${foundInCollection} collection`);
    }

    // Build comprehensive order query
    const orderQuery: any = {
      $or: [
        // Search by various user ID fields
        { customerId: userId },
        { customerId: userEmail },
        { userId: userId },
        { userId: userEmail },
        { 'user.id': userId },
        { 'user._id': ObjectId.isValid(userId) ? new ObjectId(userId) : null },
        { 'customer.id': userId },
        { 'customer._id': ObjectId.isValid(userId) ? new ObjectId(userId) : null },
        
        // Search by email
        { email: userEmail },
        { 'user.email': userEmail },
        { 'customer.email': userEmail },
        { 'deliveryInfo.email': userEmail },
        
        // Search by phone if available in userData
        ...(userData?.phone ? [
          { phone: userData.phone },
          { 'user.phone': userData.phone },
          { 'customer.phone': userData.phone },
          { 'deliveryInfo.phone': userData.phone },
          { 'deliveryInfo.phoneNumber': userData.phone }
        ] : [])
      ].filter(condition => condition !== null)
    };

    // Add status filter if provided
    if (status) {
      orderQuery.status = status;
    }

    console.log('Order query:', JSON.stringify(orderQuery, null, 2));

    // Array to store orders from different collections
    let allOrders: any[] = [];

    // Function to fetch orders from a collection
    async function fetchOrdersFromCollection(collectionName: string) {
      if (!collectionNames.includes(collectionName)) return [];
      
      const collection = db.collection(collectionName);
      const orders = await collection
        .find(orderQuery)
        .sort({ createdAt: -1, date: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return orders.map(order => ({ ...order, sourceCollection: collectionName }));
    }

    // Fetch from multiple order collections
    const orderCollections = ['orders', 'posorders', 'deliveries', 'orderitems'];
    
    for (const collectionName of orderCollections) {
      try {
        const orders = await fetchOrdersFromCollection(collectionName);
        allOrders = [...allOrders, ...orders];
      } catch (err) {
        console.log(`Error fetching from ${collectionName}:`, err);
      }
    }

    // Also try to find orders where user appears in items or metadata
    if (collectionNames.includes('orders')) {
      const ordersCollection = db.collection('orders');
      
      // Search in order items for user information
      const ordersWithUserInItems = await ordersCollection
        .find({
          'items': {
            $elemMatch: {
              $or: [
                { 'userId': userId },
                { 'customerId': userId },
                { 'email': userEmail }
              ]
            }
          }
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      allOrders = [...allOrders, ...ordersWithUserInItems.map(order => ({ ...order, sourceCollection: 'orders-items' }))];
    }

    // Remove duplicates based on order ID
    const uniqueOrdersMap = new Map();
    allOrders.forEach(order => {
      const orderId = order._id.toString();
      if (!uniqueOrdersMap.has(orderId) || 
          (order.sourceCollection === 'orders' && uniqueOrdersMap.get(orderId).sourceCollection !== 'orders')) {
        uniqueOrdersMap.set(orderId, order);
      }
    });

    const uniqueOrders = Array.from(uniqueOrdersMap.values());
    
    console.log(`Found ${uniqueOrders.length} unique orders for user`);

    // Process orders with items
    const ordersWithItems = await Promise.all(
      uniqueOrders.map(async (order) => {
        try {
          let orderItems = [];
          
          // If order already has items array, use it
          if (order.items && Array.isArray(order.items) && order.items.length > 0) {
            orderItems = order.items;
          } else {
            // Try to fetch from orderItems collection
            if (collectionNames.includes('orderItems')) {
              orderItems = await db.collection('orderItems')
                .find({ orderId: order._id })
                .toArray();
            }
            
            // Try to fetch from orderitems collection (lowercase)
            if (orderItems.length === 0 && collectionNames.includes('orderitems')) {
              orderItems = await db.collection('orderitems')
                .find({ orderId: order._id })
                .toArray();
            }
          }

          // Fetch menu items for each order item
          const itemsWithDetails = await Promise.all(
            orderItems.map(async (item: any) => {
              try {
                let menuItem = null;
                
                // Try to find menu item by ID
                if (item.menuItemId || item.itemId) {
                  const menuItemId = item.menuItemId || item.itemId;
                  
                  // Try menuItems collection
                  if (collectionNames.includes('menuItems')) {
                    menuItem = await db.collection('menuItems')
                      .findOne({ 
                        $or: [
                          { _id: ObjectId.isValid(menuItemId) ? new ObjectId(menuItemId) : null },
                          { id: menuItemId },
                          { itemId: menuItemId }
                        ].filter(condition => condition !== null)
                      });
                  }
                  
                  // Try items collection
                  if (!menuItem && collectionNames.includes('items')) {
                    menuItem = await db.collection('items')
                      .findOne({ 
                        $or: [
                          { _id: ObjectId.isValid(menuItemId) ? new ObjectId(menuItemId) : null },
                          { id: menuItemId },
                          { itemId: menuItemId }
                        ].filter(condition => condition !== null)
                      });
                  }
                }
                
                return {
                  id: item._id?.toString() || item.id,
                  name: menuItem?.name || item.name || item.itemName || 'Unknown Item',
                  quantity: item.quantity || 1,
                  price: item.price || item.unitPrice || 0,
                  total: (item.quantity || 1) * (item.price || item.unitPrice || 0),
                  image: menuItem?.image || item.image || item.imageUrl,
                  menuItemId: item.menuItemId || item.itemId
                };
              } catch (itemError) {
                console.error('Error fetching menu item:', itemError);
                return {
                  id: item._id?.toString() || item.id,
                  name: item.name || item.itemName || 'Unknown Item',
                  quantity: item.quantity || 1,
                  price: item.price || item.unitPrice || 0,
                  total: (item.quantity || 1) * (item.price || item.unitPrice || 0),
                  image: null
                };
              }
            })
          );

          const calculatedSubtotal = itemsWithDetails.reduce((sum, item) => sum + (item.total || 0), 0);

          // Determine order status
          let orderStatus = 'pending';
          if (order.status) {
            orderStatus = order.status.toLowerCase();
          } else if (order.completedAt || order.deliveredAt) {
            orderStatus = 'completed';
          } else if (order.cancelledAt) {
            orderStatus = 'cancelled';
          }

          // Get delivery address
          let deliveryAddress = 'Not specified';
          if (order.deliveryAddress) {
            deliveryAddress = order.deliveryAddress;
          } else if (order.deliveryInfo) {
            const info = order.deliveryInfo;
            deliveryAddress = `${info.address || ''}${info.city ? ', ' + info.city : ''}`.trim() || 'Not specified';
          } else if (order.address) {
            deliveryAddress = order.address;
          }

          return {
            id: order._id.toString(),
            orderNumber: order.orderNumber || order.orderId || `ORD-${order._id.toString().substring(0, 8).toUpperCase()}`,
            date: new Date(order.createdAt || order.date || order.orderDate || Date.now()).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            datetime: order.createdAt || order.date || order.orderDate || new Date().toISOString(),
            total: order.totalAmount || order.finalAmount || order.total || order.grandTotal || 0,
            subtotal: order.subtotal ?? order.totalAmount ?? calculatedSubtotal,
            tax: order.tax || order.taxAmount || 0,
            deliveryFee: order.deliveryFee || order.shippingFee || 0,
            discount: order.discount || order.discountAmount || 0,
            notes: order.specialRequirements || order.notes || order.specialInstructions || null,
            status: orderStatus as 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered' | 'processing',
            paymentMethod: order.paymentMethod || order.paymentType || 'Not specified',
            paymentStatus: order.paymentStatus || 'pending',
            deliveryAddress,
            items: itemsWithDetails,
            sourceCollection: order.sourceCollection,
            // Include additional fields that might be useful
            customerId: order.customerId || order.userId,
            customerEmail: order.email || order.customerEmail || order.deliveryInfo?.email,
            customerPhone: order.phone || order.customerPhone || order.deliveryInfo?.phone,
            customerName: order.customerName || order.name || order.deliveryInfo?.fullName,
            createdAt: order.createdAt,
            completedAt: order.completedAt || order.deliveredAt,
            updatedAt: order.updatedAt
          };
        } catch (itemError) {
          console.error('Error processing order:', order._id, itemError);
          return {
            id: order._id.toString(),
            orderNumber: order.orderNumber || order.orderId || `ORD-${order._id.toString().substring(0, 8).toUpperCase()}`,
            date: new Date(order.createdAt || order.date || Date.now()).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            datetime: order.createdAt || order.date || new Date().toISOString(),
            total: order.totalAmount || order.finalAmount || order.total || 0,
            subtotal: 0,
            tax: 0,
            deliveryFee: 0,
            discount: 0,
            notes: null,
            status: (order.status || 'pending').toLowerCase() as 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered' | 'processing',
            paymentMethod: order.paymentMethod || 'Not specified',
            paymentStatus: order.paymentStatus || 'pending',
            deliveryAddress: 'Not specified',
            items: [],
            sourceCollection: order.sourceCollection
          };
        }
      })
    );

    // Sort orders by date (newest first)
    ordersWithItems.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    // Calculate statistics
    const stats = {
      totalOrders: ordersWithItems.length,
      completedOrders: ordersWithItems.filter(o => o.status === 'completed' || o.status === 'delivered').length,
      pendingOrders: ordersWithItems.filter(o => o.status === 'pending').length,
      cancelledOrders: ordersWithItems.filter(o => o.status === 'cancelled').length,
      processingOrders: ordersWithItems.filter(o => o.status === 'processing' || o.status === 'preparing').length,
      totalSpent: ordersWithItems.reduce((sum, o) => sum + (o.total || 0), 0),
      averageOrderValue: ordersWithItems.length > 0 
        ? ordersWithItems.reduce((sum, o) => sum + (o.total || 0), 0) / ordersWithItems.length 
        : 0
    };

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
      count: ordersWithItems.length,
      stats,
      pagination: {
        page,
        limit,
        total: ordersWithItems.length,
        pages: Math.ceil(ordersWithItems.length / limit)
      },
      debug: process.env.NODE_ENV === 'development' ? {
        userId,
        userEmail,
        userRole,
        foundInCollection,
        ordersFound: uniqueOrders.length,
        collectionsSearched: orderCollections,
        query: orderQuery
      } : undefined
    });
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
  }
}
