import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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

  // Fallback / Mock delivery (if using a mock account)
  return res.json({
    success: true,
    simulated: true,
    messageId: "wamid.HBgM" + Math.random().toString(36).substring(2, 12).toUpperCase(),
    status: "delivered"
  });
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

// 4. API: AI Agent Chat Reply (Gemini API Integration)
app.post("/api/gemini/agent-reply", async (req, res) => {
  const { messages, objectivePrompt, learningLogs, customApiKey } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required." });
  }

  try {
    // 1. Determine key to use (custom key provided by user or backend env variable)
    let ai = getGeminiClient();

    // If user provided their own key, initialize dynamic client
    if (customApiKey && customApiKey.trim().length > 10) {
      ai = new GoogleGenAI({
        apiKey: customApiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });
    }

    if (!ai) {
      // Return a simulated high-quality AI text fallback if key is completely missing
      const mockReplies = [
        "¡Hola! Sí, por supuesto. Contamos con soluciones personalizadas de CRM para optimizar tus conversaciones de WhatsApp y potenciar tus ventas en un 150%. ¿Te interesaría agendar una breve llamada de 10 minutos esta semana?",
        "Hola, entiendo perfectamente tu duda. Con Instacli WP puedes automatizar flujos completos con IA sin perder el toque humano. ¿Cuál es el principal reto de comunicación que tienes hoy en tu negocio?",
        "¡Perfecto! Agendemos entonces. Me parece excelente que quieras potenciar tu canal de WhatsApp. ¿Te queda mejor por la mañana o por la tarde?",
        "Muchas gracias por tu respuesta. Entiendo que por ahora no sea tu prioridad. Igualmente, si en el futuro buscas escalar tu embudo de ventas en WhatsApp, no dudes en escribirnos.",
      ];
      // Basic rules: if text has calendar/time words, request call. If "uninterested", say thanks.
      const lastText = messages[messages.length - 1]?.text?.toLowerCase() || "";
      let textResponse = mockReplies[1];
      if (lastText.includes("no") || lastText.includes("interesa") || lastText.includes("gracias")) {
        textResponse = mockReplies[3];
      } else if (lastText.includes("llamada") || lastText.includes("reunión") || lastText.includes("agendar") || lastText.includes("hora")) {
        textResponse = mockReplies[2];
      } else if (lastText.includes("hola") || lastText.includes("buen")) {
        textResponse = mockReplies[0];
      }
      return res.json({ reply: textResponse, model: "mock-fallback" });
    }

    // Build the structural prompt with Gemini
    const systemInstruction = `
You are an expert, highly empathetic, and strategic WhatsApp CRM Sales Agent representing Instacli WP.
Your absolute goal is to lead the conversation towards the following objective:
"${objectivePrompt || "Interesar al cliente en nuestros servicios de automatización y agendar una llamada de 10 minutos."}"

Guidelines to follow:
- Respond in Spanish, since WhatsApp chats are primarily in Spanish.
- Respond as humanly as possible (keep replies relatively short, conversational, use natural emojis sparingly, and do not use robotic formatting).
- Use context and adapt dynamically based on what works.
- Keep learning from past interactions:
  ${learningLogs && learningLogs.length > 0 ? "Past learned behaviors:\n" + learningLogs.join("\n") : "Always seek the highest engagement, handle objections with poise, and convert interested leads into booked meetings."}

Conversation History so far:
${messages.map((m: any) => `${m.sender === 'me' ? 'Agent (You)' : 'Client'}: ${m.text}`).join("\n")}

Respond to the last message from the Client. Produce ONLY your next response message.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemInstruction,
    });

    const replyText = response.text || "¡Hola! ¿Cómo te va? Me gustaría contarte cómo podemos optimizar tus ventas.";
    return res.json({ reply: replyText.trim(), model: "gemini-2.5-flash" });

  } catch (err: any) {
    console.error("Gemini AI Agent Error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate AI agent response" });
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
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
