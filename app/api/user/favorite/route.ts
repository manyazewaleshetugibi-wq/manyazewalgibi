// // app/api/user/favorites/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/auth';
// import clientPromise from '@/lib/mongodb';
// import { ObjectId } from 'mongodb';

// export async function GET(req: NextRequest) {
//   try {
//     const session = await auth();
    
//     if (!session?.user?.id) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Unauthorized',
//           message: 'Please sign in to view your favorites'
//         },
//         { status: 401 }
//       );
//     }

//     const userId = session.user.id;
//     const client = await clientPromise;
//     const db = client.db();
    
//     console.log(`Fetching favorites for user: ${userId}`);
    
//     // IMPORTANT FIX: Check BOTH userId and customerId fields
//     const ordersCollection = db.collection('orders');
    
//     // Get user's orders - only last 5 orders maximum
//     const userOrders = await ordersCollection
//       .find({ 
//         $or: [
//           { userId: userId },
//           { customerId: userId }
//         ],
//         status: { $nin: ['cancelled', 'refunded', 'CANCELLED', 'REFUNDED'] }
//       })
//       .sort({ createdAt: -1 }) // Sort by newest first
//       .limit(5) // LIMIT TO LAST 5 ORDERS ONLY
//       .toArray();
    
//     console.log(`Found ${userOrders.length} orders for user ${userId} (limited to last 5)`);
    
//     // If no orders, return empty favorites
//     if (userOrders.length === 0) {
//       return NextResponse.json({
//         success: true,
//         data: {
//           topFavorites: [],
//           allFavorites: [],
//           recentItems: [],
//           totalOrders: 0,
//           stats: {
//             totalItemsOrdered: 0,
//             uniqueItemsOrdered: 0,
//             mostOrderedItem: null,
//             averageOrderValue: 0,
//             favoriteCategory: null,
//             totalSpent: 0
//           }
//         }
//       });
//     }
    
//     // Analyze orders to find favorite foods
//     const itemMap = new Map<string, {
//       id: string;
//       name: string;
//       price: number;
//       category: string;
//       image?: string;
//       quantities: number[];
//       totalQuantity: number;
//       totalSpent: number;
//       orderDates: Date[];
//       lastOrderDate: Date;
//     }>();
    
//     const categoryCounts = new Map<string, number>();
//     let totalItemsOrdered = 0;
//     let totalOrderValue = 0;
    
//     // Process each order
//     for (const order of userOrders) {
//       // Add order total
//       const orderTotal = order.finalAmount || order.totalAmount || 0;
//       totalOrderValue += orderTotal;
      
//       // Process items in the order
//       if (order.items && Array.isArray(order.items)) {
//         for (const item of order.items) {
//           // Get item ID - handle different possible ID fields
//           const itemId = item.menuItemId?.toString() || 
//                         item._id?.toString() || 
//                         item.id?.toString() || 
//                         `temp-${item.name || Math.random()}`;
          
//           const itemName = item.itemName || item.name || 'Unknown Item';
//           const itemPrice = Number(item.price) || 0;
//           const itemQuantity = Number(item.quantity) || 1;
//           const itemCategory = item.category || 'Uncategorized';
//           const itemImage = item.image || null;
//           const orderDate = order.createdAt || order.completedAt || new Date();
          
//           // Skip unknown items
//           if (itemName === 'Unknown Item') continue;
          
//           // Update total items ordered count
//           totalItemsOrdered += itemQuantity;
          
//           // Track category popularity
//           categoryCounts.set(
//             itemCategory, 
//             (categoryCounts.get(itemCategory) || 0) + itemQuantity
//           );
          
//           // Track item details
//           if (!itemMap.has(itemId)) {
//             itemMap.set(itemId, {
//               id: itemId,
//               name: itemName,
//               price: itemPrice,
//               category: itemCategory,
//               image: itemImage,
//               quantities: [itemQuantity],
//               totalQuantity: itemQuantity,
//               totalSpent: itemPrice * itemQuantity,
//               orderDates: [orderDate],
//               lastOrderDate: orderDate
//             });
//           } else {
//             const existing = itemMap.get(itemId)!;
            
//             // Check if this is from a different order (not the same order)
//             const isNewOrder = !existing.orderDates.some(date => 
//               date.toDateString() === orderDate.toDateString()
//             );
            
//             if (isNewOrder) {
//               existing.orderDates.push(orderDate);
//             }
            
//             existing.quantities.push(itemQuantity);
//             existing.totalQuantity += itemQuantity;
//             existing.totalSpent += itemPrice * itemQuantity;
            
