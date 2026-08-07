// app/api/user/points/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

// Points configuration
const POINTS_CONFIG = {
  ORDER_POINTS: 5,
  REFERRAL_POINTS: 10,
  MINIMUM_POINTS_REDEEM: 50,
};

// Helper function to get user identifier
async function getUserIdentifier(session: any) {
  const user = session.user;
  const userId = user.id;
  const userEmail = user.email;
  
  return { userId, userEmail };
}

// Helper function to find user in multiple collections
async function findUserInCollections(userId: string, userEmail: string) {
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

// Helper function to find completed orders for user
async function findCompletedOrdersForUser(userId: string, userEmail: string) {
  const orderWhere: any = {
    OR: [
      { customerId: userId },
      { userId: userId },
    ],
    status: { in: ['COMPLETED', 'completed', 'delivered', 'DELIVERED', 'paid', 'PAID'] }
  };
  

  
  const userOrders: any[] = await prisma.order.findMany({
    where: orderWhere,
    orderBy: { createdAt: 'desc' },
  });
  

  
  // Also try to find orders in the posorders table
  const posOrders = await prisma.posOrder.findMany({
    where: {
      OR: [
        { customerId: userId },
        { userId: userId },
        { email: userEmail },
      ],
      status: { in: ['COMPLETED', 'completed', 'paid', 'PAID'] }
    }
  });
  

  userOrders.push(...posOrders);
  
  return userOrders;
}

// NEW: Helper function to find referred users who have placed orders
async function findReferredUsersWithOrders(referrerId: string) {
  // Find all users where referredBy matches the referrerId
  const referredUsers = await prisma.user.findMany({
    where: { referredBy: referrerId }
  });
  

  
  const validReferrals: any[] = [];
  
  for (const referredUser of referredUsers) {
    const referredUserId = referredUser.id;
    const referredUserEmail = referredUser.email || '';
    
    // Check if this referred user has any orders
    const orderCount = await prisma.order.count({
      where: {
        OR: [
          { customerId: referredUserId },
          { userId: referredUserId },
        ],
        status: { in: ['COMPLETED', 'completed', 'delivered', 'DELIVERED', 'paid', 'PAID'] }
      }
    });
    
    if (orderCount > 0) {
      validReferrals.push({
        userId: referredUserId,
        name: `${referredUser.firstName || ''} ${referredUser.lastName || ''}`.trim() || 'User',
        email: referredUserEmail,
        orderCount,
        referredAt: referredUser.createdAt
      });
      

    } else {

    }
  }
  
  return validReferrals;
}

// Helper to read a user points record (stored on UserPoint.activity Json)
function readUserPointsRecord(record: any) {
  const activity = (record.activity as any) || {};
  return {
    id: record.id,
    userId: record.userId,
    totalPoints: activity.totalPoints ?? record.points ?? 0,
    availablePoints: activity.availablePoints ?? record.points ?? 0,
    referralCode: activity.referralCode || `REF-${record.userId?.substring(0, 8).toUpperCase() || 'USER'}`,
    transactions: activity.transactions || [],
    orderIdsWithPoints: activity.orderIdsWithPoints || [],
    referredUserIdsWithPoints: activity.referredUserIdsWithPoints || [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// Helper function to ensure only one user points record exists
async function ensureSingleUserPointsRecord(userId: string) {
  // Find all records for this user
  const userPointsRecords = await prisma.userPoint.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  
  if (userPointsRecords.length === 0) {
    // No record exists, create one
    const referralCode = `REF-${userId.substring(0, 8).toUpperCase()}`;
    const newRecord = {
      totalPoints: 0,
      availablePoints: 0,
      referralCode,
      transactions: [],
      orderIdsWithPoints: [],
      referredUserIdsWithPoints: [],
    };
    
    const created = await prisma.userPoint.create({
      data: {
        id: randomUUID(),
        userId,
        points: 0,
        activity: newRecord as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return readUserPointsRecord(created);
  }
  
  if (userPointsRecords.length === 1) {
    // Only one record exists, return it
    return readUserPointsRecord(userPointsRecords[0]);
  }
  
  // Multiple records exist, merge them into one
  userPointsRecords.sort((a: any, b: any) =>
    new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
  
  const primaryRecord = userPointsRecords[0];
  const duplicateRecords = userPointsRecords.slice(1);
  
  let allTransactions: any[] = [];
  let allOrderIds: string[] = [];
  let allReferredUserIds: string[] = [];
  let totalPoints = 0;
  let availablePoints = 0;
  
  const seenOrderIds = new Set<string>();
  const seenReferredUserIds = new Set<string>();
  const seenTransactionIds = new Set<string>();
  
  const addTransaction = (transaction: any) => {
    if (transaction.id && seenTransactionIds.has(transaction.id)) {
      return;
    }
    
    allTransactions.push(transaction);
    if (transaction.id) seenTransactionIds.add(transaction.id);
    
    if (transaction.type === 'order' && transaction.orderId) {
      if (!seenOrderIds.has(transaction.orderId)) {
        allOrderIds.push(transaction.orderId);
        seenOrderIds.add(transaction.orderId);
      }
    } else if (transaction.type === 'referral' && transaction.referredUserId) {
      if (!seenReferredUserIds.has(transaction.referredUserId)) {
        allReferredUserIds.push(transaction.referredUserId);
        seenReferredUserIds.add(transaction.referredUserId);
      }
    }
  };
  
  // Process primary record
  const primary = readUserPointsRecord(primaryRecord);
  (primary.transactions || []).forEach(addTransaction);
  totalPoints += primary.totalPoints || 0;
  availablePoints += primary.availablePoints || 0;
  
  // Process duplicate records
  for (const duplicate of duplicateRecords) {
    const dup = readUserPointsRecord(duplicate);
    (dup.transactions || []).forEach(addTransaction);
    totalPoints += dup.totalPoints || 0;
    availablePoints += dup.availablePoints || 0;
    
    await prisma.userPoint.deleteMany({ where: { id: dup.id } });
  }
  
  // Update primary record with merged data
  const mergedData = {
    totalPoints,
    availablePoints,
    referralCode: primary.referralCode,
    transactions: allTransactions,
    orderIdsWithPoints: allOrderIds,
    referredUserIdsWithPoints: allReferredUserIds,
  };
  
  await prisma.userPoint.update({
    where: { id: primaryRecord.id },
    data: {
      points: availablePoints,
      activity: mergedData as any,
      updatedAt: new Date(),
    },
  });
  
  return {
    ...primary,
    ...mergedData,
    updatedAt: new Date(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Please sign in to view your points'
        },
        { status: 401 }
      );
    }

    const { userId, userEmail } = await getUserIdentifier(session);
    
    if (!userId && !userEmail) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user session',
          message: 'User identifier not found in session'
        },
        { status: 400 }
      );
    }


    
    // Find user in collections to get consistent ID
    const { userData, foundInCollection } = await findUserInCollections(userId, userEmail);
    
    if (userData) {

      // Use the id from the found user data as the consistent identifier
      const consistentUserId = userData.id || userData.userId || userId;
      
      // Ensure only one user points record exists for this user
      let userPoints: any = await ensureSingleUserPointsRecord(consistentUserId);
      
      // Verify the record belongs to the current user
      if (userPoints.userId !== consistentUserId) {
        console.error('User ID mismatch:', { recordUserId: userPoints.userId, sessionUserId: consistentUserId });
        return NextResponse.json(
          { 
            success: false, 
            error: 'User ID mismatch',
            message: 'Security validation failed'
          },
          { status: 403 }
        );
      }
      
      // Ensure all arrays exist
      userPoints.transactions = userPoints.transactions || [];
      userPoints.orderIdsWithPoints = userPoints.orderIdsWithPoints || [];
      userPoints.referredUserIdsWithPoints = userPoints.referredUserIdsWithPoints || [];
      
      // Create a Set of existing order IDs for quick lookup
      const existingOrderIds = new Set(userPoints.orderIdsWithPoints);
      
      // Find completed orders for user
      const userOrders = await findCompletedOrdersForUser(consistentUserId, userEmail);
      
      // Process orders to calculate points
      const newOrderIds: string[] = [];
      const orderTransactionsToAdd: any[] = [];
      
      for (const order of userOrders) {
        // Skip if order has no items
        const orderItems = (order.items as any);
        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) continue;
        
        const orderId = order.id;
        
        // Check if points have already been awarded for this specific order
        if (existingOrderIds.has(orderId)) {
          continue;
        }
        
        // DOUBLE CHECK: Verify this order hasn't already been processed
        const existingTransaction = userPoints.transactions.find((t: any) => 
          t.type === 'order' && t.orderId === orderId
        );
        
        if (existingTransaction) {
          // Order already has a transaction, add to tracking set
          existingOrderIds.add(orderId);
          continue;
        }
        
        // Use appropriate date field
        const orderDate = order.completedAt || order.deliveredAt || order.updatedAt || order.createdAt || new Date();
        
        // Award points based on order total or fixed amount
        let orderPoints = POINTS_CONFIG.ORDER_POINTS;
        
        // Optionally calculate points based on order total
        const orderTotal = order.total || order.finalAmount || order.totalAmount || 0;
        if (orderTotal) {
          // Award 1 point per 20 currency units
          orderPoints = Math.max(POINTS_CONFIG.ORDER_POINTS, Math.floor(orderTotal / 20));
        }
        
        const transactionId = randomUUID();
        const transaction = {
          id: transactionId,
          type: 'order',
          points: orderPoints,
          description: `Order #${order.orderNumber || orderId.substring(0, 8)}`,
          date: orderDate,
          orderId: orderId,
          orderNumber: order.orderNumber,
          orderTotal: orderTotal,
          status: 'completed'
        };
        
        // Add to transactions
        orderTransactionsToAdd.push(transaction);
        newOrderIds.push(orderId);
        existingOrderIds.add(orderId);
        

      }
      
      // NEW: Find referred users who have placed orders
      const existingReferredUserIds = new Set(userPoints.referredUserIdsWithPoints);
      const validReferredUsers = await findReferredUsersWithOrders(consistentUserId);
      
      const referralTransactionsToAdd: any[] = [];
      const newReferredUserIds: string[] = [];
      
      for (const referredUser of validReferredUsers) {
        // Check if points have already been awarded for this referred user
        if (existingReferredUserIds.has(referredUser.userId)) {
          continue;
        }
        
        // DOUBLE CHECK: Verify this referral hasn't already been processed
        const existingTransaction = userPoints.transactions.find((t: any) => 
          t.type === 'referral' && t.referredUserId === referredUser.userId
        );
        
        if (existingTransaction) {
          existingReferredUserIds.add(referredUser.userId);
          continue;
        }
        
        // Award points for valid referral (referred user has placed orders)
        const referralPoints = POINTS_CONFIG.REFERRAL_POINTS;
        
        const transactionId = randomUUID();
        const transaction = {
          id: transactionId,
          type: 'referral',
          points: referralPoints,
          description: `Referral bonus - ${referredUser.name} placed ${referredUser.orderCount} ${referredUser.orderCount === 1 ? 'order' : 'orders'}`,
          date: referredUser.referredAt || new Date(),
          referredUserId: referredUser.userId,
          referredName: referredUser.name,
          referredEmail: referredUser.email,
          orderCount: referredUser.orderCount,
          status: 'completed'
        };
        
        referralTransactionsToAdd.push(transaction);
        newReferredUserIds.push(referredUser.userId);
        existingReferredUserIds.add(referredUser.userId);
        

      }
      
      // Combine all new transactions
      const allNewTransactions = [...orderTransactionsToAdd, ...referralTransactionsToAdd];
      
      // Add new transactions if any
      if (allNewTransactions.length > 0) {
        const totalNewPoints = allNewTransactions.reduce((sum, t) => sum + t.points, 0);
        
        // Build the updated points record (stored on UserPoint.activity Json)
        const updatedActivity = {
          totalPoints: (userPoints.totalPoints || 0) + totalNewPoints,
          availablePoints: (userPoints.availablePoints || 0) + totalNewPoints,
          referralCode: userPoints.referralCode,
          transactions: [...userPoints.transactions, ...allNewTransactions],
          orderIdsWithPoints: [...userPoints.orderIdsWithPoints, ...newOrderIds],
          referredUserIdsWithPoints: [...userPoints.referredUserIdsWithPoints, ...newReferredUserIds],
        };
        
        // Perform a single atomic update
        const result = await prisma.userPoint.updateMany(
          { where: { userId: consistentUserId }, data: { points: updatedActivity.availablePoints, activity: updatedActivity as any, updatedAt: new Date() } }
        );
        
        // Only update local object if database update was successful
        if (result.count > 0) {
          userPoints.totalPoints = updatedActivity.totalPoints;
          userPoints.availablePoints = updatedActivity.availablePoints;
          userPoints.transactions = updatedActivity.transactions;
          userPoints.orderIdsWithPoints = updatedActivity.orderIdsWithPoints;
          userPoints.referredUserIdsWithPoints = updatedActivity.referredUserIdsWithPoints;
          

        }
      }
      
      // Remove duplicate transactions
      const transactionMap = new Map();
      const uniqueTransactions: any[] = [];
      
      for (const transaction of userPoints.transactions) {
        let key: string;
        if (transaction.type === 'order' && transaction.orderId) {
          key = `order-${transaction.orderId}`;
        } else if (transaction.type === 'referral' && transaction.referredUserId) {
          key = `referral-${transaction.referredUserId}`;
        } else if (transaction.type === 'redeemed' && transaction.id) {
          key = `redeemed-${transaction.id}`;
        } else {
          key = `other-${transaction.id || randomUUID()}`;
        }
        
        if (!transactionMap.has(key)) {
          transactionMap.set(key, transaction);
          uniqueTransactions.push(transaction);
        }
      }
      
      // Get referred users details for stats
      const referredUsersWithOrders = await findReferredUsersWithOrders(consistentUserId);
      
      // Calculate pending referrals (users referred by this user who haven't been awarded yet)
      const referredUserIds = userPoints.referredUserIdsWithPoints || [];
      const pendingReferrals = await prisma.user.count({
        where: {
          referredBy: consistentUserId,
          id: { notIn: referredUserIds }
        }
      });
      
      // Calculate stats
      const stats = {
        totalOrders: userOrders.length,
        successfulReferrals: referredUsersWithOrders.length,
        ordersWithPoints: userPoints.orderIdsWithPoints.length,
        referralsWithPoints: userPoints.referredUserIdsWithPoints.length,
        totalPointsEarned: userPoints.totalPoints || 0,
        availablePoints: userPoints.availablePoints || 0,
        pendingReferrals
      };
      
      // Calculate next reward threshold
      const availablePoints = userPoints.availablePoints || 0;
      const nextRewardThreshold = availablePoints < 50 ? 50 : 
                                  availablePoints < 100 ? 100 : 
                                  availablePoints < 200 ? 200 : 
                                  availablePoints < 500 ? 500 : 1000;
      
      // Sort transactions by date (newest first)
      const sortedTransactions = uniqueTransactions
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 50);
      
      return NextResponse.json({
        success: true,
        data: {
          totalPoints: userPoints.totalPoints || 0,
          availablePoints: userPoints.availablePoints || 0,
          transactions: sortedTransactions,
          referralCode: userPoints.referralCode,
          userId: userPoints.userId,
          nextRewardThreshold,
          stats,
          userInfo: {
            name: userData?.name || session.user.name,
            email: userData?.email || session.user.email,
            foundIn: foundInCollection
          },
          referredUsers: referredUsersWithOrders.map(u => ({
            name: u.name,
            email: u.email,
            orderCount: u.orderCount,
            date: u.referredAt
          })),
          _debug: process.env.NODE_ENV === 'development' ? {
            uniqueOrders: userPoints.orderIdsWithPoints.length,
            uniqueReferrals: userPoints.referredUserIdsWithPoints.length,
            totalTransactions: uniqueTransactions.length,
            userId: consistentUserId,
            userEmail: userEmail,
            ordersFound: userOrders.length,
            referredUsersFound: referredUsersWithOrders.length,
            newTransactionsAdded: allNewTransactions.length
          } : undefined
        }
      });
      
    } else {

      
      // User not found in any collection, create minimal points record
      const referralCode = `REF-${userId?.substring(0, 8).toUpperCase() || 'USER'}`;
      const newPointsRecord = {
        totalPoints: 0,
        availablePoints: 0,
        referralCode,
        transactions: [],
        orderIdsWithPoints: [],
        referredUserIdsWithPoints: [],
      };
      
      await prisma.userPoint.create({
        data: {
          id: randomUUID(),
          userId: userId || userEmail,
          points: 0,
          activity: newPointsRecord as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      return NextResponse.json({
        success: true,
        data: {
          totalPoints: 0,
          availablePoints: 0,
          transactions: [],
          referralCode,
          userId: userId || userEmail,
          nextRewardThreshold: 50,
          stats: {
            totalOrders: 0,
            successfulReferrals: 0,
            ordersWithPoints: 0,
            referralsWithPoints: 0,
            totalPointsEarned: 0,
            availablePoints: 0,
            pendingReferrals: 0
          },
          userInfo: {
            name: session.user.name,
            email: session.user.email,
            foundIn: 'none'
          },
          referredUsers: []
        }
      });
    }
    
  } catch (error) {
    console.error('Error fetching points:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch points',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Update the POST endpoint to use the same referral logic for manual awarding
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const { points, reward } = await req.json();
    const userId = session.user.id;
    
    if (!points || !reward) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Points and reward are required'
        },
        { status: 400 }
      );
    }
    
    if (typeof points !== 'number' || points <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Points must be a positive number'
        },
        { status: 400 }
      );
    }
    
    if (points < POINTS_CONFIG.MINIMUM_POINTS_REDEEM) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Minimum ${POINTS_CONFIG.MINIMUM_POINTS_REDEEM} points required for redemption`
        },
        { status: 400 }
      );
    }
    
    // Get user's current points record
    const userPoint = await prisma.userPoint.findFirst({
      where: {
        OR: [
          { userId },
          { userId: session.user.email }
        ]
      }
    });
    
    if (!userPoint) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User points record not found'
        },
        { status: 404 }
      );
    }
    
    const activity = (userPoint.activity as any) || {};
    const availablePoints = activity.availablePoints ?? userPoint.points ?? 0;
    
    if (availablePoints < points) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient points'
        },
        { status: 400 }
      );
    }
    
    // Create redemption transaction
    const redemptionId = randomUUID();
    const redemptionTransaction = {
      id: redemptionId,
      type: 'redeemed',
      points: -points,
      description: `Redeemed for: ${reward}`,
      date: new Date(),
      redemptionId: redemptionId,
      status: 'completed'
    };
    
    // Update user points
    await prisma.userPoint.update(
      { 
        where: { id: userPoint.id },
        data: {
          points: availablePoints - points,
          activity: {
            ...activity,
            availablePoints: availablePoints - points,
            transactions: [...(activity.transactions || []), redemptionTransaction],
          } as any,
          updatedAt: new Date(),
        }
      }
    );
    
    // Store redemption in redemptions table
    await prisma.redemption.create({
      data: {
        id: randomUUID(),
        userId: userPoint.userId,
        points,
        reward,
        status: 'pending',
        createdAt: new Date(),
      },
    });
    

    
    return NextResponse.json({
      success: true,
      message: `Successfully redeemed ${points} points for ${reward}`,
      data: {
        redemptionId,
        remainingPoints: availablePoints - points,
        transaction: redemptionTransaction
      }
    });
    
  } catch (error) {
    console.error('Error redeeming points:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to redeem points',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// Remove the PUT endpoint as we no longer need manual referral creation
// The referral system is now based on the referredBy field in user documents

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const clearAll = searchParams.get('clearAll') === 'true';
    const userId = session.user.id;
    
    // Get user's current points record
    const userPoint = await prisma.userPoint.findFirst({
      where: {
        OR: [
          { userId },
          { userId: session.user.email }
        ]
      }
    });
    
    if (!userPoint) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User points record not found'
        },
        { status: 404 }
      );
    }
    
    if (clearAll) {
      await prisma.userPoint.update(
        { 
          where: { id: userPoint.id },
          data: {
            points: 0,
            activity: {
              totalPoints: 0,
              availablePoints: 0,
              referralCode: ((userPoint.activity as any)?.referralCode) || `REF-${userId.substring(0, 8).toUpperCase()}`,
              transactions: [],
              orderIdsWithPoints: [],
              referredUserIdsWithPoints: [],
            } as any,
            updatedAt: new Date(),
          }
        }
      );
      

      
      return NextResponse.json({
        success: true,
        message: 'All points and transactions cleared successfully'
      });
    } else {
      const activity = (userPoint.activity as any) || {};
      await prisma.userPoint.update(
        { 
          where: { id: userPoint.id },
          data: {
            points: 0,
            activity: {
              ...activity,
              availablePoints: 0,
            } as any,
            updatedAt: new Date(),
          }
        }
      );
      

      
      return NextResponse.json({
        success: true,
        message: 'Available points cleared successfully'
      });
    }
    
  } catch (error) {
    console.error('Error clearing points:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear points',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
