import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorName: String,
    actorRole: String,
    action: { type: String, required: true, index: true }, // e.g. "product.create", "order.status.update"
    target: {
      kind: String, // e.g. "Product", "Order", "User", "Setting"
      id: mongoose.Schema.Types.ObjectId,
      label: String, // human-friendly name/ref for the log
    },
    method: String, // HTTP method
    path: String, // HTTP path
    ip: String,
    userAgent: String,
    metadata: { type: mongoose.Schema.Types.Mixed }, // diff snippets, etc.
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