//             // Update last order date if this order is more recent
//             if (orderDate > existing.lastOrderDate) {
//               existing.lastOrderDate = orderDate;
//             }
//           }
//         }
//       }
//     }
    
//     // Convert map to array and calculate frequencies
//     const allItems = Array.from(itemMap.values()).map(item => {
//       // Count unique orders for this item (based on different dates)
//       const uniqueOrderDates = new Set(item.orderDates.map(d => d.toDateString()));
//       const orderCount = uniqueOrderDates.size;
      
//       // Calculate frequency based on total orders
//       const frequency = ((orderCount / userOrders.length) * 100).toFixed(1);
      
//       return {
//         id: item.id,
//         name: item.name,
//         price: item.price,
//         category: item.category,
//         image: item.image,
//         orderCount: orderCount,
//         frequency: frequency,
//         totalQuantityOrdered: item.totalQuantity,
//         totalSpent: Number(item.totalSpent.toFixed(2)),
//         lastOrdered: item.lastOrderDate.toISOString(),
//         isManual: false
//       };
//     });
    
//     // Sort by order count (most ordered first)
//     const sortedItems = allItems.sort((a, b) => b.orderCount - a.orderCount);
    
//     // Get top favorites (top 10)
//     const topFavorites = sortedItems.slice(0, 10);
    
//     // Get all favorites (sorted by frequency)
//     const allFavorites = sortedItems;
    
//     // Get recently ordered items (by last order date)
//     const recentItems = allItems
//       .sort((a, b) => new Date(b.lastOrdered).getTime() - new Date(a.lastOrdered).getTime())
//       .slice(0, 5);
    
//     // Find most ordered item
//     const mostOrderedItem = sortedItems.length > 0 ? sortedItems[0] : null;
    
//     // Find favorite category
//     let favoriteCategory = null;
//     if (categoryCounts.size > 0) {
//       favoriteCategory = Array.from(categoryCounts.entries())
//         .sort((a, b) => b[1] - a[1])[0][0];
//     }
    
//     // Calculate average order value
//     const averageOrderValue = userOrders.length > 0 
//       ? parseFloat((totalOrderValue / userOrders.length).toFixed(2)) 
//       : 0;
    
//     // Get manually added favorites (if you have a favorites collection)
//     const favoritesCollection = db.collection('userFavorites');
//     const manualFavorites = await favoritesCollection
//       .find({ userId })
//       .sort({ addedAt: -1 })
//       .toArray();
    
//     // Merge manual favorites with calculated ones
//     const manualFavoritesFormatted = manualFavorites.map(fav => ({
//       id: fav.itemId,
//       name: fav.itemName,
//       price: fav.price || 0,
//       category: fav.category || 'Uncategorized',
//       image: fav.image || null,
//       orderCount: fav.orderCount || 0,
//       frequency: '0',
//       totalQuantityOrdered: fav.orderCount || 0,
//       totalSpent: 0,
//       lastOrdered: fav.lastOrdered?.toISOString() || fav.addedAt?.toISOString() || new Date().toISOString(),
//       isManual: true
//     }));
    
//     // Combine and deduplicate all favorites (manual favorites take precedence)
//     const allFavoritesMap = new Map<string, any>();
    
//     // Add calculated favorites
//     allFavorites.forEach(item => {
//       allFavoritesMap.set(item.id, item);
//     });
    
//     // Add or update with manual favorites
//     manualFavoritesFormatted.forEach(item => {
//       if (allFavoritesMap.has(item.id)) {
//         // Merge manual with calculated
//         const existing = allFavoritesMap.get(item.id);
//         allFavoritesMap.set(item.id, {
//           ...existing,
//           isManual: true // Mark as also manually favorited
//         });
//       } else {
//         allFavoritesMap.set(item.id, item);
//       }
//     });
    
//     const combinedFavorites = Array.from(allFavoritesMap.values());
    
//     // Sort combined favorites (manual ones first, then by order count)
//     const sortedCombinedFavorites = combinedFavorites.sort((a, b) => {
//       if (a.isManual && !b.isManual) return -1;
//       if (!a.isManual && b.isManual) return 1;
//       return b.orderCount - a.orderCount;
//     });
    
//     return NextResponse.json({
//       success: true,
//       data: {
//         topFavorites: topFavorites,
//         allFavorites: sortedCombinedFavorites,
//         recentItems: recentItems,
//         totalOrders: userOrders.length,
//         stats: {
//           totalItemsOrdered,
//           uniqueItemsOrdered: allItems.length,
//           mostOrderedItem,
//           averageOrderValue,
//           favoriteCategory,
//           totalSpent: parseFloat(totalOrderValue.toFixed(2))
//         }
//       }
//     });
    
