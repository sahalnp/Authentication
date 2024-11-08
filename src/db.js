import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1); // Exit the application if the connection fails
    }
};

// Define the user schema and model
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    password: { type: String, required: true }
});

// Using `collection` as the model name
const collection = mongoose.model('collection', userSchema);

export { connectDB, collection };
