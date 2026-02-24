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
  BIRTHDAY_POINTS: 50,
  MINIMUM_POINTS_REDEEM: 50,
};

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
      referralIdsWithPoints: [],
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
  let allReferralIds: string[] = [];
  let totalPoints = 0;
  let availablePoints = 0;
  
  const seenOrderIds = new Set<string>();
  const seenReferralIds = new Set<string>();
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
    } else if (transaction.type === 'referral' && transaction.referralId) {
      if (!seenReferralIds.has(transaction.referralId)) {
        allReferralIds.push(transaction.referralId);
        seenReferralIds.add(transaction.referralId);
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
        referralIdsWithPoints: allReferralIds,
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
    referralIdsWithPoints: allReferralIds,
    updatedAt: new Date()
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Please sign in to view your points'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const client = await clientPromise;
    const db = client.db();
    
    console.log(`Fetching points for user: ${userId}`);
    
    // Ensure only one user points record exists for this specific user
    const userPoints = await ensureSingleUserPointsRecord(userId, db);
    
    // Verify the record belongs to the current user
    if (userPoints.userId !== userId) {
      console.error('User ID mismatch:', { recordUserId: userPoints.userId, sessionUserId: userId });
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
    userPoints.referralIdsWithPoints = userPoints.referralIdsWithPoints || [];
    
    // Create a Set of existing order IDs for quick lookup
    const existingOrderIds = new Set(userPoints.orderIdsWithPoints);
    
    // Get user's orders - UPDATED: Use customerId to match the current user ID
    const ordersCollection = db.collection('orders');
    
    // Find orders where customerId matches the current user ID
    const userOrders = await ordersCollection
      .find({ 
        customerId: userId,  // Using customerId as that's the field in your orders
        status: 'COMPLETED' 
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Found ${userOrders.length} completed orders for user ${userId} using customerId`);
    
    // Process orders to calculate points
    const pointsCollection = db.collection('userPoints');
    const newOrderIds = [];
    const transactionsToAdd = [];
    
    for (const order of userOrders) {
      // Skip if order has no items
      if (!order.items || order.items.length === 0) continue;
      
      const orderId = order._id.toString();
      
      // Check if points have already been awarded for this specific order
      if (existingOrderIds.has(orderId)) {
        continue;
      }
      
      // DOUBLE CHECK: Verify this order hasn't already been processed
      // Check if there's already a transaction for this order in the database
      const existingTransaction = userPoints.transactions.find((t: any) => 
        t.type === 'order' && t.orderId === orderId
      );
      
      if (existingTransaction) {
        // Order already has a transaction, add to tracking set
        existingOrderIds.add(orderId);
        continue;
      }
      
      // Use completedAt if available, otherwise use updatedAt or createdAt
      const orderDate = order.completedAt || order.updatedAt || order.createdAt || new Date();
      
      // Award 5 points for every valid order
      const orderPoints = POINTS_CONFIG.ORDER_POINTS;
      
      const transactionId = new ObjectId().toString();
      const transaction = {
        id: transactionId,
        type: 'order',
        points: orderPoints,
        description: `Order #${order.orderNumber || orderId.substring(0, 8)}`,
        date: orderDate,
        orderId: orderId,
        status: 'completed'
      };
      
      // Add to transactions
      transactionsToAdd.push(transaction);
      newOrderIds.push(orderId);
      existingOrderIds.add(orderId); // Add to set to prevent duplicates in this loop
      
      console.log(`Adding ${orderPoints} points for order ${orderId}`);
    }
    
    // Calculate points from referrals
    const referralsCollection = db.collection('referrals');
    const userReferrals = await referralsCollection
      .find({ 
        referrerId: userId, 
        status: 'completed'
      })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Found ${userReferrals.length} completed referrals for user ${userId}`);
    
    // Process referrals to calculate points
    const existingReferralIds = new Set(userPoints.referralIdsWithPoints);
    const newReferralIds = [];
    const referralTransactionsToAdd = [];
    
    for (const referral of userReferrals) {
      const referralId = referral._id.toString();
      
      // Check if points have already been awarded for this specific referral
      if (existingReferralIds.has(referralId)) {
        continue; // Skip, points already awarded
      }
      
      // DOUBLE CHECK: Verify this referral hasn't already been processed
      const existingTransaction = userPoints.transactions.find((t: any) => 
        t.type === 'referral' && t.referralId === referralId
      );
      
      if (existingTransaction) {
        existingReferralIds.add(referralId);
        continue;
      }
      
      // Use appropriate date field
      const referralDate = referral.updatedAt || referral.createdAt || new Date();
      
      // Award 10 points for every completed referral
      const referralPoints = POINTS_CONFIG.REFERRAL_POINTS;
      
      const transactionId = new ObjectId().toString();
      const transaction = {
        id: transactionId,
        type: 'referral',
        points: referralPoints,
        description: `Referral - ${referral.referredEmail || 'New user'}`,
        date: referralDate,
        referralId: referralId,
        status: 'completed'
      };
      
      referralTransactionsToAdd.push(transaction);
      newReferralIds.push(referralId);
      existingReferralIds.add(referralId);
      
      console.log(`Adding ${referralPoints} points for referral ${referralId}`);
    }
    
    // Combine all new transactions
    const allNewTransactions = [...transactionsToAdd, ...referralTransactionsToAdd];
    
    // Add new transactions if any - IN A SINGLE DATABASE OPERATION
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
      
      // Add referral IDs to tracking array using $addToSet
      if (newReferralIds.length > 0) {
        if (!updateOperations.$addToSet) {
          updateOperations.$addToSet = {};
        }
        updateOperations.$addToSet.referralIdsWithPoints = { $each: newReferralIds };
      }
      
      // Perform a single atomic update
      const result = await pointsCollection.updateOne(
        { userId },
        updateOperations
      );
      
      // Only update local object if database update was successful
      if (result.modifiedCount > 0) {
        userPoints.totalPoints = (userPoints.totalPoints || 0) + totalNewPoints;
        userPoints.availablePoints = (userPoints.availablePoints || 0) + totalNewPoints;
        userPoints.transactions = [...userPoints.transactions, ...allNewTransactions];
        userPoints.orderIdsWithPoints = [...userPoints.orderIdsWithPoints, ...newOrderIds];
        userPoints.referralIdsWithPoints = [...userPoints.referralIdsWithPoints, ...newReferralIds];
        
        console.log(`Added ${totalNewPoints} points for user ${userId}`);
      }
    }
    
    // Remove duplicate transactions from the array (final safety check)
    const transactionMap = new Map();
    const uniqueTransactions: any[] = [];
    
    for (const transaction of userPoints.transactions) {
      // Create a unique key for each transaction type
      let key: string;
      if (transaction.type === 'order' && transaction.orderId) {
        key = `order-${transaction.orderId}`;
      } else if (transaction.type === 'referral' && transaction.referralId) {
        key = `referral-${transaction.referralId}`;
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
    
    // Calculate stats for frontend
    const stats = {
      totalOrders: userOrders.length,
      successfulReferrals: userReferrals.length,
      ordersWithPoints: userPoints.orderIdsWithPoints.length,
      referralsWithPoints: userPoints.referralIdsWithPoints.length,
    };
    
    // Calculate next reward threshold
    const availablePoints = userPoints.availablePoints || 0;
    const nextRewardThreshold = availablePoints < 50 ? 50 : 
                                availablePoints < 100 ? 100 : 
                                availablePoints < 200 ? 200 : 300;
    
    // Sort transactions by date (newest first)
    const sortedTransactions = uniqueTransactions
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50); // Limit to last 50 transactions for performance
    
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
        _debug: process.env.NODE_ENV === 'development' ? {
          uniqueOrders: userPoints.orderIdsWithPoints.length,
          uniqueReferrals: userPoints.referralIdsWithPoints.length,
          totalTransactions: uniqueTransactions.length,
          userId: userId,
          ordersFound: userOrders.length,
          queryField: 'customerId' // Added for debugging
        } : undefined
      }
    });
    
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

// API endpoint to redeem points
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
    
    // Get user's current points - verify ownership
    const userPoints = await pointsCollection.findOne({ userId });
    
    if (!userPoints) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User points record not found'
        },
        { status: 404 }
      );
    }
    
    // Verify this record belongs to the current user
    if (userPoints.userId !== userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Security validation failed'
        },
        { status: 403 }
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
      { userId },
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
      userId,
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

// Create a referral endpoint
export async function PUT(req: NextRequest) {
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

    const { referredEmail, referredUserId } = await req.json();
    const referrerId = session.user.id;
    
    if (!referredEmail && !referredUserId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Referred email or user ID is required'
        },
        { status: 400 }
      );
    }
    
    const client = await clientPromise;
    const db = client.db();
    const referralsCollection = db.collection('referrals');
    
    // Ensure user has a points record
    const pointsCollection = db.collection('userPoints');
    let referrerPoints = await pointsCollection.findOne({ userId: referrerId });
    
    if (!referrerPoints) {
      // Create points record if it doesn't exist
      const referralCode = `REF-${referrerId.substring(0, 8).toUpperCase()}`;
      referrerPoints = {
        _id: new ObjectId(),
        userId: referrerId,
        totalPoints: 0,
        availablePoints: 0,
        referralCode,
        transactions: [],
        orderIdsWithPoints: [],
        referralIdsWithPoints: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await pointsCollection.insertOne(referrerPoints);
    }
    
    // Check if referral already exists for this user
    const query: any = { referrerId };
    if (referredEmail) {
      query.referredEmail = referredEmail;
    }
    if (referredUserId) {
      query.referredUserId = referredUserId;
    }
    
    const existingReferral = await referralsCollection.findOne(query);
    
    if (existingReferral) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Referral already exists'
        },
        { status: 400 }
      );
    }
    
    // Create new referral
    const referralId = new ObjectId();
    const newReferral = {
      _id: referralId,
      referrerId,
      referredEmail: referredEmail || null,
      referredUserId: referredUserId || null,
      referrerCode: referrerPoints.referralCode,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await referralsCollection.insertOne(newReferral);
    
    console.log(`User ${referrerId} created referral for ${referredEmail || referredUserId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Referral registered successfully',
      data: {
        referralId: referralId.toString(),
        referralCode: referrerPoints.referralCode,
        status: 'pending'
      }
    });
    
  } catch (error) {
    console.error('Error creating referral:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create referral',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear points (for testing or admin use)
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
    
    // Verify ownership before clearing
    const userPoints = await pointsCollection.findOne({ userId });
    
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
      // Reset user points completely
      await pointsCollection.updateOne(
        { userId },
        {
          $set: {
            totalPoints: 0,
            availablePoints: 0,
            transactions: [],
            orderIdsWithPoints: [],
            referralIdsWithPoints: [],
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
      // Just clear available points but keep history
      await pointsCollection.updateOne(
        { userId },
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