//   } catch (error) {
//     console.error('Error fetching favorites:', error);
    
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: 'Failed to fetch favorites',
//         message: error instanceof Error ? error.message : 'An unexpected error occurred',
//       },
//       { status: 500 }
//     );
//   }
// }

// // Add an item to favorites
// export async function POST(req: NextRequest) {
//   try {
//     const session = await auth();
    
//     if (!session?.user?.id) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Unauthorized'
//         },
//         { status: 401 }
//       );
//     }

//     const { itemId, itemName, price, category, image } = await req.json();
//     const userId = session.user.id;
    
//     if (!itemId || !itemName) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Item ID and name are required'
//         },
//         { status: 400 }
//       );
//     }

//     const client = await clientPromise;
//     const db = client.db();
//     const favoritesCollection = db.collection('userFavorites');
    
//     // Check if already in favorites
//     const existingFavorite = await favoritesCollection.findOne({
//       userId,
//       itemId
//     });
    
//     if (existingFavorite) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Item already in favorites'
//         },
//         { status: 400 }
//       );
//     }
    
//     // Add to favorites
//     const newFavorite = {
//       userId,
//       itemId,
//       itemName,
//       price: price || 0,
//       category: category || 'Uncategorized',
//       image: image || null,
//       addedAt: new Date(),
//       lastOrdered: new Date(),
//       orderCount: 0,
//       isManual: true // Mark as manually added (not from order history)
//     };
    
//     await favoritesCollection.insertOne(newFavorite);
    
//     return NextResponse.json({
//       success: true,
//       message: 'Item added to favorites',
//       data: {
//         id: newFavorite.itemId,
//         name: newFavorite.itemName,
//         addedAt: newFavorite.addedAt
//       }
//     });
    
//   } catch (error) {
//     console.error('Error adding to favorites:', error);
    
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: 'Failed to add to favorites',
//         message: error instanceof Error ? error.message : 'An unexpected error occurred',
//       },
//       { status: 500 }
//     );
//   }
// }

// // Remove an item from favorites
// export async function DELETE(req: NextRequest) {
//   try {
//     const session = await auth();
    
//     if (!session?.user?.id) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Unauthorized'
//         },
//         { status: 401 }
//       );
//     }

//     const { searchParams } = new URL(req.url);
//     const itemId = searchParams.get('itemId');
//     const userId = session.user.id;
    
//     if (!itemId) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Item ID is required'
//         },
//         { status: 400 }
//       );
//     }

//     const client = await clientPromise;
//     const db = client.db();
//     const favoritesCollection = db.collection('userFavorites');
    
//     // Remove from favorites
//     const result = await favoritesCollection.deleteOne({
//       userId,
//       itemId
//     });
    
//     if (result.deletedCount === 0) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           error: 'Item not found in favorites'
//         },
//         { status: 404 }
//       );
//     }
    
//     return NextResponse.json({
//       success: true,
//       message: 'Item removed from favorites'
//     });
    
//   } catch (error) {
//     console.error('Error removing from favorites:', error);
    
//     return NextResponse.json(
//       { 
//         success: false, 
//         error: 'Failed to remove from favorites',
//         message: error instanceof Error ? error.message : 'An unexpected error occurred',
//       },
//       { status: 500 }
//     );
//   }
// }






// // app/api/waitress/[id]/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import { ObjectId } from "mongodb";

// const COLLECTION_NAME = "waitresses";

// export async function GET(
//     req: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         const { id } = await params;
        
//         if (!id || !ObjectId.isValid(id)) {
//             return NextResponse.json({ 
//                 success: false,
//                 message: "Invalid ID format" 
//             }, { status: 400 });
//         }

//         const client = await clientPromise;
//         const db = client.db("gold");
        
//         // Get waitress WITHOUT email field
//         const waitress = await db.collection(COLLECTION_NAME)
//             .findOne(
//                 { _id: new ObjectId(id) },
//                 { projection: { email: 0 } } // Exclude email
//             );

//         if (!waitress) {
//             return NextResponse.json({ 
//                 success: false,
//                 message: "Waitress not found" 
//             }, { status: 404 });
//         }

//         return NextResponse.json({ 
//             success: true,
//             data: waitress,
//             message: "Waitress data retrieved successfully" 
//         }, { status: 200 });
        
//     } catch (error) {
//         console.error('Error fetching waitress:', error);
//         return NextResponse.json(
//             { 
//                 success: false,
//                 message: "Error fetching waitress" 
//             }, 
//             { status: 500 }
//         );
//     }
// }

