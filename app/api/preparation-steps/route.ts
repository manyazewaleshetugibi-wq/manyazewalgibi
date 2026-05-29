import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getCurrentUserData } from "../utils/orderHelpers";

// Helper function to check if user is admin
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(role);
};

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

    let query = {};
    if (recipeId && ObjectId.isValid(recipeId)) {
      query = { _id: new ObjectId(recipeId) };
    } else if (itemId && ObjectId.isValid(itemId)) {
      query = { itemId: new ObjectId(itemId) };
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
        
        // Fetch stock details for ingredients (support both old and new structure)
        const stepsWithStockDetails = await Promise.all(
          (recipe.steps || []).map(async (step: any) => {
            // Handle multiple ingredients (new structure)
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
            // Handle single ingredient (old structure)
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
        
        // Calculate total time using timeValue (new) or timeAmount (old)
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

  
// If all is true, return all recipes, else return only active ones
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

// POST endpoint - Create new preparation recipe (with duplicate check)
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

    // Check if item exists
    const item = await db.collection("items").findOne({ _id: new ObjectId(itemId) });
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    // Check if recipe already exists for this item (prevent duplicate)
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

    // Get current user
    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    // Prepare recipe document with new structure
    const recipeData = {
      itemId: new ObjectId(itemId),
      itemName: item.name,
      steps: steps.map((step: any, index: number) => {
        // Create step object with new structure
        const stepObj: any = {
          stepNumber: index + 1,
          description: step.description,
          // New descriptive fields
          timeText: step.timeText || `${step.timeAmount || 0} minutes`,
          timeValue: step.timeValue || step.timeAmount || 0,
          heatText: step.heatText || step.heatPower || "",
          heatValue: step.heatValue || step.heatPower || null,
          tempText: step.tempText || (step.temperature ? `${step.temperature}°C` : ""),
          tempValue: step.tempValue || step.temperature || null,
          // Ingredients (support multiple)
          ingredients: step.ingredients || [],
          // Other fields
          notes: step.notes || null,
          imageUrl: step.imageUrl || null
        };
        
        // Keep legacy fields for backward compatibility
        if (step.timeAmount !== undefined) stepObj.timeAmount = step.timeAmount;
        if (step.heatPower !== undefined) stepObj.heatPower = step.heatPower;
        if (step.temperature !== undefined) stepObj.temperature = step.temperature;
        if (step.ingredientName !== undefined) stepObj.ingredientName = step.ingredientName;
        
        return stepObj;
      }),
      totalTime: totalTime || steps.reduce((acc: number, step: any) => {
        return acc + (step.timeValue || step.timeAmount || 0);
      }, 0),
      createdBy: userData?.name || userData?.email || "Unknown",
      createdByRole: userData?.role,
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
      createdBy: userData?.name || userData?.email,
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

// PUT endpoint - Update existing recipe
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

    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only admins can update recipes" },
        { status: 403 }
      );
    }

    const existingRecipe = await db.collection("preparation_recipes").findOne({ _id: new ObjectId(recipeId) });
    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: userData?.name || userData?.email,
      version: (existingRecipe.version || 0) + 1
    };

    if (steps && Array.isArray(steps)) {
      updateData.steps = steps.map((step: any, index: number) => {
        // Create step object with new structure
        const stepObj: any = {
          stepNumber: index + 1,
          description: step.description,
          // New descriptive fields
          timeText: step.timeText || `${step.timeAmount || 0} minutes`,
          timeValue: step.timeValue || step.timeAmount || 0,
          heatText: step.heatText || step.heatPower || "",
          heatValue: step.heatValue || step.heatPower || null,
          tempText: step.tempText || (step.temperature ? `${step.temperature}°C` : ""),
          tempValue: step.tempValue || step.temperature || null,
          // Ingredients (support multiple)
          ingredients: step.ingredients || [],
          // Other fields
          notes: step.notes || null,
          imageUrl: step.imageUrl || null
        };
        
        // Keep legacy fields for backward compatibility
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
      updatedBy: userData?.name || userData?.email,
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

// DELETE endpoint - Soft delete recipe
export async function DELETE(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const url = new URL(req.url);
    const recipeId = url.searchParams.get("id");

    if (!recipeId || !ObjectId.isValid(recipeId)) {
      return NextResponse.json(
        { success: false, error: "Valid recipe ID is required" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only admins can delete recipes" },
        { status: 403 }
      );
    }

    const recipe = await db.collection("preparation_recipes").findOne({ _id: new ObjectId(recipeId) });
    if (!recipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    // Soft delete
    const result = await db.collection("preparation_recipes").updateOne(
      { _id: new ObjectId(recipeId) },
      { 
        $set: { 
          isActive: false,
          deletedAt: new Date(),
          deletedBy: userData?.name || userData?.email
        } 
      }
    );

    await db.collection("preparation_logs").insertOne({
      action: "DELETE",
      recipeId: new ObjectId(recipeId),
      itemId: recipe.itemId,
      itemName: recipe.itemName,
      deletedBy: userData?.name || userData?.email,
      deletedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: "Recipe deleted successfully",
      modifiedCount: result.modifiedCount
    }, { status: 200 });

  } catch (error) {
    console.error("Error deleting recipe:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
