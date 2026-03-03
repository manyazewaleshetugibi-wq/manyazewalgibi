// app/api/user/points/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
async function findUserInCollections(db: any, userId: string, userEmail: string) {
  let userData = null;
  let foundInCollection = '';
  
  // Try users collection
  const usersCollection = db.collection('users');
  userData = await usersCollection.findOne({
    $or: [
      { _id: new ObjectId(userId) },
      { id: userId },
      { userId: userId },
      { email: userEmail }
    ]
  });
  
  if (userData) {
    foundInCollection = 'users';
    return { userData, foundInCollection };
  }
  
  // Try staff collection
  const staffCollection = db.collection('staff');
  userData = await staffCollection.findOne({
    $or: [
      { _id: new ObjectId(userId) },
      { id: userId },
      { userId: userId },
      { email: userEmail }
    ]
  });
  
  if (userData) {
    foundInCollection = 'staff';
    return { userData, foundInCollection };
  }
  
  // Try customers collection
  const customersCollection = db.collection('customers');
  userData = await customersCollection.findOne({
    $or: [
      { _id: new ObjectId(userId) },
      { id: userId },
      { userId: userId },
      { email: userEmail }
    ]
  });
  
  if (userData) {
    foundInCollection = 'customers';
    return { userData, foundInCollection };
  }
  
  return { userData: null, foundInCollection: '' };
}

// Helper function to find completed orders for user
async function findCompletedOrdersForUser(db: any, userId: string, userEmail: string) {
  const ordersCollection = db.collection('orders');
  
  // Build query to find orders where user is either customerId or has matching email
  const orderQuery = {
    $or: [
      { customerId: userId },
      { userId: userId },
      { 'user.id': userId },
      { 'user._id': userId },
      { email: userEmail },
      { 'customer.email': userEmail },
      { 'user.email': userEmail }
    ],
    status: { $in: ['COMPLETED', 'completed', 'delivered', 'DELIVERED', 'paid', 'PAID'] }
  };
  
  console.log('Searching orders with query:', JSON.stringify(orderQuery, null, 2));
  
  const userOrders = await ordersCollection
    .find(orderQuery)
    .sort({ createdAt: -1 })
    .toArray();
  
  console.log(`Found ${userOrders.length} completed orders for user`);
  
  // Also try to find orders in different collections
  const posOrdersCollection = db.collection('posorders');
  if (posOrdersCollection) {
    const posOrders = await posOrdersCollection
      .find({
        $or: [
          { customerId: userId },
          { userId: userId },
          { 'user.id': userId },
          { email: userEmail },
          { 'customer.email': userEmail }
        ],
        status: { $in: ['COMPLETED', 'completed', 'paid', 'PAID'] }
      })
      .toArray();
    
    console.log(`Found ${posOrders.length} completed POS orders`);
    userOrders.push(...posOrders);
  }
  
  return userOrders;
}

// NEW: Helper function to find referred users who have placed orders
async function findReferredUsersWithOrders(db: any, referrerId: string) {
  const usersCollection = db.collection('users');
  
  // Find all users where referredBy matches the referrerId
  const referredUsers = await usersCollection
    .find({ 
      referredBy: new ObjectId(referrerId) 
    })
    .toArray();
  
  console.log(`Found ${referredUsers.length} users referred by ${referrerId}`);
  
  const validReferrals = [];
  const ordersCollection = db.collection('orders');
  
  for (const referredUser of referredUsers) {
    const referredUserId = referredUser._id.toString();
    const referredUserEmail = referredUser.email;
    
    // Check if this referred user has any orders
    const orderCount = await ordersCollection.countDocuments({
      $or: [
        { customerId: referredUserId },
        { userId: referredUserId },
        { 'user.id': referredUserId },
        { 'user._id': referredUser._id },
        { email: referredUserEmail },
        { 'customer.email': referredUserEmail }
      ],
      status: { $in: ['COMPLETED', 'completed', 'delivered', 'DELIVERED', 'paid', 'PAID'] }
    });
    
    if (orderCount > 0) {
      validReferrals.push({
        userId: referredUserId,
        name: `${referredUser.firstName || ''} ${referredUser.lastName || ''}`.trim() || 'User',
        email: referredUserEmail,
        orderCount,
        referredAt: referredUser.createdAt
      });
      
      console.log(`Referred user ${referredUserId} has ${orderCount} orders - valid for points`);
    } else {
      console.log(`Referred user ${referredUserId} has no orders yet - not awarding points`);
    }
  }
  
  return validReferrals;
}

