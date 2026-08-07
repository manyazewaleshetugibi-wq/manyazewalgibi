// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
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
    
    // Fetch all notifications from database
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 most recent notifications
    });
    
    // Fetch real orders data
    const recentOrders = await prisma.order.findMany({
      where: { 
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Check and create order notifications for recent orders
    await createOrderNotificationsFromOrders(userId, recentOrders);
    
    // Fetch points data
    const userPoints = await prisma.userPoint.findFirst({ where: { userId } });
    
    if (userPoints) {
      // Check and create points notifications
      await createPointsNotificationsFromPoints(userId, userPoints);
    }
    
    // Get updated notifications list
    const updatedNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    // Calculate real stats
    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    const deliveryCount = updatedNotifications.filter(n => n.type === 'delivery' && !n.read).length;
    const tableCount = updatedNotifications.filter(n => n.type === 'table' && !n.read).length;
    const orderCount = updatedNotifications.filter(n => n.type === 'order' && !n.read).length;
    const pointsCount = updatedNotifications.filter(n => n.type === 'points' && !n.read).length;
    const warningCount = updatedNotifications.filter(n => (n as any).priority === 'high' && !n.read).length;
    
    // Calculate order stats
    const activeOrders = recentOrders.filter(order => 
      ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status as string)
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
          id: notification.id,
          type: notification.type,
          title: notification.title,
          description: notification.message,
          time: notification.createdAt,
          read: notification.read || false,
          priority: (notification as any).priority || 'medium',
          action: (notification as any).action,
          meta: (notification as any).meta
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

async function createOrderNotificationsFromOrders(userId: string, orders: any[]) {
  try {
    for (const order of orders) {
      const orderId = order.id;
      const orderNumber = order.orderNumber || `ORD-${orderId.substring(0, 8)}`;
      
      // Only create notification if order is recent (last 24 hours)
      const orderTime = new Date(order.createdAt || order.updatedAt).getTime();
      const isRecent = Date.now() - orderTime < 24 * 60 * 60 * 1000;
      
      if (!isRecent) continue;
      
      let notificationData: any = null;
      
      // Create notification based on order status
      switch ((order.status || '').toLowerCase()) {
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
              estimatedTime: (order as any).estimatedDelivery || '30-45 mins',
              items: (order.items as any[])?.map((item: any) => item.itemName || item.name) || [],
              totalAmount: order.totalAmount || (order as any).total
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
              items: (order.items as any[])?.map((item: any) => item.itemName || item.name) || []
            }
          };
          break;
          
        case 'ready':
          if ((order as any).orderType === 'delivery' || (order as any).deliveryAddress) {
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
                items: (order.items as any[])?.map((item: any) => item.itemName || item.name) || []
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
                items: (order.items as any[])?.map((item: any) => item.itemName || item.name) || []
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
              items: (order.items as any[])?.map((item: any) => item.itemName || item.name) || []
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
              cancellationReason: (order as any).cancellationReason || 'Unknown reason',
              refundStatus: (order as any).refundStatus || 'pending',
              items: (order.items as any[])?.map((item: any) => item.itemName || item.name) || []
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
              reason: (order as any).failureReason || 'Payment failed',
              items: (order.items as any[])?.map((item: any) => item.itemName || item.name) || []
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
        // Check if notification already exists for this order
        const existingNotification = await prisma.notification.findFirst({
          where: { userId, message: notificationData.description }
        });
        
        if (!existingNotification) {
          // Create notification
          await prisma.notification.create({
            data: {
              id: randomUUID(),
              userId,
              type: notificationData.type,
              title: notificationData.title,
              message: notificationData.description,
              read: false,
              createdAt: new Date(order.createdAt || Date.now()),
              updatedAt: new Date()
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error creating order notifications:', error);
  }
}

async function createPointsNotificationsFromPoints(userId: string, userPoints: any) {
  try {
    // Get recent transactions (last 7 days)
    const recentTransactions = ((userPoints as any).transactions || [])
      .filter((t: any) => {
        const transactionDate = new Date(t.date || t.createdAt).getTime();
        return Date.now() - transactionDate < 7 * 24 * 60 * 60 * 1000;
      });
    
    for (const transaction of recentTransactions) {
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
                totalPoints: (userPoints as any).totalPoints || (userPoints as any).availablePoints
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
              totalPoints: (userPoints as any).totalPoints || (userPoints as any).availablePoints
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
              remainingPoints: (userPoints as any).availablePoints
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
              totalPoints: (userPoints as any).totalPoints || (userPoints as any).availablePoints
            }
          };
          break;
      }
      
      if (notificationData) {
        // Check if notification already exists for this transaction
        const existingNotification = await prisma.notification.findFirst({
          where: { userId, message: notificationData.description }
        });
        
        if (!existingNotification) {
          // Create notification
          await prisma.notification.create({
            data: {
              id: randomUUID(),
              userId,
              type: notificationData.type,
              title: notificationData.title,
              message: notificationData.description,
              read: false,
              createdAt: new Date(transaction.date || transaction.createdAt || Date.now()),
              updatedAt: new Date()
            }
          });
        }
      }
    }
    
    // Check for milestone achievements
    const milestones = [50, 100, 200, 300, 500, 1000];
    const currentPoints = (userPoints as any).availablePoints || (userPoints as any).totalPoints || 0;
    
    for (const milestone of milestones) {
      if (currentPoints >= milestone && currentPoints - milestone < 10) {
        // Check if milestone notification already exists
        const existingMilestoneNotification = await prisma.notification.findFirst({
          where: {
            userId,
            title: '🏆 Milestone Reached!',
            message: `You've reached ${milestone} points!`
          }
        });
        
        if (!existingMilestoneNotification) {
          const nextMilestone = milestones.find(m => m > milestone) || milestone + 100;
          
          await prisma.notification.create({
            data: {
              id: randomUUID(),
              userId,
              type: 'points',
              title: '🏆 Milestone Reached!',
              message: `You've reached ${milestone} points!`,
              read: false,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error creating points notifications:', error);
  }
}
