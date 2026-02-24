import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
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

    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('No session or user ID found');
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
    console.log('Fetching orders for user:', userId);

    await client.connect();
    const db = client.db();
    
    // Check if collections exist
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Use customerId to match the current user ID (as per your database structure)
    const ordersCollection = db.collection('orders');
    
    // Try to find orders with customerId matching the current user
    const orderCount = await ordersCollection.countDocuments({ customerId: userId });
    console.log(`Found ${orderCount} orders for user ${userId} using customerId`);
    
    // Fetch orders for the current user using customerId
    const orders = await ordersCollection
      .find({ customerId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Retrieved ${orders.length} orders`);

    // If no orders found, return empty array with helpful message
    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        message: 'No orders found',
        debug: process.env.NODE_ENV === 'development' ? {
          userId: userId,
          queryField: 'customerId'
        } : undefined
      });
    }

    // For each order, fetch items
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        try {
          // Fetch order items
          const orderItems = await db.collection('orderItems')
            .find({ orderId: order._id })
            .toArray();

          // Fetch menu items for each order item
          const itemsWithDetails = await Promise.all(
            orderItems.map(async (item) => {
              try {
                const menuItem = await db.collection('menuItems')
                  .findOne({ _id: new ObjectId(item.menuItemId) });
                
                return {
                  id: item._id?.toString(),
                  name: menuItem?.name || item.name || 'Unknown Item',
                  quantity: item.quantity || 1,
                  price: item.price || 0,
                  total: (item.quantity || 1) * (item.price || 0),
                  image: menuItem?.image || item.image
                };
              } catch (itemError) {
                console.error('Error fetching menu item:', itemError);
                return {
                  id: item._id?.toString(),
                  name: item.name || 'Unknown Item',
                  quantity: item.quantity || 1,
                  price: item.price || 0,
                  total: (item.quantity || 1) * (item.price || 0),
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
          } else if (order.completedAt) {
            orderStatus = 'completed';
          } else if (order.cancelledAt) {
            orderStatus = 'cancelled';
          }

          return {
            id: order._id.toString(),
            orderNumber: order.orderNumber || `ORD-${order._id.toString().substring(0, 8).toUpperCase()}`,
            date: new Date(order.createdAt || order.date || Date.now()).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            datetime: order.createdAt || order.date || new Date().toISOString(),
            total: order.totalAmount || order.finalAmount || order.total || 0,
            subtotal: order.subtotal ?? order.totalAmount ?? calculatedSubtotal,
            tax: order.tax || 0,
            deliveryFee: order.deliveryFee || 0,
            discount: order.discount || 0,
            notes: order.specialRequirements || order.notes || null,
            status: orderStatus as 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered',
            paymentMethod: order.paymentMethod || 'Not specified',
            deliveryAddress: order.deliveryAddress || order.deliveryInfo?.address || 'Not specified',
            items: itemsWithDetails,
            // Include additional fields that might be useful
            customerId: order.customerId,
            createdAt: order.createdAt,
            completedAt: order.completedAt,
            updatedAt: order.updatedAt
          };
        } catch (itemError) {
          console.error('Error fetching items for order:', order._id, itemError);
          return {
            id: order._id.toString(),
            orderNumber: order.orderNumber || `ORD-${order._id.toString().substring(0, 8).toUpperCase()}`,
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
            status: (order.status || 'pending').toLowerCase() as 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered',
            paymentMethod: order.paymentMethod || 'Not specified',
            deliveryAddress: order.deliveryAddress || order.deliveryInfo?.address || 'Not specified',
            items: []
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
      count: ordersWithItems.length,
      debug: process.env.NODE_ENV === 'development' ? {
        userId: userId,
        ordersFound: orders.length,
        queryField: 'customerId'
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