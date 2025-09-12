import mongoose from "mongoose";

export const connectDB = async () => {
    try{
        const connect = await mongoose.connect(process.env.MONGODB_URI as string);
        console.log(`MongoDB Connected: ${connect.connection.host}`);
    }catch(err){
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}