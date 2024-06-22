const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  room: {
    type: String,
    required: true,
  },
  sentiment: {
    type: String,
    required: true,
  },
  emoji: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Message', MessageSchema);
