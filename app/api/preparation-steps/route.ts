import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getCurrentUserData } from "../utils/orderHelpers";

// Helper function to extract first number from text
const extractFirstNumber = (text: string): number => {
  const match = text?.match(/\d+\.?\d*/);
  return match ? parseFloat(match[0]) : 0;
};

// GET endpoint - Fetch all preparation recipes
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const recipeId = url.searchParams.get("id");
    const itemId = url.searchParams.get("itemId");
    const all = url.searchParams.get("all") === "true";
    const includeDeleted = url.searchParams.get("includeDeleted") === "true";

    let query: any = {};
    
    if (!includeDeleted) {
      query.isActive = { not: false };
    }
    
    if (recipeId) {
      query.id = recipeId;
    } else if (itemId) {
      query.itemId = itemId;
    }

    const recipes = await prisma.preparationRecipe.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
    });

    // Fetch item details for each recipe
    const recipesWithDetails = await Promise.all(
      recipes.map(async (recipe) => {
        const item = recipe.itemId
          ? await prisma.item.findUnique({
              where: { id: recipe.itemId },
              select: { name: true, imageUrl: true, price: true },
            })
          : null;
        
        const stepsWithStockDetails = await Promise.all(
          ((recipe.steps as any) || []).map(async (step: any) => {
            if (step.ingredients && step.ingredients.length > 0) {
              const ingredientsWithStock = await Promise.all(
                step.ingredients.map(async (ingredient: any) => {
                  const stockItem = await prisma.stockRecord.findFirst({
                    where: { name: ingredient.name },
                    select: { name: true, unit: true, currentStock: true },
                  });
                  return { ...ingredient, stockDetails: stockItem };
                })
              );
              return { ...step, ingredients: ingredientsWithStock };
            }
            else if (step.ingredientName) {
              const stockItem = await prisma.stockRecord.findFirst({
                where: { name: step.ingredientName },
                select: { name: true, unit: true, currentStock: true },
              });
              return { ...step, stockDetails: stockItem };
            }
            return step;
          })
        );
        
        const totalTime = ((recipe.steps as any) || []).reduce((acc: number, step: any) => {
          if (step.timeValue) return acc + step.timeValue;
          if (step.timeAmount) return acc + step.timeAmount;
          return acc;
        }, 0) || 0;
        
        return {
          ...recipe,
          _id: recipe.id,
          itemDetails: item,
          steps: stepsWithStockDetails,
          totalSteps: ((recipe.steps as any) || []).length || 0,
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
    const body = await req.json();
    
    const { itemId, steps, totalTime } = body;

    if (!itemId) {
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

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    // Check if recipe already exists
    const existingRecipe = await prisma.preparationRecipe.findFirst({
      where: {
        itemId: itemId,
        isActive: { not: false }
      }
    });
    
    if (existingRecipe) {
      return NextResponse.json({
        success: false,
        error: "Preparation recipe already exists for this item",
        exists: true,
        recipeId: existingRecipe.id,
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
    const recipeData: any = {
      itemId: itemId,
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

    const result = await prisma.preparationRecipe.create({
      data: {
        id: randomUUID(),
        ...recipeData,
      },
    });

    // Create activity log
    await prisma.preparationLog.create({
      data: {
        id: randomUUID(),
        action: "CREATE",
        recipeId: result.id,
        itemId: itemId,
        itemName: item.name,
        stepsCount: steps.length,
        createdBy: userData?.name || userData?.email || "Unknown",
        createdAt: new Date()
      },
    });

    return NextResponse.json({
      success: true,
      message: "Preparation recipe created successfully",
      recipeId: result.id,
      recipe: {
        ...recipeData,
        _id: result.id
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
    const body = await req.json();
    const { recipeId, steps, totalTime, itemId } = body;

    if (!recipeId) {
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

    const existingRecipe = await prisma.preparationRecipe.findUnique({ where: { id: recipeId } });
    if (!existingRecipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found" },
        { status: 404 }
      );
    }

    // REMOVED ADMIN CHECK - Allow any authenticated user to update
    // Just log who is updating


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

    if (itemId) {
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (item) {
        updateData.itemId = itemId;
        updateData.itemName = item.name;
      }
    }

    const result = await prisma.preparationRecipe.updateMany({
      where: { id: recipeId },
      data: updateData,
    });

    await prisma.preparationLog.create({
      data: {
        id: randomUUID(),
        action: "UPDATE",
        recipeId: recipeId,
        itemId: existingRecipe.itemId,
        itemName: existingRecipe.itemName,
        createdBy: userData?.name || userData?.email || "Unknown",
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Recipe updated successfully",
      modifiedCount: result.count,
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
    if (recipeId) {
      query.id = recipeId;
    } else if (itemId) {
      query.itemId = itemId;
    } else {
      return NextResponse.json(
        { success: false, error: "Valid recipe ID or item ID is required" },
        { status: 400 }
      );
    }

    const recipes = await prisma.preparationRecipe.findMany({
      where: query,
    });

    if (!recipes || recipes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Recipe(s) not found" },
        { status: 404 }
      );
    }

    let deletedCount = 0;
    const deletedRecipes: any[] = [];

    for (const recipe of recipes) {
      if (permanent) {
        const deleteResult = await prisma.preparationRecipe.deleteMany({
          where: { id: recipe.id },
        });
        
        if (deleteResult.count > 0) {
          deletedCount++;
          deletedRecipes.push({
            id: recipe.id,
            itemName: recipe.itemName,
            deleted: true,
            permanent: true
          });
          
          await prisma.preparationLog.create({
            data: {
              id: randomUUID(),
              action: "PERMANENT_DELETE",
              recipeId: recipe.id,
              itemId: recipe.itemId,
              itemName: recipe.itemName,
              createdBy: userData?.name || userData?.email || "Unknown",
              createdAt: new Date(),
            },
          });
        }
      } else {
        const updateResult = await prisma.preparationRecipe.updateMany({
          where: { id: recipe.id },
          data: {
            isActive: false,
            updatedAt: new Date(),
            updatedBy: userData?.name || userData?.email || "Unknown",
          },
        });
        
        if (updateResult.count > 0) {
          deletedCount++;
          deletedRecipes.push({
            id: recipe.id,
            itemName: recipe.itemName,
            deleted: true,
            permanent: false,
            isActive: false
          });
          
          await prisma.preparationLog.create({
            data: {
              id: randomUUID(),
              action: "SOFT_DELETE",
              recipeId: recipe.id,
              itemId: recipe.itemId,
              itemName: recipe.itemName,
              createdBy: userData?.name || userData?.email || "Unknown",
              createdAt: new Date(),
            },
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
    const url = new URL(req.url);
    const recipeId = url.searchParams.get("id") || url.searchParams.get("recipeId");
    const action = url.searchParams.get("action") || "restore";

    if (!recipeId) {
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

    const recipe = await prisma.preparationRecipe.findUnique({
      where: { id: recipeId }
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

    const result = await prisma.preparationRecipe.updateMany({
      where: { id: recipeId },
      data: {
        isActive: true,
        updatedAt: new Date(),
        updatedBy: userData?.name || userData?.email || "Unknown",
      },
    });

    await prisma.preparationLog.create({
      data: {
        id: randomUUID(),
        action: "RESTORE",
        recipeId: recipeId,
        itemId: recipe.itemId,
        itemName: recipe.itemName,
        createdBy: userData?.name || userData?.email || "Unknown",
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Recipe restored successfully",
      modifiedCount: result.count,
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
