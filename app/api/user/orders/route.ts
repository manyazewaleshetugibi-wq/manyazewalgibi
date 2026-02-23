import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { MongoClient } from 'mongodb';

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

    console.log('Fetching orders for user:', session.user.id);

    await client.connect();
    const db = client.db();
    
    // Check if collections exist
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Try different collection name variations
    const ordersCollection = db.collection('orders');
    const orderCount = await ordersCollection.countDocuments({ userId: session.user.id });
    console.log(`Found ${orderCount} orders for user ${session.user.id}`);
    
    // Fetch orders for the current user
    const orders = await ordersCollection
      .find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Retrieved ${orders.length} orders`);

    // If no orders found, return empty array
    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        orders: [],
        count: 0,
        message: 'No orders found'
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
              const menuItem = await db.collection('menuItems')
                .findOne({ _id: item.menuItemId });
              
              return {
                name: menuItem?.name || 'Unknown Item',
                quantity: item.quantity,
                price: item.price,
                total: item.quantity * item.price,
                image: menuItem?.image
              };
            })
          );

          const calculatedSubtotal = itemsWithDetails.reduce((sum, item) => sum + (item.total || 0), 0);

          return {
            id: order._id.toString(),
            orderNumber: order.orderNumber || `ORD-${order._id.toString().substring(0, 8).toUpperCase()}`,
            date: new Date(order.createdAt || order.date || Date.now()).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            datetime: order.createdAt || order.date || new Date().toISOString(),
            total: order.totalAmount || order.total || 0,
            subtotal: order.subtotal ?? calculatedSubtotal,
            tax: order.tax || 0,
            deliveryFee: order.deliveryFee || 0,
            discount: order.discount || 0,
            notes: order.notes || null,
            status: (order.status || 'pending').toLowerCase() as 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered',
            paymentMethod: order.paymentMethod || 'Not specified',
            deliveryAddress: order.deliveryAddress || 'Not specified',
            items: itemsWithDetails
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
            total: order.totalAmount || order.total || 0,
            subtotal: 0,
            tax: 0,
            deliveryFee: 0,
            discount: 0,
            notes: null,
            status: (order.status || 'pending').toLowerCase() as 'completed' | 'pending' | 'cancelled' | 'preparing' | 'delivered',
            paymentMethod: order.paymentMethod || 'Not specified',
            deliveryAddress: order.deliveryAddress || 'Not specified',
            items: []
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
      count: ordersWithItems.length,
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