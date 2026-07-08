import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
    if (Object.keys(serviceAccount).length > 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully.");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set or is empty. Real webhook will not be able to write to Firestore.");
    }
  } catch (err) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_KEY", err);
  }
}

const db = getApps().length ? getFirestore() : null;

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
// We use lazy initialization to avoid crashing on startup if the API key is not yet set
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set. AI replies will be fallback-simulated.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. API: Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. API: WhatsApp Send Message Proxy
app.post("/api/whatsapp/send", async (req, res) => {
  const { accountToken, phoneNumberId, to, messageType, text, mediaUrl } = req.body;

  if (!to) {
    return res.status(400).json({ error: "Recipient phone number 'to' is required." });
  }

  // If there's an actual Meta Account Token & Phone Number ID, we perform a real API call!
  if (accountToken && phoneNumberId && accountToken !== "MOCK_TOKEN") {
    try {
      let body: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
      };

      if (messageType === "image" && mediaUrl) {
        body.type = "image";
        body.image = { link: mediaUrl };
      } else if (messageType === "video" && mediaUrl) {
        body.type = "video";
        body.video = { link: mediaUrl };
      } else if (messageType === "audio" && mediaUrl) {
        body.type = "audio";
        body.audio = { link: mediaUrl };
      } else {
        body.type = "text";
        body.text = { body: text || "" };
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accountToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error?.message || "WhatsApp API Error");
      }

      return res.json({ success: true, apiResponse: responseData });
    } catch (err: any) {
      console.error("Meta WhatsApp API Proxy Error:", err);
      return res.status(500).json({ error: err.message || "Failed to deliver message via Meta API" });
    }
  }

  return res.status(400).json({ error: "Missing accountToken or phoneNumberId for real WhatsApp API delivery." });
});

// 3. API: Telegram Notifications Agent
app.post("/api/telegram/notify", async (req, res) => {
  const { botToken, chatId, message } = req.body;

  if (!botToken || !chatId || !message) {
    return res.status(400).json({ error: "botToken, chatId, and message are required." });
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.description || "Telegram API Error");
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Telegram Notifications proxy error:", err);
    return res.status(500).json({ error: err.message || "Failed to send Telegram notification" });
  }
});

// 4. API: Webhook para Meta WhatsApp (Verificación y Recepción)
const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "instacli_wp_secure_token";

