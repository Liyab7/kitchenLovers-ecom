import mongoose from 'mongoose';

const searchQuerySchema = new mongoose.Schema(
  {
    query: { type: String, required: true, lowercase: true, trim: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

searchQuerySchema.index({ createdAt: -1 });

export const SearchQuery = mongoose.model('SearchQuery', searchQuerySchema);