// Helper function to ensure only one user points record exists
async function ensureSingleUserPointsRecord(userId: string, db: any) {
  const pointsCollection = db.collection('userPoints');
  
  // Find all documents for this user
  const userPointsRecords = await pointsCollection.find({ userId }).toArray();
  
  if (userPointsRecords.length === 0) {
    // No record exists, create one
    const referralCode = `REF-${userId.substring(0, 8).toUpperCase()}`;
    const newRecord = {
      _id: new ObjectId(),
      userId,
      totalPoints: 0,
      availablePoints: 0,
      referralCode,
      transactions: [],
      orderIdsWithPoints: [],
      referredUserIdsWithPoints: [], // Renamed from referralIdsWithPoints to be clearer
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await pointsCollection.insertOne(newRecord);
    return newRecord;
  }
  
  if (userPointsRecords.length === 1) {
    // Only one record exists, return it
    return userPointsRecords[0];
  }
  
  // Multiple records exist, merge them into one
  userPointsRecords.sort((a: any, b: any) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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
  (primaryRecord.transactions || []).forEach(addTransaction);
  totalPoints += primaryRecord.totalPoints || 0;
  availablePoints += primaryRecord.availablePoints || 0;
  
  // Process duplicate records
  for (const duplicate of duplicateRecords) {
    (duplicate.transactions || []).forEach(addTransaction);
    totalPoints += duplicate.totalPoints || 0;
    availablePoints += duplicate.availablePoints || 0;
    
    await pointsCollection.deleteOne({ _id: duplicate._id });
  }
  
  // Update primary record with merged data
  await pointsCollection.updateOne(
    { _id: primaryRecord._id },
    {
      $set: {
        totalPoints,
        availablePoints,
        transactions: allTransactions,
        orderIdsWithPoints: allOrderIds,
        referredUserIdsWithPoints: allReferredUserIds,
        updatedAt: new Date()
      }
    }
  );
  
  return {
    ...primaryRecord,
    totalPoints,
    availablePoints,
    transactions: allTransactions,
    orderIdsWithPoints: allOrderIds,
    referredUserIdsWithPoints: allReferredUserIds,
    updatedAt: new Date()
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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

    const client = await clientPromise;
    const db = client.db();
    
    console.log(`Fetching points for user: ID=${userId}, Email=${userEmail}`);
    
    // Find user in collections to get consistent ID
    const { userData, foundInCollection } = await findUserInCollections(db, userId, userEmail);
    
    if (userData) {
      console.log(`User found in ${foundInCollection} collection`);
      // Use the _id from the found user data as the consistent identifier
      const consistentUserId = userData._id?.toString() || userData.id || userId;
      
      // Ensure only one user points record exists for this user
      let userPoints = await ensureSingleUserPointsRecord(consistentUserId, db);
      
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
      const userOrders = await findCompletedOrdersForUser(db, consistentUserId, userEmail);
      
      // Process orders to calculate points
      const pointsCollection = db.collection('userPoints');
      const newOrderIds = [];
      const orderTransactionsToAdd = [];
      
      for (const order of userOrders) {
        // Skip if order has no items
        if (!order.items || order.items.length === 0) continue;
        
        const orderId = order._id.toString();
        
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
        if (order.total) {
          // Award 1 point per 20 currency units
          orderPoints = Math.max(POINTS_CONFIG.ORDER_POINTS, Math.floor(order.total / 20));
        }
        
        const transactionId = new ObjectId().toString();
        const transaction = {
          id: transactionId,
          type: 'order',
          points: orderPoints,
          description: `Order #${order.orderNumber || orderId.substring(0, 8)}`,
          date: orderDate,
          orderId: orderId,
          orderNumber: order.orderNumber,
          orderTotal: order.total,
          status: 'completed'
        };
        
        // Add to transactions
        orderTransactionsToAdd.push(transaction);
        newOrderIds.push(orderId);
        existingOrderIds.add(orderId);
        
        console.log(`Adding ${orderPoints} points for order ${orderId}`);
      }
      
      // NEW: Find referred users who have placed orders
      const existingReferredUserIds = new Set(userPoints.referredUserIdsWithPoints);
      const validReferredUsers = await findReferredUsersWithOrders(db, consistentUserId);
      
      const referralTransactionsToAdd = [];
      const newReferredUserIds = [];
      
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
        
        const transactionId = new ObjectId().toString();
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
        
        console.log(`Adding ${referralPoints} points for referring ${referredUser.name} who has placed ${referredUser.orderCount} orders`);
      }
      
      // Combine all new transactions
      const allNewTransactions = [...orderTransactionsToAdd, ...referralTransactionsToAdd];
      
      // Add new transactions if any
      if (allNewTransactions.length > 0) {
        const totalNewPoints = allNewTransactions.reduce((sum, t) => sum + t.points, 0);
        
        // Prepare update operations
        const updateOperations: any = {
          $inc: {
            totalPoints: totalNewPoints,
            availablePoints: totalNewPoints,
          },
          $set: { 
            updatedAt: new Date()
          }
        };
        
        // Add transactions using $push
        updateOperations.$push = {
          transactions: { $each: allNewTransactions }
        };
        
        // Add order IDs to tracking array using $addToSet
        if (newOrderIds.length > 0) {
          updateOperations.$addToSet = {
            orderIdsWithPoints: { $each: newOrderIds }
          };
        }
        
        // Add referred user IDs to tracking array
        if (newReferredUserIds.length > 0) {
          if (!updateOperations.$addToSet) {
            updateOperations.$addToSet = {};
          }
          updateOperations.$addToSet.referredUserIdsWithPoints = { $each: newReferredUserIds };
        }
        
        // Perform a single atomic update
        const result = await pointsCollection.updateOne(
          { userId: consistentUserId },
          updateOperations
        );
        
        // Only update local object if database update was successful
        if (result.modifiedCount > 0) {
          userPoints.totalPoints = (userPoints.totalPoints || 0) + totalNewPoints;
          userPoints.availablePoints = (userPoints.availablePoints || 0) + totalNewPoints;
          userPoints.transactions = [...userPoints.transactions, ...allNewTransactions];
          userPoints.orderIdsWithPoints = [...userPoints.orderIdsWithPoints, ...newOrderIds];
          userPoints.referredUserIdsWithPoints = [...userPoints.referredUserIdsWithPoints, ...newReferredUserIds];
          
          console.log(`Added ${totalNewPoints} points for user ${consistentUserId}`);
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
          key = `other-${transaction.id || new ObjectId().toString()}`;
        }
        
        if (!transactionMap.has(key)) {
          transactionMap.set(key, transaction);
          uniqueTransactions.push(transaction);
        }
      }
      
      // Get referred users details for stats
      const referredUsersWithOrders = await findReferredUsersWithOrders(db, consistentUserId);
      
      // Calculate stats
      const stats = {
        totalOrders: userOrders.length,
        successfulReferrals: referredUsersWithOrders.length,
        ordersWithPoints: userPoints.orderIdsWithPoints.length,
        referralsWithPoints: userPoints.referredUserIdsWithPoints.length,
        totalPointsEarned: userPoints.totalPoints || 0,
        availablePoints: userPoints.availablePoints || 0,
        pendingReferrals: await db.collection('users').countDocuments({ 
          referredBy: new ObjectId(consistentUserId),
          _id: { $nin: userPoints.referredUserIdsWithPoints?.map((id: string) => new ObjectId(id)) || [] }
        })
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
      console.log('User not found in any collection, creating minimal points record');
      
      // User not found in any collection, create minimal points record
      const referralCode = `REF-${userId?.substring(0, 8).toUpperCase() || 'USER'}`;
      const newPointsRecord = {
        _id: new ObjectId(),
        userId: userId || userEmail,
        totalPoints: 0,
        availablePoints: 0,
        referralCode,
        transactions: [],
        orderIdsWithPoints: [],
        referredUserIdsWithPoints: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const pointsCollection = db.collection('userPoints');
      await pointsCollection.insertOne(newPointsRecord);
      
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
    const session = await getServerSession(authOptions);
    
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
    
    const client = await clientPromise;
    const db = client.db();
    const pointsCollection = db.collection('userPoints');
    
    // Get user's current points
    const userPoints = await pointsCollection.findOne({ 
      $or: [
        { userId },
        { userId: session.user.email }
      ]
    });
    
    if (!userPoints) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User points record not found'
        },
        { status: 404 }
      );
    }
    
    const availablePoints = userPoints.availablePoints || 0;
    
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
    const redemptionId = new ObjectId().toString();
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
    await pointsCollection.updateOne(
      { _id: userPoints._id },
      {
        $inc: {
          availablePoints: -points
        },
        $push: {
          transactions: redemptionTransaction
        },
        $set: { updatedAt: new Date() }
      }
    );
    
    // Store redemption in redemptions collection
    const redemptionsCollection = db.collection('redemptions');
    await redemptionsCollection.insertOne({
      userId: userPoints.userId,
      points,
      reward,
      transaction: redemptionTransaction,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log(`User ${userId} redeemed ${points} points for ${reward}`);
    
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
    const session = await getServerSession(authOptions);
    
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
    
    const client = await clientPromise;
    const db = client.db();
    const pointsCollection = db.collection('userPoints');
    
    const userPoints = await pointsCollection.findOne({ 
      $or: [
        { userId },
        { userId: session.user.email }
      ]
    });
    
    if (!userPoints) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User points record not found'
        },
        { status: 404 }
      );
    }
    
    if (clearAll) {
      await pointsCollection.updateOne(
        { _id: userPoints._id },
        {
          $set: {
            totalPoints: 0,
            availablePoints: 0,
            transactions: [],
            orderIdsWithPoints: [],
            referredUserIdsWithPoints: [],
            updatedAt: new Date(),
          }
        }
      );
      
      console.log(`Cleared all points for user ${userId}`);
      
      return NextResponse.json({
        success: true,
        message: 'All points and transactions cleared successfully'
      });
    } else {
      await pointsCollection.updateOne(
        { _id: userPoints._id },
        {
          $set: {
            availablePoints: 0,
            updatedAt: new Date(),
          }
        }
      );
      
      console.log(`Cleared available points for user ${userId}`);
      
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