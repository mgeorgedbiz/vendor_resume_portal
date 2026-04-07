const mongoose = require('mongoose');

const pipelineHistorySchema = new mongoose.Schema({
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  fromStatus: String,
  toStatus: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

pipelineHistorySchema.index({ candidate: 1 });
pipelineHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('PipelineHistory', pipelineHistorySchema);
