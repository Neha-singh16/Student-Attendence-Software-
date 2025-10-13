const mongoose = require('mongoose');

const ProcessedEventSchema = new mongoose.Schema({
  deviceId: { type: String, default: null },
  clientEventId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// ensure we don't process the same clientEventId from the same device twice
ProcessedEventSchema.index({ deviceId: 1, clientEventId: 1 }, { unique: true });

module.exports = mongoose.model('ProcessedEvent', ProcessedEventSchema);
