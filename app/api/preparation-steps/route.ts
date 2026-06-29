import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getCurrentUserData } from "../utils/orderHelpers";

// Helper function to extract first number from text
const extractFirstNumber = (text: string): number => {
  const match = text?.match(/\d+\.?\d*/);
  return match ? parseFloat(match[0]) : 0;
};

// GET endpoint - Fetch all preparation recipes
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const url = new URL(req.url);
    const recipeId = url.searchParams.get("id");
    const itemId = url.searchParams.get("itemId");
    const all = url.searchParams.get("all") === "true";
    const includeDeleted = url.searchParams.get("includeDeleted") === "true";

    let query: any = {};
    
    if (!includeDeleted) {
      query.isActive = { $ne: false };
    }
    
    if (recipeId && ObjectId.isValid(recipeId)) {
      query._id = new ObjectId(recipeId);
    } else if (itemId && ObjectId.isValid(itemId)) {
      query.itemId = new ObjectId(itemId);
    }

    const recipes = await db.collection("preparation_recipes")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch item details for each recipe
    const recipesWithDetails = await Promise.all(
      recipes.map(async (recipe) => {
        const item = await db.collection("items").findOne(
          { _id: recipe.itemId },
          { projection: { name: 1, imageUrl: 1, price: 1 } }
        );
        
        const stepsWithStockDetails = await Promise.all(
          (recipe.steps || []).map(async (step: any) => {
            if (step.ingredients && step.ingredients.length > 0) {
              const ingredientsWithStock = await Promise.all(
                step.ingredients.map(async (ingredient: any) => {
                  const stockItem = await db.collection("stock").findOne(
                    { name: ingredient.name },
                    { projection: { name: 1, unit: 1, currentStock: 1 } }
                  );
                  return { ...ingredient, stockDetails: stockItem };
                })
              );
              return { ...step, ingredients: ingredientsWithStock };
            }
            else if (step.ingredientName) {
              const stockItem = await db.collection("stock").findOne(
                { name: step.ingredientName },
                { projection: { name: 1, unit: 1, currentStock: 1 } }
              );
              return { ...step, stockDetails: stockItem };
            }
            return step;
          })
        );
        
        const totalTime = recipe.steps?.reduce((acc: number, step: any) => {
          if (step.timeValue) return acc + step.timeValue;
          if (step.timeAmount) return acc + step.timeAmount;
          return acc;
        }, 0) || 0;
        
        return {
          ...recipe,
          itemDetails: item,
          steps: stepsWithStockDetails,
          totalSteps: recipe.steps?.length || 0,
          totalTime: recipe.totalTime || totalTime
        };
      })
    );

    const filteredRecipes = all ? recipesWithDetails : recipesWithDetails.filter((r: any) => r.isActive !== false);

    return NextResponse.json({
      success: true,
      recipes: filteredRecipes,
      count: filteredRecipes.length,
      totalRecipes: recipesWithDetails.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching preparation recipes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

// POST endpoint - Create new preparation recipe (allow all authenticated users)
export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();
    
    const { itemId, steps, totalTime } = body;

    if (!itemId || !ObjectId.isValid(itemId)) {
      return NextResponse.json(
        { success: false, error: "Valid item ID is required" },
        { status: 400 }
      );
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one step is required" },
        { status: 400 }
      );
    }

    const item = await db.collection("items").findOne({ _id: new ObjectId(itemId) });
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    // Check if recipe already exists
    const existingRecipe = await db.collection("preparation_recipes").findOne({ 
      itemId: new ObjectId(itemId),
      isActive: { $ne: false }
    });
    
    if (existingRecipe) {
      return NextResponse.json({
        success: false,
        error: "Preparation recipe already exists for this item",
        exists: true,
        recipeId: existingRecipe._id,
        recipe: existingRecipe
      }, { status: 409 });
    }

    // Get current user - use fallback if not available
    let userData;
    try {
      userData = await getCurrentUserData(req);
    } catch (error) {
      console.warn("Could not get user data, using fallback:", error);
      userData = { name: "Unknown User", email: "unknown@example.com", role: "user" };
    }

    const isAdmin = userData?.role ? ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(userData.role) : false;

    // Prepare recipe document
    const recipeData = {
      itemId: new ObjectId(itemId),
      itemName: item.name,
      steps: steps.map((step: any, index: number) => {
        const stepObj: any = {
          stepNumber: index + 1,
          description: step.description,
          timeText: step.timeText || `${step.timeAmount || 0} minutes`,
          timeValue: step.timeValue || step.timeAmount || 0,
          timeUnit: step.timeUnit || 'minutes',
          timeMinutes: step.timeMinutes || 0,
          heatText: step.heatText || step.heatPower || "",
          heatValue: step.heatValue || step.heatPower || null,
          tempText: step.tempText || (step.temperature ? `${step.temperature}°C` : ""),
          tempValue: step.tempValue || step.temperature || null,
          ingredients: step.ingredients || [],
          notes: step.notes || null,
          imageUrl: step.imageUrl || null
        };
        
        if (step.timeAmount !== undefined) stepObj.timeAmount = step.timeAmount;
        if (step.heatPower !== undefined) stepObj.heatPower = step.heatPower;
        if (step.temperature !== undefined) stepObj.temperature = step.temperature;
        if (step.ingredientName !== undefined) stepObj.ingredientName = step.ingredientName;
        
        return stepObj;
      }),
      totalTime: totalTime || steps.reduce((acc: number, step: any) => {
        return acc + (step.timeValue || step.timeAmount || 0);
      }, 0),
      createdBy: userData?.name || userData?.email || "Unknown User",
      createdByRole: userData?.role || "user",
      isAdminCreated: isAdmin,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      version: 1
    };

    const result = await db.collection("preparation_recipes").insertOne(recipeData);

    // Create activity log
    await db.collection("preparation_logs").insertOne({
      action: "CREATE",
      recipeId: result.insertedId,
      itemId: new ObjectId(itemId),
      itemName: item.name,
      stepsCount: steps.length,
      createdBy: userData?.name || userData?.email || "Unknown",
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: "Preparation recipe created successfully",
      recipeId: result.insertedId,
      recipe: {
        ...recipeData,
        _id: result.insertedId
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating preparation recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}

// PUT endpoint - Update existing recipe (allow all authenticated users)
export async function PUT(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();
    const { recipeId, steps, totalTime, itemId } = body;

    if (!recipeId || !ObjectId.isValid(recipeId)) {
      return NextResponse.json(
        { success: false, error: "Valid recipe ID is required" },
        { status: 400 }
      );
    }

    // Get current user - use fallback if not available
    let userData;
    try {
      userData = await getCurrentUserData(req);
    } catch (error) {
      console.warn("Could not get user data, using fallback:", error);
      userData = { name: "Unknown User", email: "unknown@example.com", role: "user" };
    }

    const existingRecipe = await db.collection("preparation_recipes").findOne({ _id: new ObjectId(recipeId) });
    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    // REMOVED ADMIN CHECK - Allow any authenticated user to update
    // Just log who is updating
    console.log(`User ${userData?.name || 'Unknown'} updating recipe ${recipeId}`);

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: userData?.name || userData?.email || "Unknown User",
      version: (existingRecipe.version || 0) + 1
    };

    if (steps && Array.isArray(steps)) {
      updateData.steps = steps.map((step: any, index: number) => {
        const stepObj: any = {
          stepNumber: index + 1,
          description: step.description,
          timeText: step.timeText || `${step.timeAmount || 0} minutes`,
          timeValue: step.timeValue || step.timeAmount || 0,
          timeUnit: step.timeUnit || 'minutes',
          timeMinutes: step.timeMinutes || 0,
          heatText: step.heatText || step.heatPower || "",
          heatValue: step.heatValue || step.heatPower || null,
          tempText: step.tempText || (step.temperature ? `${step.temperature}°C` : ""),
          tempValue: step.tempValue || step.temperature || null,
          ingredients: step.ingredients || [],
          notes: step.notes || null,
          imageUrl: step.imageUrl || null
        };
        
        if (step.timeAmount !== undefined) stepObj.timeAmount = step.timeAmount;
        if (step.heatPower !== undefined) stepObj.heatPower = step.heatPower;
        if (step.temperature !== undefined) stepObj.temperature = step.temperature;
        if (step.ingredientName !== undefined) stepObj.ingredientName = step.ingredientName;
        
        return stepObj;
      });
      updateData.totalTime = totalTime || steps.reduce((acc: number, step: any) => {
        return acc + (step.timeValue || step.timeAmount || 0);
      }, 0);
    }

    if (itemId && ObjectId.isValid(itemId)) {
      const item = await db.collection("items").findOne({ _id: new ObjectId(itemId) });
      if (item) {
        updateData.itemId = new ObjectId(itemId);
        updateData.itemName = item.name;
      }
    }

    const result = await db.collection("preparation_recipes").updateOne(
      { _id: new ObjectId(recipeId) },
      { $set: updateData }
    );

    await db.collection("preparation_logs").insertOne({
      action: "UPDATE",
      recipeId: new ObjectId(recipeId),
      itemId: existingRecipe.itemId,
      itemName: existingRecipe.itemName,
      updatedBy: userData?.name || userData?.email || "Unknown",
      updatedAt: new Date(),
      version: updateData.version
    });

    return NextResponse.json({
      success: true,
      message: "Recipe updated successfully",
      modifiedCount: result.modifiedCount,
      version: updateData.version
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

// DELETE endpoint - Delete recipe (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const url = new URL(req.url);
    
    const recipeId = url.searchParams.get("id") || url.searchParams.get("recipeId");
    const itemId = url.searchParams.get("itemId");
    const permanent = url.searchParams.get("permanent") === "true";
    const force = url.searchParams.get("force") === "true";

    let userData;
    try {
      userData = await getCurrentUserData(req);
    } catch (error) {
      console.warn("Could not get user data:", error);
      userData = { name: "Unknown User", email: "unknown@example.com", role: "user" };
    }

    const isAdmin = userData?.role ? ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(userData.role) : false;

    // Keep admin check for DELETE (safer to restrict deletion)
    if (!isAdmin && !force) {
      return NextResponse.json(
        { success: false, error: "Only admins can delete recipes" },
        { status: 403 }
      );
    }

    let query: any = {};
    if (recipeId && ObjectId.isValid(recipeId)) {
      query._id = new ObjectId(recipeId);
    } else if (itemId && ObjectId.isValid(itemId)) {
      query.itemId = new ObjectId(itemId);
    } else {
      return NextResponse.json(
        { success: false, error: "Valid recipe ID or item ID is required" },
        { status: 400 }
      );
    }

    const recipes = await db.collection("preparation_recipes")
      .find(query)
      .toArray();

    if (!recipes || recipes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Recipe(s) not found" },
        { status: 404 }
      );
    }

    let deletedCount = 0;
    const deletedRecipes = [];

    for (const recipe of recipes) {
      let result;
      
      if (permanent) {
        result = await db.collection("preparation_recipes").deleteOne({
          _id: recipe._id
        });
        
        if (result.deletedCount > 0) {
          deletedCount++;
          deletedRecipes.push({
            id: recipe._id,
            itemName: recipe.itemName,
            deleted: true,
            permanent: true
          });
          
          await db.collection("preparation_logs").insertOne({
            action: "PERMANENT_DELETE",
            recipeId: recipe._id,
            itemId: recipe.itemId,
            itemName: recipe.itemName,
            deletedBy: userData?.name || userData?.email || "Unknown",
            deletedAt: new Date(),
            permanent: true
          });
        }
      } else {
        result = await db.collection("preparation_recipes").updateOne(
          { _id: recipe._id },
          { 
            $set: { 
              isActive: false,
              deletedAt: new Date(),
              deletedBy: userData?.name || userData?.email || "Unknown",
              deletedReason: "Soft delete by admin"
            } 
          }
        );
        
        if (result.modifiedCount > 0) {
          deletedCount++;
          deletedRecipes.push({
            id: recipe._id,
            itemName: recipe.itemName,
            deleted: true,
            permanent: false,
            isActive: false
          });
          
          await db.collection("preparation_logs").insertOne({
            action: "SOFT_DELETE",
            recipeId: recipe._id,
            itemId: recipe.itemId,
            itemName: recipe.itemName,
            deletedBy: userData?.name || userData?.email || "Unknown",
            deletedAt: new Date(),
            permanent: false
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} recipe(s) ${permanent ? 'permanently deleted' : 'soft deleted'} successfully`,
      deletedCount,
      deletedRecipes,
      permanent,
      softDelete: !permanent,
      restoredAvailable: !permanent
    }, { status: 200 });

  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete recipe(s)" },
      { status: 500 }
    );
  }
}

// PATCH endpoint - Restore soft-deleted recipe (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const url = new URL(req.url);
    const recipeId = url.searchParams.get("id") || url.searchParams.get("recipeId");
    const action = url.searchParams.get("action") || "restore";

    if (!recipeId || !ObjectId.isValid(recipeId)) {
      return NextResponse.json(
        { success: false, error: "Valid recipe ID is required" },
        { status: 400 }
      );
    }

    let userData;
    try {
      userData = await getCurrentUserData(req);
    } catch (error) {
      console.warn("Could not get user data:", error);
      userData = { name: "Unknown User", email: "unknown@example.com", role: "user" };
    }

    const isAdmin = userData?.role ? ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(userData.role) : false;

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only admins can restore recipes" },
        { status: 403 }
      );
    }

    const recipe = await db.collection("preparation_recipes").findOne({ 
      _id: new ObjectId(recipeId) 
    });
    
    if (!recipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    if (recipe.isActive !== false) {
      return NextResponse.json(
        { success: false, error: "Recipe is already active" },
        { status: 400 }
      );
    }

    const result = await db.collection("preparation_recipes").updateOne(
      { _id: new ObjectId(recipeId) },
      { 
        $set: { 
          isActive: true,
          restoredAt: new Date(),
          restoredBy: userData?.name || userData?.email || "Unknown"
        },
        $unset: { 
          deletedAt: "",
          deletedBy: "",
          deletedReason: ""
        }
      }
    );

    await db.collection("preparation_logs").insertOne({
      action: "RESTORE",
      recipeId: new ObjectId(recipeId),
      itemId: recipe.itemId,
      itemName: recipe.itemName,
      restoredBy: userData?.name || userData?.email || "Unknown",
      restoredAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: "Recipe restored successfully",
      modifiedCount: result.modifiedCount,
      recipeId: recipeId
    }, { status: 200 });

  } catch (error) {
    console.error("Error restoring recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to restore recipe" },
      { status: 500 }
    );
  }
}