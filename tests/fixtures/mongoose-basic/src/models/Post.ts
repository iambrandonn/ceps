import mongoose, { Schema } from 'mongoose';

const postSchema = new Schema({
  title: String,
  content: String,
  author: { type: Schema.Types.ObjectId, ref: 'User' }
});

export const Post = mongoose.model('Post', postSchema);
