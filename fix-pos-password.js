// fix-pos-password.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGODB_URI = "mongodb+srv://aweke2011:awe2011@gold.av49bjz.mongodb.net/?retryWrites=true&w=majority";

async function fixPosPassword() {
  console.log("Fixing POS user password...");
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    
    const db = client.db("gold");
    
    // Find the POS user
    const posUser = await db.collection("users").findOne({ 
      email: "pos@manyazewal.et" 
    });
    
    if (!posUser) {
      console.log("❌ POS user not found!");
      return;
    }
    
    console.log(`Found POS user: ${posUser.name}`);
    console.log(`Current password hash: ${posUser.password.substring(0, 30)}...`);
    
    // Hash the correct password
    const correctPassword = "FGrSaCTfi8Lj";
    console.log(`Correct password: ${correctPassword}`);
    console.log(`Password length: ${correctPassword.length} characters`);
    
    const newHash = await bcrypt.hash(correctPassword, 10);
    
    // Update the password
    const result = await db.collection("users").updateOne(
      { email: "pos@manyazewal.et" },
      { $set: { password: newHash } }
    );
    
    console.log(`✅ Password updated successfully!`);
    console.log(`New hash: ${newHash.substring(0, 30)}...`);
    
    // Verify the password works
    const isMatch = await bcrypt.compare(correctPassword, newHash);
    console.log(`🔐 Password verification: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

fixPosPassword().catch(console.error);// fix-pos-password.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const MONGODB_URI = "mongodb+srv://aweke2011:awe2011@gold.av49bjz.mongodb.net/?retryWrites=true&w=majority";

async function fixPosPassword() {
  console.log("Fixing POS user password...");
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    
    const db = client.db("gold");
    
    // Find the POS user
    const posUser = await db.collection("users").findOne({ 
      email: "pos@manyazewal.et" 
    });
    
    if (!posUser) {
      console.log("❌ POS user not found!");
      return;
    }
    
    console.log(`Found POS user: ${posUser.name}`);
    console.log(`Current password hash: ${posUser.password.substring(0, 30)}...`);
    
    // Hash the correct password
    const correctPassword = "FGrSaCTfi8Lj";
    console.log(`Correct password: ${correctPassword}`);
    console.log(`Password length: ${correctPassword.length} characters`);
    
    const newHash = await bcrypt.hash(correctPassword, 10);
    
    // Update the password
    const result = await db.collection("users").updateOne(
      { email: "pos@manyazewal.et" },
      { $set: { password: newHash } }
    );
    
    console.log(`✅ Password updated successfully!`);
    console.log(`New hash: ${newHash.substring(0, 30)}...`);
    
    // Verify the password works
    const isMatch = await bcrypt.compare(correctPassword, newHash);
    console.log(`🔐 Password verification: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.close();
  }
}

fixPosPassword().catch(console.error);