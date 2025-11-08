import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  age: Number,
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }]
});

export const User = mongoose.model('User', userSchema);