app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === META_WEBHOOK_VERIFY_TOKEN) {
    console.log("Meta Webhook verified successfully.");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
      const contactPhone = body.entry[0].changes[0].value.contacts[0].wa_id;
      const contactName = body.entry[0].changes[0].value.contacts[0].profile.name;
      const message = body.entry[0].changes[0].value.messages[0];

      let incomingText = "";
      if (message.type === "text") {
        incomingText = message.text.body;
      } else {
        incomingText = `[Received ${message.type} attachment]`;
      }

      console.log(`Received message from ${contactName} (${contactPhone}): ${incomingText}`);

      if (db) {
        try {
          // 1. Find account based on phoneNumberId
          const accountsRef = db.collection('accounts');
          const accountsQuery = await accountsRef.where('phoneNumberId', '==', phoneNumberId).get();

          if (accountsQuery.empty) {
             console.log("Webhook received message for an unknown account:", phoneNumberId);
             return res.sendStatus(200);
          }
          const accountId = accountsQuery.docs[0].id;

          // 2. Find or create Chat
          const chatsRef = db.collection('chats');
          const chatQuery = await chatsRef.where('contactPhone', '==', `+${contactPhone}`).where('accountId', '==', accountId).get();

          let chatId = "";
          let isAIActive = true;

          if (chatQuery.empty) {
             const newChatRef = await chatsRef.add({
                accountId: accountId,
                contactName: contactName || contactPhone,
                contactPhone: `+${contactPhone}`,
                contactAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(contactName || contactPhone)}`,
                lastMessage: incomingText,
                lastMessageTime: FieldValue.serverTimestamp(),
                lastOnline: 'Online',
                tags: ['New Lead'],
                unreadCount: 1,
                stage: 1,
                isAIActive: true
             });
             chatId = newChatRef.id;
          } else {
             chatId = chatQuery.docs[0].id;
             isAIActive = chatQuery.docs[0].data().isAIActive !== false;

             await chatsRef.doc(chatId).update({
                lastMessage: incomingText,
                lastMessageTime: FieldValue.serverTimestamp(),
                unreadCount: FieldValue.increment(1)
             });
          }

          // 3. Save Message
          await db.collection('messages').add({
             chatId: chatId,
             accountId: accountId,
             sender: 'contact',
             text: incomingText,
             type: message.type === 'text' ? 'text' : message.type,
             timestamp: FieldValue.serverTimestamp(),
             status: 'seen' // From CRM perspective
          });

          // 4. Real AI Automation Pipeline
          if (isAIActive) {
            const agentsQuery = await db.collection('agents').where('isActive', '==', true).limit(1).get();
            if (!agentsQuery.empty) {
              const agentData = agentsQuery.docs[0].data();
              const objectivePrompt = agentData.aiPrompt;
              const customApiKey = agentData.geminiApiKey;

              // Fetch recent context (last 10 messages)
              const msgsQuery = await db.collection('messages')
                .where('chatId', '==', chatId)
                .orderBy('timestamp', 'asc')
                .limitToLast(10)
                .get();

              const history = msgsQuery.docs.map(d => ({
                sender: d.data().sender,
                text: d.data().text || ''
              }));

              let ai = getGeminiClient();
              if (customApiKey && customApiKey.trim().length > 10) {
                ai = new GoogleGenAI({
                  apiKey: customApiKey,
                  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
                });
              }

              if (ai) {
                const systemInstruction = `
You are an expert, highly empathetic, and strategic WhatsApp CRM Sales Agent representing Instacli WP.
Your absolute goal is to lead the conversation towards the following objective:
"${objectivePrompt || "Interesar al cliente en nuestros servicios de automatización y agendar una llamada de 10 minutos."}"

Guidelines to follow:
- Respond in Spanish, since WhatsApp chats are primarily in Spanish.
- Respond as humanly as possible (keep replies relatively short, conversational, use natural emojis sparingly, and do not use robotic formatting).
- Use context and adapt dynamically based on what works.

Conversation History so far:
${history.map((m: any) => `${m.sender === 'me' ? 'Agent (You)' : 'Client'}: ${m.text}`).join("\n")}

Respond to the last message from the Client. Produce ONLY your next response message.
`;
                try {
                  const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: systemInstruction,
                  });

                  const replyText = response.text ? response.text.trim() : "";

                  if (replyText) {
                    const accountToken = accountsQuery.docs[0].data().token;

                    // Send via Meta API
                    const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                      method: "POST",
                      headers: {
                        "Authorization": `Bearer ${accountToken}`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: contactPhone,
                        type: "text",
                        text: { body: replyText }
                      })
                    });

                    if (metaResponse.ok) {
                      // Save reply to DB
                      await db.collection('messages').add({
                        chatId: chatId,
                        accountId: accountId,
                        sender: 'me',
                        text: replyText,
                        type: 'text',
                        timestamp: FieldValue.serverTimestamp(),
                        status: 'sent'
                      });

                      // Update Chat Last Message
                      await chatsRef.doc(chatId).update({
                        lastMessage: replyText,
                        lastMessageTime: FieldValue.serverTimestamp(),
                      });

                      // Check if message implies high interest / meeting scheduled
                      const textLower = replyText.toLowerCase();
                      if (textLower.includes('agend') || textLower.includes('calendly') || textLower.includes('llamada')) {
                        try {
                          const settingsSnap = await db.collection('globalSettings').doc('config').get();
                          if (settingsSnap.exists) {
                            const settings = settingsSnap.data();
                            if (settings && settings.telegramEnabled && settings.telegramToken) {
                              const alertMsg = `🎯 <b>¡Lead Calificado Interesado!</b>\n\n👤 <b>Cliente:</b> ${contactName || contactPhone}\n📞 <b>Teléfono:</b> ${contactPhone}\n🏷️ <b>Estado:</b> Interesado / Listo para agendar\n\n<i>Instacli WP - CRM Automations Agent 🤖</i>`;

                              await fetch('http://localhost:3000/api/telegram/notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  botToken: settings.telegramToken,
                                  chatId: settings.telegramChatId,
                                  message: alertMsg
                                })
                              }).catch(e => console.error("Internal Telegram notify error:", e));
                            }
                          }
                        } catch (e) {
                          console.error("Error triggering Telegram alert from webhook:", e);
                        }
                      }
                    } else {
                      const errData = await metaResponse.json();
                      console.error("Meta API send failed in AI pipeline:", errData);
                    }
                  }
                } catch (aiErr) {
                  console.error("AI Generation failed:", aiErr);
                }
              }
            }
          }

        } catch (dbErr) {
           console.error("Firebase Webhook Processing Error:", dbErr);
        }
      }

    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// Serve static assets in production, or mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start the server locally (Vercel uses Serverless Functions)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
