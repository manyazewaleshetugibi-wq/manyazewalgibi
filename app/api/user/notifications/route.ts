// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Please sign in to view notifications'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const client = await clientPromise;
    const db = client.db();
    
    // Fetch all notifications from database
    const notificationsCollection = db.collection('notifications');
    const notifications = await notificationsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50) // Limit to 50 most recent notifications
      .toArray();
    
    // Fetch real orders data
    const ordersCollection = db.collection('orders');
    const recentOrders = await ordersCollection
      .find({ 
        userId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Check and create order notifications for recent orders
    await createOrderNotificationsFromOrders(userId, recentOrders, db);
    
    // Fetch points data
    const pointsCollection = db.collection('userPoints');
    const userPoints = await pointsCollection.findOne({ userId });
    
    if (userPoints) {
      // Check and create points notifications
      await createPointsNotificationsFromPoints(userId, userPoints, db);
    }
    
    // Get updated notifications list
    const updatedNotifications = await notificationsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();
    
    // Calculate real stats
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    const deliveryCount = updatedNotifications.filter(n => n.type === 'delivery' && !n.read).length;
    const tableCount = updatedNotifications.filter(n => n.type === 'table' && !n.read).length;
    const orderCount = updatedNotifications.filter(n => n.type === 'order' && !n.read).length;
    const pointsCount = updatedNotifications.filter(n => n.type === 'points' && !n.read).length;
    const warningCount = updatedNotifications.filter(n => n.priority === 'high' && !n.read).length;
    
    // Calculate order stats
    const activeOrders = recentOrders.filter(order => 
      ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
    ).length;
    
    const cancelledOrders = recentOrders.filter(order => 
      order.status === 'cancelled'
    ).length;
    
    const deliveredOrders = recentOrders.filter(order => 
      order.status === 'delivered' || order.status === 'completed'
    ).length;
    
    return NextResponse.json({
      success: true,
      data: {
        notifications: updatedNotifications.map(notification => ({
          id: notification._id.toString(),
          type: notification.type,
          title: notification.title,
          description: notification.description,
          time: notification.createdAt,
          read: notification.read || false,
          priority: notification.priority || 'medium',
          action: notification.action,
          meta: notification.meta
        })),
        stats: {
          unreadCount,
          deliveryCount,
          tableCount,
          orderCount,
          pointsCount,
          warningCount,
          total: updatedNotifications.length,
          orderStats: {
            totalOrders: recentOrders.length,
            activeOrders,
            cancelledOrders,
            deliveredOrders
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

async function createOrderNotificationsFromOrders(userId: string, orders: any[], db: any) {
  try {
    const notificationsCollection = db.collection('notifications');
    
    for (const order of orders) {
      const orderId = order._id.toString();
      const orderNumber = order.orderNumber || `ORD-${orderId.substring(0, 8)}`;
      
      // Check if notification already exists for this order
      const existingNotification = await notificationsCollection.findOne({
        userId,
        'meta.orderId': orderId
      });
      
      // Only create notification if it doesn't exist and order is recent (last 24 hours)
      const orderTime = new Date(order.createdAt || order.updatedAt).getTime();
      const isRecent = Date.now() - orderTime < 24 * 60 * 60 * 1000;
      
      if (!existingNotification && isRecent) {
        let notificationData: any = null;
        
        // Create notification based on order status
        switch (order.status?.toLowerCase()) {
          case 'pending':
          case 'confirmed':
            notificationData = {
              type: 'order',
              title: 'Order Confirmed!',
              description: `Your order ${orderNumber} has been confirmed`,
              priority: 'medium',
              meta: {
                orderId,
                orderNumber,
                status: order.status,
                estimatedTime: order.estimatedDelivery || '30-45 mins',
                items: order.items?.map((item: any) => item.itemName || item.name) || [],
                totalAmount: order.totalAmount || order.total
              },
              action: {
                label: 'View Order',
                type: 'view_order',
                orderId
              }
            };
            break;
            
          case 'preparing':
            notificationData = {
              type: 'order',
              title: 'Order Being Prepared',
              description: `Chef is preparing your order ${orderNumber}`,
              priority: 'medium',
              meta: {
                orderId,
                orderNumber,
                status: order.status,
                items: order.items?.map((item: any) => item.itemName || item.name) || []
              }
            };
            break;
            
          case 'ready':
            if (order.orderType === 'delivery' || order.deliveryAddress) {
              notificationData = {
                type: 'delivery',
                title: 'Order Ready for Delivery',
                description: `Your order ${orderNumber} is ready and will be delivered soon`,
                priority: 'high',
                meta: {
                  orderId,
                  orderNumber,
                  status: order.status,
                  deliveryTime: 'On the way',
                  items: order.items?.map((item: any) => item.itemName || item.name) || []
                },
                action: {
                  label: 'Track Order',
                  type: 'track_order',
                  orderId
                }
              };
            } else {
              notificationData = {
                type: 'table',
                title: 'Order Ready to Serve',
                description: `Your order ${orderNumber} is ready at the counter`,
                priority: 'high',
                meta: {
                  orderId,
                  orderNumber,
                  status: order.status,
                  tableNumber: order.tableNumber || 'Counter',
                  items: order.items?.map((item: any) => item.itemName || item.name) || []
                }
              };
            }
            break;
            
          case 'delivered':
          case 'completed':
            notificationData = {
              type: 'delivery',
              title: 'Order Delivered!',
              description: `Your order ${orderNumber} has been successfully delivered`,
              priority: 'low',
              meta: {
                orderId,
                orderNumber,
                status: order.status,
                deliveredAt: order.updatedAt || new Date().toISOString(),
                items: order.items?.map((item: any) => item.itemName || item.name) || []
              }
            };
            break;
            
          case 'cancelled':
            notificationData = {
              type: 'system',
              title: '⚠️ Order Cancelled',
              description: `Order ${orderNumber} has been cancelled`,
              priority: 'high',
              meta: {
                orderId,
                orderNumber,
                status: order.status,
                cancellationReason: order.cancellationReason || 'Unknown reason',
                refundStatus: order.refundStatus || 'pending',
                items: order.items?.map((item: any) => item.itemName || item.name) || []
              },
              action: {
                label: 'Contact Support',
                type: 'contact_support'
              }
            };
            break;
            
          case 'failed':
          case 'rejected':
            notificationData = {
              type: 'system',
              title: '⚠️ Order Failed',
              description: `Order ${orderNumber} could not be processed`,
              priority: 'high',
              meta: {
                orderId,
                orderNumber,
                status: order.status,
                reason: order.failureReason || 'Payment failed',
                items: order.items?.map((item: any) => item.itemName || item.name) || []
              },
              action: {
                label: 'Try Again',
                type: 'retry_order',
                orderId
              }
            };
            break;
        }
        
        if (notificationData) {
          // Create notification
          await notificationsCollection.insertOne({
            _id: new ObjectId(),
            userId,
            ...notificationData,
            read: false,
            createdAt: new Date(order.createdAt || Date.now()),
            updatedAt: new Date()
          });
        }
      }
    }
  } catch (error) {
    console.error('Error creating order notifications:', error);
  }
}

async function createPointsNotificationsFromPoints(userId: string, userPoints: any, db: any) {
  try {
    const notificationsCollection = db.collection('notifications');
    
    // Get recent transactions (last 7 days)
    const recentTransactions = (userPoints.transactions || [])
      .filter((t: any) => {
        const transactionDate = new Date(t.date || t.createdAt).getTime();
        return Date.now() - transactionDate < 7 * 24 * 60 * 60 * 1000;
      });
    
    for (const transaction of recentTransactions) {
      // Check if notification already exists for this transaction
      const existingNotification = await notificationsCollection.findOne({
        userId,
        'meta.transactionId': transaction.id || transaction._id?.toString()
      });
      
      if (existingNotification) continue;
      
      let notificationData: any = null;
      
      // Create notification based on transaction type
      switch (transaction.type) {
        case 'order':
          if (transaction.points > 0) {
            notificationData = {
              type: 'points',
              title: '🎉 Points Earned!',
              description: `You earned ${transaction.points} points for ${transaction.description || 'your order'}`,
              priority: 'low',
              meta: {
                transactionId: transaction.id || transaction._id?.toString(),
                points: transaction.points,
                orderId: transaction.orderId,
                description: transaction.description,
                totalPoints: userPoints.totalPoints || userPoints.availablePoints
              }
            };
          }
          break;
          
        case 'referral':
          notificationData = {
            type: 'points',
            title: '👥 Referral Bonus!',
            description: `You earned ${transaction.points} points for ${transaction.description || 'a successful referral'}`,
            priority: 'low',
            meta: {
              transactionId: transaction.id || transaction._id?.toString(),
              points: transaction.points,
              referralId: transaction.referralId,
              description: transaction.description,
              totalPoints: userPoints.totalPoints || userPoints.availablePoints
            }
          };
          break;
          
        case 'redeemed':
          notificationData = {
            type: 'points',
            title: '🎁 Points Redeemed',
            description: `You redeemed ${Math.abs(transaction.points)} points`,
            priority: 'medium',
            meta: {
              transactionId: transaction.id || transaction._id?.toString(),
              points: transaction.points,
              description: transaction.description,
              remainingPoints: userPoints.availablePoints
            }
          };
          break;
          
        case 'bonus':
        case 'promotion':
          notificationData = {
            type: 'points',
            title: '✨ Bonus Points!',
            description: `You received ${transaction.points} bonus points`,
            priority: 'low',
            meta: {
              transactionId: transaction.id || transaction._id?.toString(),
              points: transaction.points,
              reason: transaction.description,
              totalPoints: userPoints.totalPoints || userPoints.availablePoints
            }
          };
          break;
      }
      
      if (notificationData) {
        // Create notification
        await notificationsCollection.insertOne({
          _id: new ObjectId(),
          userId,
          ...notificationData,
          read: false,
          createdAt: new Date(transaction.date || transaction.createdAt || Date.now()),
          updatedAt: new Date()
        });
      }
    }
    
    // Check for milestone achievements
    const milestones = [50, 100, 200, 300, 500, 1000];
    const currentPoints = userPoints.availablePoints || userPoints.totalPoints || 0;
    
    for (const milestone of milestones) {
      if (currentPoints >= milestone && currentPoints - milestone < 10) {
        // Check if milestone notification already exists
        const existingMilestoneNotification = await notificationsCollection.findOne({
          userId,
          'meta.milestone': milestone,
          'meta.type': 'milestone'
        });
        
        if (!existingMilestoneNotification) {
          const nextMilestone = milestones.find(m => m > milestone) || milestone + 100;
          
          await notificationsCollection.insertOne({
            _id: new ObjectId(),
            userId,
            type: 'points',
            title: '🏆 Milestone Reached!',
            description: `You've reached ${milestone} points!`,
            priority: 'medium',
            meta: {
              milestone,
              type: 'milestone',
              currentPoints,
              nextMilestone
            },
            read: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error creating points notifications:', error);
  }
}

// ... rest of the API methods (POST, PUT, DELETE) remain the same ...