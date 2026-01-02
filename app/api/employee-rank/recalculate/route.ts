// app/api/employee-rank/recalculate/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const COLLECTION_NAME = "employee_rank";

// Define types for bulk operations
interface BulkWriteOperation {
  updateOne: {
    filter: { _id: ObjectId };
    update: {
      $set: {
        rank: number;
        roleRank: number;
        lastUpdated: Date;
        globalRank?: number;
      };
    };
  };
}

interface EmployeeRank {
  _id: ObjectId;
  name: string;
  role: string;
  completedOrders: number;
  points: number;
  performanceScore?: number;
  attendance?: number;
  efficiency?: number;
  globalRank?: number;
}

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    
    // Get all employee ranks
    const allRanks = await db.collection(COLLECTION_NAME).find({}).toArray();
    
    if (allRanks.length === 0) {
      return NextResponse.json({
        message: "No employee records found to calculate ranks",
        updatedCount: 0
      }, { status: 200 });
    }
    
    // Group employees by role
    const employeesByRole: Record<string, EmployeeRank[]> = {};
    
    allRanks.forEach((emp: any) => {
      const role = emp.role || 'unknown';
      if (!employeesByRole[role]) {
        employeesByRole[role] = [];
      }
      
      // Use only completedOrders for ranking
      const completedOrders = emp.completedOrders || 0;
      
      employeesByRole[role].push({
        _id: emp._id,
        name: emp.name,
        role: emp.role,
        completedOrders,
        points: emp.points || 0,
        performanceScore: emp.performanceScore || 0,
        attendance: emp.attendance || 0,
        efficiency: emp.efficiency || 0
      });
    });
    
    const allBulkOps: BulkWriteOperation[] = [];
    const roleResults: Record<string, any> = {};
    
    // Calculate ranks within each role group based ONLY on completedOrders
    for (const [role, employees] of Object.entries(employeesByRole)) {
      if (employees.length === 0) continue;
      
      // Sort employees in this role by completedOrders (descending), then by points (descending)
      employees.sort((a: EmployeeRank, b: EmployeeRank) => {
        if (b.completedOrders !== a.completedOrders) {
          return b.completedOrders - a.completedOrders;
        }
        // Tie-breaker: points
        return b.points - a.points;
      });
      
      // Now assign ranks with proper handling for ties
      let currentRank = 1;
      
      employees.forEach((emp: EmployeeRank, index: number) => {
        // Check if this employee has fewer orders than the previous one
        if (index > 0 && emp.completedOrders < employees[index - 1].completedOrders) {
            currentRank = index + 1;
        }
        
        // Push bulk operation with the calculated rank
        allBulkOps.push({
          updateOne: {
            filter: { _id: emp._id },
            update: {
              $set: {
                rank: currentRank, // Rank within role (handles ties)
                roleRank: currentRank, // Same as rank
                lastUpdated: new Date()
              }
            }
          }
        });
        
        // Store role results
        if (index === 0) {
          roleResults[role] = {
            totalEmployees: employees.length,
            topPerformer: emp.name || "None",
            topCompletedOrders: emp.completedOrders || 0,
            averageCompletedOrders: (employees.reduce((sum, e) => sum + (e.completedOrders || 0), 0) / employees.length).toFixed(1)
          };
        }
      });
    }
    
    // Calculate global ranks for comparison (also based on completedOrders only)
    const allEmployees: EmployeeRank[] = allRanks.map((emp: any) => ({
      _id: emp._id,
      name: emp.name,
      role: emp.role,
      completedOrders: emp.completedOrders || 0,
      points: emp.points || 0,
      performanceScore: emp.performanceScore || 0,
      attendance: emp.attendance || 0,
      efficiency: emp.efficiency || 0
    }));
    
    // Sort all employees globally
    allEmployees.sort((a: EmployeeRank, b: EmployeeRank) => {
      if (b.completedOrders !== a.completedOrders) {
        return b.completedOrders - a.completedOrders;
      }
      return b.points - a.points;
    });
    
    // Assign global ranks with tie handling
    let globalCurrentRank = 1;
    
    allEmployees.forEach((emp: EmployeeRank, index: number) => {
      if (index > 0 && emp.completedOrders < allEmployees[index - 1].completedOrders) {
        globalCurrentRank = index + 1;
      }
      
      // Find the bulk operation for this employee and add global rank
      const existingOpIndex = allBulkOps.findIndex((op: BulkWriteOperation) => 
        op.updateOne.filter._id.toString() === emp._id.toString()
      );
      
      if (existingOpIndex !== -1) {
        allBulkOps[existingOpIndex].updateOne.update.$set.globalRank = globalCurrentRank;
      }
    });
    
    // Update all records
    if (allBulkOps.length > 0) {
      await db.collection(COLLECTION_NAME).bulkWrite(allBulkOps);
    }
    
    // Get top performers from each role for response
    const topPerformersByRole = Object.entries(employeesByRole)
      .map(([role, employees]) => {
        if (employees.length === 0) return null;
        
        // Sort to find top performer
        const sorted = [...employees].sort((a: EmployeeRank, b: EmployeeRank) => {
          if (b.completedOrders !== a.completedOrders) {
            return b.completedOrders - a.completedOrders;
          }
          return (b.performanceScore || 0) - (a.performanceScore || 0);
        });
        
        return {
          role,
          topPerformer: sorted[0]?.name || "None",
          completedOrders: sorted[0]?.completedOrders || 0,
          rank: 1, // Always rank 1 for top performer
          roleEmployeeCount: employees.length
        };
      })
      .filter(item => item !== null && item.topPerformer !== "None");
    
    // Get global top 3 performers
    const globalTopPerformers = allEmployees.slice(0, 3).map((emp: EmployeeRank, index: number) => ({
      name: emp.name,
      role: emp.role,
      completedOrders: emp.completedOrders,
      rank: 1, // Rank 1 in the global top 3 list
      globalRank: emp.globalRank || 0
    }));
    
    // Get role distribution statistics
    const roleDistribution = Object.entries(employeesByRole).map(([role, employees]) => ({
      role,
      employeeCount: employees.length,
      avgCompletedOrders: (employees.reduce((sum, e) => sum + (e.completedOrders || 0), 0) / employees.length).toFixed(1),
      maxCompletedOrders: Math.max(...employees.map((e: EmployeeRank) => e.completedOrders || 0))
    }));
    
    return NextResponse.json({
      message: "Ranks recalculated successfully based on completedOrders",
      updatedCount: allBulkOps.length,
      totalEmployees: allRanks.length,
      rolesProcessed: Object.keys(employeesByRole).length,
      topPerformersByRole,
      globalTopPerformers,
      roleDistribution,
      roleStatistics: roleResults,
      note: "Employees ranked within their respective roles based on completedOrders. Ties are handled properly with performance metrics as tiebreakers."
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error recalculating ranks:", error);
    return NextResponse.json(
      { message: "Error recalculating ranks", error: String(error) },
      { status: 500 }
    );
  }
}