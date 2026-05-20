import express from "express";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./conversation.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Prueba segura para confirmar que sí está leyendo el .env
console.log("TOKEN CARGADO:", process.env.WHATSAPP_TOKEN ? process.env.WHATSAPP_TOKEN.slice(0, 12) + "..." : "NO HAY TOKEN");
console.log("PHONE ID:", process.env.WHATSAPP_PHONE_NUMBER_ID || "NO HAY PHONE ID");

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot de perfumería funcionando ✅");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente ✅");
    return res.status(200).send(challenge);
  }

  console.log("Error verificando webhook ❌");
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    const message = messages[0];
    const phone = message.from;

    let text = "";

    if (message.type === "text") {
      text = message.text?.body || "";
    }

    if (message.type !== "text") {
      await handleIncomingMessage(
        phone,
        "menu"
      );

      return res.sendStatus(200);
    }

    console.log("Mensaje recibido:", phone, text);

    await handleIncomingMessage(phone, text);

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Bot corriendo en puerto ${PORT}`);
});