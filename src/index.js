import express from "express";
import dotenv from "dotenv";
import { handleIncomingMessage } from "./conversation.js";

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).send("Bot de perfumería funcionando ✅");
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

    if (body.object) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === "text") {
        const phone = message.from;
        const text = message.text?.body || "";

        console.log(`Mensaje recibido: ${phone} ${text}`);

        await handleIncomingMessage(phone, text);
      }

      return res.sendStatus(200);
    }

    return res.sendStatus(404);
  } catch (error) {
    console.error("Error en webhook:", error);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Bot corriendo en puerto ${PORT}`);
});