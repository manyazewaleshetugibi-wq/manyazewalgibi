import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ============= HELPER FUNCTIONS =============

function generateTemplateCode(): string {
    const prefix = 'MP';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}${month}-${randomNum}`;
}

// ============= GET - Fetch all templates =============
export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db("gold");
        const collection = db.collection("meal_plan_templates");
        
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get("id");
        
        // Get single template by ID
        if (id) {
            if (!ObjectId.isValid(id)) {
                return NextResponse.json(
                    { success: false, message: "Invalid template ID" },
                    { status: 400 }
                );
            }
            
            const template = await collection.findOne({ _id: new ObjectId(id) });
            
            if (!template) {
                return NextResponse.json(
                    { success: false, message: "Template not found" },
                    { status: 404 }
                );
            }
            
            return NextResponse.json({ success: true, data: template });
        }
        
        // Get all templates
        const templates = await collection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();
        
        return NextResponse.json({
            success: true,
            data: templates,
            total: templates.length
        });
        
    } catch (error: any) {
        console.error("GET /api/meal-planner/templates Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// ============= POST - Create new template =============
export async function POST(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db("gold");
        const collection = db.collection("meal_plan_templates");
        
        const body = await req.json();
        
        console.log("Received template data:", JSON.stringify(body, null, 2));
        
        // Validate required fields
        if (!body.name) {
            return NextResponse.json(
                { success: false, message: "Template name is required" },
                { status: 400 }
            );
        }
        
        // Generate or use existing template code
        let templateCode = body.templateCode;
        if (!templateCode) {
            templateCode = generateTemplateCode();
            // Ensure unique template code
            let isUnique = false;
            let attempts = 0;
            while (!isUnique && attempts < 5) {
                const existing = await collection.findOne({ templateCode });
                if (!existing) {
                    isUnique = true;
                } else {
                    templateCode = generateTemplateCode();
                    attempts++;
                }
            }
        }
        
        // Clean and prepare the weekly schedule
        const weeklySchedule: Record<string, any> = {};
        if (body.weeklySchedule) {
            for (const [day, schedule] of Object.entries(body.weeklySchedule)) {
                weeklySchedule[day] = {
                    day: day,
                    mealPeriodDescriptions: {
                        breakfast: (schedule as any).mealPeriodDescriptions?.breakfast || { description: '', tips: '', hydration: '' },
                        morningSnack: (schedule as any).mealPeriodDescriptions?.morningSnack || { description: '', tips: '', hydration: '' },
                        lunch: (schedule as any).mealPeriodDescriptions?.lunch || { description: '', tips: '', hydration: '' },
                        eveningSnack: (schedule as any).mealPeriodDescriptions?.eveningSnack || { description: '', tips: '', hydration: '' },
                        dinner: (schedule as any).mealPeriodDescriptions?.dinner || { description: '', tips: '', hydration: '' },
                        nightMeal: (schedule as any).mealPeriodDescriptions?.nightMeal || { description: '', tips: '', hydration: '' },
                    },
                    meals: {
                        breakfast: (schedule as any).meals?.breakfast || [],
                        morningSnack: (schedule as any).meals?.morningSnack || [],
                        lunch: (schedule as any).meals?.lunch || [],
                        eveningSnack: (schedule as any).meals?.eveningSnack || [],
                        dinner: (schedule as any).meals?.dinner || [],
                        nightMeal: (schedule as any).meals?.nightMeal || [],
                    }
                };
            }
        }
        
        // Prepare template data
        const templateData = {
            templateCode,
            name: body.name,
            description: body.description || "",
            criteria: {
                minAge: body.criteria?.minAge || 18,
                maxAge: body.criteria?.maxAge || 30,
                minWeight: body.criteria?.minWeight || 50,
                maxWeight: body.criteria?.maxWeight || 70,
                minHeight: body.criteria?.minHeight || 150,
                maxHeight: body.criteria?.maxHeight || 170,
                gender: body.criteria?.gender || "any",
                fitnessGoal: body.criteria?.fitnessGoal || "fatLoss",
                activityLevel: body.criteria?.activityLevel || "moderate",
            },
            nutritionalTargets: {
                dailyCalories: body.nutritionalTargets?.dailyCalories || 2000,
                dailyProtein: body.nutritionalTargets?.dailyProtein || 150,
                dailyCarbs: body.nutritionalTargets?.dailyCarbs || 200,
                dailyFat: body.nutritionalTargets?.dailyFat || 65,
                dailyWater: body.nutritionalTargets?.dailyWater || 2500,
            },
            weeklySchedule: weeklySchedule,
            mealPrepTips: (body.mealPrepTips || []).filter((tip: string) => tip && tip.trim() !== ""),
            groceryTips: (body.groceryTips || []).filter((tip: string) => tip && tip.trim() !== ""),
            notesForClient: body.notesForClient || "",
            status: "active",
            usageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        console.log("Saving template data:", JSON.stringify(templateData, null, 2));
        
        const result = await collection.insertOne(templateData);
        
        const createdTemplate = await collection.findOne({ _id: result.insertedId });
        
        return NextResponse.json({
            success: true,
            data: createdTemplate,
            message: "Meal plan template created successfully"
        }, { status: 201 });
        
    } catch (error: any) {
        console.error("POST /api/meal-planner/templates Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

// ============= DELETE - Delete template =============
export async function DELETE(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const id = url.pathname.split('/').pop();
        
        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, message: "Valid template ID is required" },
                { status: 400 }
            );
        }
        
        const client = await clientPromise;
        const db = client.db("gold");
        const collection = db.collection("meal_plan_templates");
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, message: "Template not found" },
                { status: 404 }
            );
        }
        
        return NextResponse.json({
            success: true,
            message: "Meal plan template deleted successfully"
        });
        
    } catch (error: any) {
        console.error("DELETE /api/meal-planner/templates Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
