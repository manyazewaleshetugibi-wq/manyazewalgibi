// // app/api/qr/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import clientPromise from '@/lib/mongodb';
// import { ObjectId } from 'mongodb';

// interface TableArrangement {
//   restaurantId: string;
//   restaurantName: string;
//   floor: string;
//   tables: any[];
//   dimensions?: { width: number; height: number };
// }

// export async function GET(request: NextRequest) {
//   try {
//     const searchParams = request.nextUrl.searchParams;
//     const restaurantId = searchParams.get('restaurantId');
//     const floor = searchParams.get('floor');
//     const getAllRestaurants = searchParams.get('getAllRestaurants') === 'true';

//     const client = await clientPromise;
//     const db = client.db('gold');

//     // Get all restaurants with their floors
//     if (getAllRestaurants) {
//       const restaurants = await getAllRestaurantsWithFloors(db);
//       return NextResponse.json({
//         success: true,
//         data: restaurants,
//         count: restaurants.length
//       });
//     }

//     // Get specific restaurant arrangement
//     if (restaurantId && floor) {
//       const arrangement = await getRestaurantArrangement(db, restaurantId, floor);
//       if (!arrangement) {
//         return NextResponse.json({
//           success: false,
//           error: 'Restaurant or floor not found'
//         }, { status: 404 });
//       }
//       return NextResponse.json({
//         success: true,
//         data: arrangement
//       });
//     }

//     // Get all restaurants summary
//     const restaurants = await getRestaurantsSummary(db);
//     return NextResponse.json({
//       success: true,
//       data: restaurants,
//       count: restaurants.length
//     });

