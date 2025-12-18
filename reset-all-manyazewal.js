// reset-all-manyazewal.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGODB_URI = "mongodb+srv://aweke2011:awe2011@gold.av49bjz.mongodb.net/?retryWrites=true&w=majority";

async function resetAllManyazewalUsers() {
  console.log("Resetting all Manyazewal users with correct passwords...");
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db("gold");
    
    // User credentials from your documentation
    const users = [
      { email: "pos@manyazewal.et", password: "FGrSaCTfi8Lj", name: "POS System", role: "pos" },
      { email: "kitchen@manyazewal.et", password: "S7gk8dyYmuMI", name: "Kitchen System", role: "kitchen" },
      { email: "fb@manyazewal.et", password: "ogEbN_LhFZT3", name: "Food & Beverage Manager", role: "fb" },
      { email: "marketing@manyazewal.et", password: "LMtIINw7u1V8", name: "Marketing Manager", role: "marketing" },
      { email: "admin@manyazewal.et", password: "IKig_d3fv5Ka", name: "System Administrator", role: "admin" },
      { email: "finance@manyazewal.et", password: "Wg#(m&s%+jU8", name: "Finance Manager", role: "finance" },
      { email: "stock_manager@manyazewal.et", password: "@&yD5AU+n435", name: "Stock Manager", role: "stock_manager" }
    ];
    
    console.log("Updating passwords for all users...");
    
    for (const user of users) {
      const hash = await bcrypt.hash(user.password, 10);
      
      const result = await db.collection("users").updateOne(
        { email: user.email },
        { 
          $set: { 
            password: hash,
            name: user.name,
            role: user.role,
            status: "active",
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`${user.email}: ${result.modifiedCount > 0 ? '✅ Updated' : 'No changes'}`);
    }
    
    console.log("\n✅ All passwords updated successfully!");
    console.log("\n🔑 TEST LOGIN CREDENTIALS:");
    console.log("==========================");
    
    users.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    });
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

resetAllManyazewalUsers().catch(console.error);