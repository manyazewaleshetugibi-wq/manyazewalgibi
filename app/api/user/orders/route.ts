// app/api/user/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function GET(req: NextRequest) {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await client.connect();
    const db = client.db();
    
    // Fetch orders for the current user
    const orders = await db.collection('orders')
      .aggregate([
        {
          $match: {
            userId: session.user.id
          }
        },
        {
          $lookup: {
            from: 'orderItems',
            localField: '_id',
            foreignField: 'orderId',
            as: 'orderItems'
          }
        },
        {
          $lookup: {
            from: 'menuItems',
            localField: 'orderItems.menuItemId',
            foreignField: '_id',
            as: 'menuItems'
          }
        },
        {
          $sort: {
            createdAt: -1
          }
        },
        {
          $project: {
            id: { $toString: '$_id' },
            orderNumber: 1,
            totalAmount: 1,
            status: 1,
            createdAt: 1,
            items: {
              $map: {
                input: '$orderItems',
                as: 'item',
                in: {
                  name: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$menuItems',
                          as: 'menuItem',
                          cond: { $eq: ['$$menuItem._id', '$$item.menuItemId'] }
                        }
                      },
                      0
                    ]
                  }.name,
                  quantity: '$$item.quantity',
                  price: '$$item.price'
                }
              }
            }
          }
        }
      ])
      .toArray();

    // Transform data to match frontend interface
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      date: new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      total: order.totalAmount,
      status: order.status as 'completed' | 'pending' | 'cancelled' | 'preparing',
      items: order.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    }));

    return NextResponse.json({
      orders: formattedOrders,
      count: formattedOrders.length,
    });
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}