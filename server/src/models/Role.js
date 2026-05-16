import mongoose from 'mongoose';

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  RIDER: 'rider',
  CLIENT: 'client',
});

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, enum: Object.values(ROLES) },
    description: { type: String, default: '' },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

export const Role = mongoose.model('Role', roleSchema);