// export async function PUT(
//     req: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         const { id } = await params;
//         if (!ObjectId.isValid(id)) {
//             return NextResponse.json({ 
//                 success: false,
//                 message: "Invalid ID format" 
//             }, { status: 400 });
//         }

//         const body = await req.json();
        
//         // Remove email from update if present (prevent updating email)
//         delete body.email;
        
//         body.updatedAt = new Date();

//         const client = await clientPromise;
//         const db = client.db("gold");
//         const result = await db.collection(COLLECTION_NAME).updateOne(
//             { _id: new ObjectId(id) },
//             { $set: body }
//         );

//         if (!result.modifiedCount) {
//             const message = result.matchedCount ? "No changes applied" : "Waitress not found";
//             return NextResponse.json({ 
//                 success: result.matchedCount,
//                 message 
//             }, { status: result.matchedCount ? 200 : 404 });
//         }

//         // Get the updated waitress WITHOUT email
//         const updatedWaitress = await db.collection(COLLECTION_NAME)
//             .findOne(
//                 { _id: new ObjectId(id) },
//                 { projection: { email: 0 } } // Exclude email
//             );

//         return NextResponse.json({ 
//             success: true,
//             data: updatedWaitress,
//             message: "Waitress updated successfully" 
//         }, { status: 200 });
        
//     } catch (error) {
//         console.error('Error updating waitress:', error);
//         return NextResponse.json(
//             { 
//                 success: false,
//                 message: "Error updating waitress" 
//             }, 
//             { status: 500 }
//         );
//     }
// }

// export async function DELETE(
//     req: NextRequest,
//     { params }: { params: Promise<{ id: string }> }
// ) {
//     try {
//         const { id } = await params;
//         if (!ObjectId.isValid(id)) {
//             return NextResponse.json({ 
//                 success: false,
//                 message: "Invalid ID format" 
//             }, { status: 400 });
//         }

//         const client = await clientPromise;
//         const db = client.db("gold");
        
//         // Get waitress to check if it exists and get userId
//         const waitress = await db.collection(COLLECTION_NAME)
//             .findOne(
//                 { _id: new ObjectId(id) },
//                 { projection: { userId: 1 } } // Only get userId
//             );

//         if (!waitress) {
//             return NextResponse.json({ 
//                 success: false,
//                 message: "Waitress not found" 
//             }, { status: 404 });
//         }

//         const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

//         if (result.deletedCount && waitress.userId) {
//             await db.collection("users").deleteOne({ _id: new ObjectId(waitress.userId) });
//         }

//         return NextResponse.json({ 
//             success: true,
//             message: "Waitress deleted successfully" 
//         }, { status: 200 });
        
//     } catch (error) {
//         console.error('Error deleting waitress:', error);
//         return NextResponse.json(
//             { 
//                 success: false,
//                 message: "Error deleting waitress" 
//             }, 
//             { status: 500 }
//         );
//     }
// }




// // app/api/waitress/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import { ObjectId } from "mongodb";
// import { ShiftType, Waitress } from "@/models/Waitress";

// const COLLECTION_NAME = "waitresses";
// const USERS_COLLECTION_NAME = "users";

// // Define the shape of the User document we expect from the 'users' collection
// interface PosUser {
//     _id: ObjectId;
//     name: string;
//     email: string;
//     phone?: string;
//     shift?: string;
//     role: string;
//     status: 'active' | 'inactive' | 'suspended';
//     waitresses?: boolean;
// }

// // Define the response type without email
// interface WaitressResponse {
//     _id: ObjectId;
//     name: string;
//     phone: string;
//     shift: string;
//     isActive: boolean;
//     createdAt: Date;
//     updatedAt: Date;
//     userId?: ObjectId;
//     role?: string;
//     registeredFromUser?: boolean;
//     registrationDate?: Date;
//     // email is EXCLUDED from response
// }

// export async function GET(req: NextRequest) {
//     try {
//         const client = await clientPromise;
//         const db = client.db("gold");

//         // --- Automatic registration of POS users as waitresses ---
//         // 1. Get all users with "pos" role
//         const posUsers = await db.collection<PosUser>(USERS_COLLECTION_NAME)
//             .find({ role: "pos", waitresses: { $ne: true } })
//             .project({ password: 0, __v: 0 })
//             .limit(1000)
//             .toArray();

//         // 2. Get all existing waitresses who were registered from a user account
//         const existingWaitresses = await db.collection<Waitress>(COLLECTION_NAME)
//             .find({ userId: { $exists: true } })
//             .project({ userId: 1 })
//             .toArray();
        
//         const existingWaitressUserIds = new Set(existingWaitresses.map(w => w.userId!.toString()));

