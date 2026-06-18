/**
 * MongoDB Connection Diagnostic Script
 *
 * Run:
 * npx ts-node scripts/test-mongodb-connection.ts
 */

import dns from "dns/promises";

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);
import mongoose from "mongoose";
import dotenv from "dotenv";


dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

async function testMongoConnection() {
    console.log("\n🔍 MongoDB Connection Diagnostic\n");

    // 1. Check ENV
    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI is missing in .env");
        process.exit(1);
    }

    console.log("✅ MONGODB_URI loaded");
    console.log(
        "URI:",
        MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//****:****@")
    );

    // 2. Extract hostname
    const hostname = new URL(MONGODB_URI.replace("mongodb+srv://", "https://"))
        .hostname;

    console.log("\n🌐 MongoDB Host:");
    console.log(hostname);


    // 3. DNS SRV Test
    console.log("\n🔎 Testing DNS SRV lookup...");

    try {
        const srv = await dns.resolveSrv(`_mongodb._tcp.${hostname}`);

        console.log("✅ DNS SRV resolved:");
        console.log(srv);

    } catch (error: any) {
        console.error("❌ DNS SRV failed");
        console.error(error.message);

        console.log(`
Possible reasons:
1. Wrong MongoDB Atlas hostname
2. Cluster deleted or renamed
3. Internet DNS issue
4. VPN/firewall blocking MongoDB DNS
5. Wrong connection string copied
`);

        process.exit(1);
    }


    // 4. MongoDB Connection Test
    console.log("\n🔌 Connecting with Mongoose...");

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("✅ MongoDB Connected Successfully!");

        console.log({
            host: mongoose.connection.host,
            database: mongoose.connection.name,
            readyState: mongoose.connection.readyState,
        });


    } catch (error: any) {

        console.error("\n❌ MongoDB Connection Failed");

        console.error("Error name:", error.name);
        console.error("Message:", error.message);

        if (error.message.includes("authentication")) {
            console.log(`
Possible issue:
- Wrong username/password
- Database user does not exist
`);
        }

        if (error.message.includes("IP")) {
            console.log(`
Possible issue:
- Your IP is not whitelisted in MongoDB Atlas Network Access
`);
        }

        if (error.message.includes("timed out")) {
            console.log(`
Possible issue:
- Network Access restriction
- Firewall/VPN issue
`);
        }

    } finally {
        await mongoose.disconnect();
        console.log("\n🔚 Test finished");
        process.exit(0);
    }
}


testMongoConnection();