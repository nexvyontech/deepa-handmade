import { Schema, Types } from 'mongoose';

const checkItemSchema = new Schema(
  {
    status: { type: String, enum: ['PASS', 'FAIL'], required: true },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const qcResultSchema = new Schema(
  {
    qcId: { type: String, required: true, unique: true, trim: true },
    taskId: { type: Types.ObjectId, ref: 'ProductionTask' },
    orderId: { type: Types.ObjectId, ref: 'Order' },
    checklist: {
      size: { type: checkItemSchema },
      color: { type: checkItemSchema },
      weave: { type: checkItemSchema },
      handles: { type: checkItemSchema },
      qty: { type: checkItemSchema },
      other: [
        {
          label: { type: String, trim: true },
          status: { type: String, enum: ['PASS', 'FAIL'], required: true },
          note: { type: String, trim: true },
        },
      ],
    },
    result: { type: String, enum: ['PASS', 'FAIL', 'REWORK'], required: true },
    remarks: { type: String, trim: true },
    inspectedBy: { type: Types.ObjectId, ref: 'User', required: true },
    inspectedAt: { type: Date, default: Date.now },
  },
  { collection: 'qc-results', timestamps: true },
);

qcResultSchema.index({ taskId: 1 });
qcResultSchema.index({ orderId: 1 });
qcResultSchema.index({ result: 1, inspectedAt: 1 });

export { qcResultSchema };
export default qcResultSchema;
export const QC_RESULT_MODEL = 'QcResult';