//   } catch (error) {
//     console.error('QR API Error:', error);
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to fetch restaurant data'
//     }, { status: 500 });
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { 
//       restaurantId, 
//       floor, 
//       tableNumber, 
//       action,
//       tableData,
//       arrangementData 
//     } = body;

//     const client = await clientPromise;
//     const db = client.db('gold');

//     // Generate QR code data
//     if (action === 'generate_qr') {
//       if (!restaurantId || !floor || !tableNumber) {
//         return NextResponse.json({
//           success: false,
//           error: 'Missing required fields: restaurantId, floor, tableNumber'
//         }, { status: 400 });
//       }

//       const restaurant = await db
//         .collection('restaurants')
//         .findOne({ 
//           $or: [
//             { restaurantId: restaurantId },
//             { _id: new ObjectId(restaurantId) }
//           ]
//         });

//       if (!restaurant) {
//         return NextResponse.json({
//           success: false,
//           error: 'Restaurant not found'
//         }, { status: 404 });
//       }

//       // Ensure table arrangement exists
//       let arrangement = await db
//         .collection('tablearrangements')
//         .findOne({ 
//           restaurantId: restaurantId,
//           floor: floor 
//         });

//       if (!arrangement) {
//         const newArrangement = {
//           restaurantId: restaurantId,
//           restaurantName: restaurant.restaurantName || restaurant.name || 'Restaurant',
//           floor: floor,
//           tables: [],
//           dimensions: { width: 800, height: 500 },
//           createdAt: new Date(),
//           updatedAt: new Date()
//         };
        
//         const result = await db
//           .collection('tablearrangements')
//           .insertOne(newArrangement);
        
//         arrangement = { ...newArrangement, _id: result.insertedId };
//       }

//       // Add table if it doesn't exist
//       const tableExists = arrangement.tables?.some(
//         (t: any) => t.number === tableNumber
//       );

//       if (!tableExists) {
//         const newTable = {
//           id: `table-${tableNumber}`,
//           number: tableNumber,
//           capacity: 4,
//           status: 'available',
//           shape: 'circle',
//           x: 100 + (tableNumber % 5) * 120,
//           y: 100 + Math.floor(tableNumber / 5) * 120,
//           width: 75,
//           height: 75
//         };

//         await db
//           .collection('tablearrangements')
//           .updateOne(
//             { restaurantId: restaurantId, floor: floor },
//             { 
//               $push: { tables: newTable },
//               $set: { updatedAt: new Date() }
//             }
//           );
//       }

//       const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
//       const qrData = {
//         restaurantId,
//         floor,
//         tableNumber,
//         restaurantName: restaurant.restaurantName || restaurant.name || 'Restaurant',
//         url: `${baseUrl}/menu?restaurant=${restaurantId}&floor=${encodeURIComponent(floor)}&table=${tableNumber}`
//       };

//       return NextResponse.json({
//         success: true,
//         message: 'QR code data prepared successfully',
//         data: qrData
//       });
//     }

//     // Save/Update table arrangement
//     if (action === 'save_arrangement') {
//       if (!restaurantId || !floor || !arrangementData) {
//         return NextResponse.json({
//           success: false,
//           error: 'Missing required fields'
//         }, { status: 400 });
//       }

//       const result = await db
//         .collection('tablearrangements')
//         .updateOne(
//           { restaurantId: restaurantId, floor: floor },
//           { 
//             $set: { 
//               tables: arrangementData.tables,
//               dimensions: arrangementData.dimensions,
//               updatedAt: new Date()
//             },
//             $setOnInsert: {
//               restaurantId: restaurantId,
//               restaurantName: arrangementData.restaurantName || 'Restaurant',
//               floor: floor,
//               createdAt: new Date()
//             }
//           },
//           { upsert: true }
//         );

//       return NextResponse.json({
//         success: true,
//         message: 'Arrangement saved successfully',
//         data: { restaurantId, floor }
//       });
//     }

//     // Add or update a single table
//     if (action === 'add_table') {
//       if (!restaurantId || !floor || !tableData) {
//         return NextResponse.json({
//           success: false,
//           error: 'Missing required fields'
//         }, { status: 400 });
//       }

//       await db
//         .collection('tablearrangements')
//         .updateOne(
//           { restaurantId: restaurantId, floor: floor },
//           { 
//             $push: { tables: tableData },
//             $set: { updatedAt: new Date() }
//           },
//           { upsert: true }
//         );

//       return NextResponse.json({
//         success: true,
//         message: 'Table added successfully'
//       });
//     }

//     // Remove a table
//     if (action === 'remove_table') {
//       if (!restaurantId || !floor || !tableData?.id) {
//         return NextResponse.json({
//           success: false,
//           error: 'Missing required fields'
//         }, { status: 400 });
//       }

//       await db
//         .collection('tablearrangements')
//         .updateOne(
//           { restaurantId: restaurantId, floor: floor },
//           { 
//             $pull: { tables: { id: tableData.id } },
//             $set: { updatedAt: new Date() }
//           }
//         );

//       return NextResponse.json({
//         success: true,
//         message: 'Table removed successfully'
//       });
//     }

//     return NextResponse.json({
//       success: false,
//       error: 'Invalid action'
//     }, { status: 400 });

//   } catch (error) {
//     console.error('QR POST Error:', error);
//     return NextResponse.json({
//       success: false,
//       error: 'Failed to process request'
//     }, { status: 500 });
//   }
// }

// // Helper Functions
// async function getAllRestaurantsWithFloors(db: any) {
//   try {
//     // Get from table arrangements
//     const arrangements = await db
//       .collection('tablearrangements')
//       .find({})
//       .toArray();

//     const restaurantMap = new Map();

//     // Process arrangements
//     arrangements.forEach((arr: TableArrangement) => {
//       const key = arr.restaurantId;
//       if (!restaurantMap.has(key)) {
//         restaurantMap.set(key, {
//           restaurantId: arr.restaurantId,
//           restaurantName: arr.restaurantName,
//           floors: [arr.floor],
//           totalTables: arr.tables?.length || 0,
//           availableTables: arr.tables?.filter((t: any) => t.status === 'available').length || 0
//         });
//       } else {
//         const existing = restaurantMap.get(key);
//         if (!existing.floors.includes(arr.floor)) {
//           existing.floors.push(arr.floor);
//         }
//         existing.totalTables += arr.tables?.length || 0;
//         existing.availableTables += arr.tables?.filter((t: any) => t.status === 'available').length || 0;
//       }
//     });

//     // Get from restaurants collection for those without arrangements
//     const restaurants = await db
//       .collection('restaurants')
//       .find({ isActive: { $ne: false } })
//       .toArray();

//     restaurants.forEach((r: any) => {
//       const id = r.restaurantId || r._id.toString();
//       if (!restaurantMap.has(id)) {
//         restaurantMap.set(id, {
//           restaurantId: id,
//           restaurantName: r.restaurantName || r.name || 'Restaurant',
//           floors: [r.floor || 'Ground Floor'],
//           totalTables: 0,
//           availableTables: 0
//         });
//       }
//     });

//     return Array.from(restaurantMap.values());
//   } catch (error) {
//     console.error('Error fetching restaurants:', error);
//     return [];
//   }
// }

// async function getRestaurantsSummary(db: any) {
//   try {
//     const restaurants = await db
//       .collection('restaurants')
//       .find({ isActive: { $ne: false } })
//       .toArray();

//     return restaurants.map((r: any) => ({
//       _id: r._id.toString(),
//       restaurantId: r.restaurantId || r._id.toString(),
//       restaurantName: r.restaurantName || r.name || 'Restaurant',
//       floor: r.floor || 'Ground Floor',
//       address: r.address || '',
//       phone: r.phone || '',
//       cuisine: r.cuisine || []
//     }));
//   } catch (error) {
//     console.error('Error fetching restaurants summary:', error);
//     return [];
//   }
// }

// async function getRestaurantArrangement(db: any, restaurantId: string, floor: string) {
//   try {
//     const arrangement = await db
//       .collection('tablearrangements')
//       .findOne({ 
//         restaurantId: restaurantId,
//         floor: floor 
//       });

//     if (arrangement) {
//       return {
//         restaurantId: arrangement.restaurantId,
//         restaurantName: arrangement.restaurantName,
//         floor: arrangement.floor,
//         tables: arrangement.tables || [],
//         dimensions: arrangement.dimensions || { width: 800, height: 500 }
//       };
//     }

//     // Fallback to restaurant data
//     const restaurant = await db
//       .collection('restaurants')
//       .findOne({ 
//         $or: [
//           { restaurantId: restaurantId },
//           { _id: new ObjectId(restaurantId) }
//         ]
//       });

//     if (restaurant) {
//       return {
//         restaurantId: restaurant.restaurantId || restaurant._id.toString(),
//         restaurantName: restaurant.restaurantName || restaurant.name || 'Restaurant',
//         floor: floor || restaurant.floor || 'Ground Floor',
//         tables: [],
//         dimensions: { width: 800, height: 500 }
//       };
//     }

//     return null;
//   } catch (error) {
//     console.error('Error fetching arrangement:', error);
//     return null;
//   }
// }