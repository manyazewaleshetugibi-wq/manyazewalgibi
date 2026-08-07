import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get current user session
    const session = await auth();
    
    if (!session?.user) {

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
    


    // Helper function to find user in different collections
    async function findUserInCollections() {
      let userData: any = null;
      let foundInCollection = '';
      
      // Try users collection
      const usersUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { email: userEmail }
          ]
        }
      });
      
      if (usersUser) {
        userData = usersUser;
        foundInCollection = 'users';
        return { userData, foundInCollection };
      }
      
      // Try staff collection
      const staffUser = await prisma.staff.findFirst({
        where: {
          OR: [
            { id: userId },
            { email: userEmail }
          ]
        }
      });
      
      if (staffUser) {
        userData = staffUser;
        foundInCollection = 'staff';
        return { userData, foundInCollection };
      }
      
      // Try customers collection
      const customerUser = await prisma.customer.findFirst({
        where: {
          OR: [
            { id: userId },
            { email: userEmail }
          ]
        }
      });
      
      if (customerUser) {
        userData = customerUser;
        foundInCollection = 'customers';
        return { userData, foundInCollection };
      }
      
      return { userData: null, foundInCollection: '' };
    }

    const { userData, foundInCollection } = await findUserInCollections();
    
    if (userData) {

    }

    // Build comprehensive order query
    const orderQuery: any = {
      OR: [
        // Search by various user ID fields
        { customerId: userId },
        { customerId: userEmail },
        { userId: userId },
        { userId: userEmail },
      ]
    };

    // Add status filter if provided
    if (status) {
      orderQuery.status = status;
    }



    // Array to store orders from different collections
    let allOrders: any[] = [];

    // Fetch orders from the orders table
    const orders = await prisma.order.findMany({
      where: orderQuery,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    allOrders = [...allOrders, ...orders.map(order => ({ ...order, sourceCollection: 'orders' }))];

    // Fetch orders from the posorders table
    const posOrders = await prisma.posOrder.findMany({
      where: {
        OR: [
          { customerId: userId },
          { customerId: userEmail },
          { userId: userId },
          { userId: userEmail },
          { email: userEmail },
        ]
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    allOrders = [...allOrders, ...posOrders.map(order => ({ ...order, sourceCollection: 'posorders' }))];

    // Also try to find orders where user appears in items or metadata
    const ordersWithUserInItems = await prisma.order.findMany({
      where: orderQuery,
      orderBy: { createdAt: 'desc' },
    });

    // Search in order items for user information (computed in JS since items is Json)
    const filteredOrdersWithUserInItems = ordersWithUserInItems.filter(order => {
      const items = (order.items as any) || [];
      return Array.isArray(items) && items.some((item: any) =>
        item?.userId === userId || item?.customerId === userId || item?.email === userEmail
      );
    });

    allOrders = [...allOrders, ...filteredOrdersWithUserInItems.map(order => ({ ...order, sourceCollection: 'orders-items' }))];

    // Remove duplicates based on order ID
    const uniqueOrdersMap = new Map();
    allOrders.forEach(order => {
      const orderId = order.id;
      if (!uniqueOrdersMap.has(orderId) || 
          (order.sourceCollection === 'orders' && uniqueOrdersMap.get(orderId).sourceCollection !== 'orders')) {
        uniqueOrdersMap.set(orderId, order);
      }
    });

    const uniqueOrders = Array.from(uniqueOrdersMap.values());
    


    // Process orders with items
    const ordersWithItems = await Promise.all(
      uniqueOrders.map(async (order: any) => {
        try {
          let orderItems: any[] = [];
          
          // If order already has items array, use it
          const orderItemsJson = (order.items as any);
          if (orderItemsJson && Array.isArray(orderItemsJson) && orderItemsJson.length > 0) {
            orderItems = orderItemsJson;
          } else {
            // Try to fetch from orderitems table
            orderItems = await prisma.orderItem.findMany({
              where: { orderId: order.id }
            });
          }

          // Fetch menu items for each order item
          const itemsWithDetails = await Promise.all(
            orderItems.map(async (item: any) => {
              try {
                let menuItem: any = null;
                
                // Try to find menu item by ID
                if (item.menuItemId || item.itemId) {
                  const menuItemId = item.menuItemId || item.itemId;
                  
                  // Try menuItems table
                  menuItem = await prisma.menuItem.findFirst({
                    where: {
                      OR: [
                        { id: menuItemId },
                      ]
                    }
                  });
                  
                  // Try items table
                  if (!menuItem) {
                    menuItem = await prisma.item.findFirst({
                      where: {
                        OR: [
                          { id: menuItemId },
                        ]
                      }
                    });
                  }
                }
                
                return {
                  id: item.id || item._id?.toString(),
                  name: menuItem?.name || item.name || item.itemName || 'Unknown Item',
                  quantity: item.quantity || 1,
                  price: item.price || item.unitPrice || 0,
                  total: (item.quantity || 1) * (item.price || item.unitPrice || 0),
                  image: menuItem?.image || menuItem?.imageUrl || item.image || item.imageUrl,
                  menuItemId: item.menuItemId || item.itemId
                };
              } catch (itemError) {
                console.error('Error fetching menu item:', itemError);
                return {
                  id: item.id || item._id?.toString(),
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
          const deliveryInfo = (order.deliveryInfo as any) || {};
          if (order.deliveryAddress) {
            deliveryAddress = order.deliveryAddress;
          } else if (order.deliveryInfo) {
            deliveryAddress = `${deliveryInfo.address || ''}${deliveryInfo.city ? ', ' + deliveryInfo.city : ''}`.trim() || 'Not specified';
          } else if (order.address) {
            deliveryAddress = order.address;
          }

          return {
            id: order.id,
            orderNumber: order.orderNumber || order.orderId || `ORD-${order.id.substring(0, 8).toUpperCase()}`,
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
            customerEmail: order.email || order.customerEmail || deliveryInfo?.email,
            customerPhone: order.phone || order.customerPhone || deliveryInfo?.phone,
            customerName: order.customerName || order.name || deliveryInfo?.fullName,
            createdAt: order.createdAt,
            completedAt: order.completedAt || order.deliveredAt,
            updatedAt: order.updatedAt
          };
        } catch (itemError) {
          console.error('Error processing order:', order.id, itemError);
          return {
            id: order.id,
            orderNumber: order.orderNumber || order.orderId || `ORD-${order.id.substring(0, 8).toUpperCase()}`,
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
        collectionsSearched: ['orders', 'posorders', 'deliveries', 'orderitems'],
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
  }
}
