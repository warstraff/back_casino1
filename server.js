import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const messages = new Map(); // IP -> array of messages
const replies = new Map(); // IP -> array of replies
let lastUpdateId = 0;

const botToken = process.env.BOT_TOKEN || "8489048462:AAHtnirplnr_vqt2Wy4kV4C3xNiQgNTcrqs";
const chatId = process.env.CHAT_ID || "-1003718222394";

// Poll for bot updates
setInterval(async () => {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}`);
    const data = await response.json();
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;
        if (update.message && update.message.chat.id.toString() === chatId) {
          const message = update.message;
          if (message.reply_to_message && message.reply_to_message.text) {
            const repliedText = message.reply_to_message.text;
            console.log(`Replied text: "${repliedText}"`);
            const userIdMatch = repliedText.match(/UserID: ([^)]+)/);
            console.log(`UserID match: ${userIdMatch}`);
            if (userIdMatch) {
              const userId = userIdMatch[1];
              const reply = message.text;
              // Send to /reply
              replies.set(userId, replies.get(userId) || []);
              replies.get(userId).push({ text: reply, timestamp: new Date(), from: 'admin' });
              console.log(`Reply to ${userId}: ${reply}, replies size: ${replies.size}, has userId: ${replies.has(userId)}, replies for userId: ${replies.get(userId)?.length || 0}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error polling bot:", error);
  }
}, 5000);

app.post('/message', (req, res) => {
  const { message, userId } = req.body;
  if (!messages.has(userId)) {
    messages.set(userId, []);
  }
  messages.get(userId).push({ text: message, timestamp: new Date(), from: 'user' });
  console.log(`Message from ${userId}: ${message}`);
  res.json({ success: true });
});

app.get('/messages', (req, res) => {
  const userId = req.query.userId;
  console.log(`UserId from query: "${userId}", type: ${typeof userId}`);
  const userMessages = messages.get(userId) || [];
  const userReplies = replies.get(userId) || [];
  console.log(`Replies get(${userId}): ${userReplies.length}, has: ${replies.has(userId)}`);
  const all = [...userMessages, ...userReplies].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  console.log(`Messages for ${userId}: messages=${userMessages.length}, replies=${userReplies.length}, total=${all.length}`);
  res.json(all);
});

app.post('/reply', (req, res) => {
  const { reply, ip } = req.body;
  if (!replies.has(ip)) {
    replies.set(ip, []);
  }
  replies.get(ip).push({ text: reply, timestamp: new Date(), from: 'admin' });
  console.log(`Reply to ${ip}: ${reply}`);
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});