//         const newWaitressesToRegister: Waitress[] = [];
//         const userIdsToUpdate: ObjectId[] = [];

//         // 3. Check which POS users are not yet registered as waitresses
//         for (const user of posUsers) {
//             if (!existingWaitressUserIds.has(user._id.toString())) {
//                 const userShift = user.shift?.toUpperCase() as keyof typeof ShiftType;
//                 const newWaitress: Waitress = {
//                     _id: new ObjectId(),
//                     name: user.name,
//                     phone: user.phone || "N/A",
//                     shift: Object.values(ShiftType).includes(userShift) ? userShift : ShiftType.MORNING,
//                     isActive: user.status === 'active',
//                     createdAt: new Date(),
//                     updatedAt: new Date(),
//                     userId: user._id,
//                     email: user.email,
//                     role: user.role,
//                     registeredFromUser: true,
//                     registrationDate: new Date(),
//                 };
//                 newWaitressesToRegister.push(newWaitress);
//                 userIdsToUpdate.push(user._id);
//             } else {
//                 userIdsToUpdate.push(user._id);
//             }
//         }

//         // 4. Batch insert new waitresses if any
//         if (newWaitressesToRegister.length > 0) {
//             await db.collection<Waitress>(COLLECTION_NAME).insertMany(newWaitressesToRegister, {
//                 ordered: false
//             });
//         }

//         // 5. Batch update users in smaller chunks if needed
//         if (userIdsToUpdate.length > 0) {
//             const chunkSize = 500;
//             for (let i = 0; i < userIdsToUpdate.length; i += chunkSize) {
//                 const chunk = userIdsToUpdate.slice(i, i + chunkSize);
//                 await db.collection(USERS_COLLECTION_NAME).updateMany(
//                     { _id: { $in: chunk } },
//                     { $set: { waitresses: true } }
//                 );
//             }
//         }

//         // 6. Get all waitresses and EXCLUDE email field from response
//         const allWaitresses = await db.collection<Waitress>(COLLECTION_NAME)
//             .find({})
//             .sort({ name: 1 })
//             .project({ 
//                 email: 0 // Explicitly exclude email field
//             })
//             .toArray();

//         // 7. Return success with data (email excluded)
//         return NextResponse.json({ 
//             success: true,
//             data: allWaitresses,
//             message: "Waitress data retrieved and synchronized successfully",
//             count: newWaitressesToRegister.length
//         }, { status: 200 });
        
//     } catch (error) {
//         console.error('Error fetching waitresses:', error);
//         const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
//         return NextResponse.json(
//             { 
//                 success: false, 
//                 message: "Error fetching waitresses", 
//                 error: errorMessage,
//                 data: [] 
//             }, 
//             { status: 500 }
//         );
//     }
// }

// export async function POST(req: NextRequest) {
//     try {
//         const body = await req.json();
//         const { name, phone, shift, isActive } = body;

//         if (!name || !phone || !shift) {
//             return NextResponse.json(
//                 { 
//                     success: false,
//                     message: "Missing required fields", 
//                     required: ["name", "phone", "shift"] 
//                 }, 
//                 { status: 400 }
//             );
//         }

//         const newWaitress: Waitress = {
//             _id: new ObjectId(),
//             name: name.trim(),
//             phone: phone.trim(),
//             shift,
//             isActive: isActive ?? true,
//             createdAt: new Date(),
//             updatedAt: new Date(),
//         };

//         const client = await clientPromise;
//         const db = client.db("gold");
        
//         // Check for duplicate before inserting
//         const existing = await db.collection(COLLECTION_NAME).findOne({ 
//             name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
//             phone: phone.trim()
//         });
        
//         if (existing) {
//             return NextResponse.json(
//                 { 
//                     success: false,
//                     message: "Waitress with this name and phone already exists" 
//                 }, 
//                 { status: 409 }
//             );
//         }
        
//         const result = await db.collection(COLLECTION_NAME).insertOne(newWaitress);

//         // Get the created waitress WITHOUT email
//         const createdWaitress = await db.collection(COLLECTION_NAME)
//             .findOne(
//                 { _id: result.insertedId },
//                 { projection: { email: 0 } } // Exclude email
//             );

//         return NextResponse.json(
//             { 
//                 success: true,
//                 data: createdWaitress,
//                 message: "Waitress added successfully" 
//             }, 
//             { status: 201 }
//         );
        
//     } catch (error) {
//         console.error('Error adding waitress:', error);
//         const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
//         return NextResponse.json(
//             { 
//                 success: false,
//                 message: "Error adding waitress", 
//                 error: errorMessage 
//             }, 
//             { status: 500 }
//         );
//     }
// }