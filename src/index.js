import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { handleIncomingMessage } from "./conversation.js";

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const MAKE_INCOMING_SECRET = process.env.MAKE_INCOMING_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.join(__dirname, "../data/catalogo.pdf");

app.use(express.json({ limit: "2mb" }));

/*
  Ruta principal para comprobar que Render está funcionando.
*/
app.get("/", (req, res) => {
  res.status(200).send("Bot de perfumería funcionando ✅");
});

/*
  Ruta pública del catálogo.
  La usaremos después para enviarlo desde Make.
*/
app.get("/catalogo.pdf", (req, res) => {
  res.sendFile(catalogPath, (error) => {
    if (error) {
      console.error("Error enviando catálogo PDF:", error.message);
      if (!res.headersSent) {
        res.status(404).send("Catálogo no encontrado");
      }
    }
  });
});

/*
  Webhook directo de Meta.
  Se conserva por compatibilidad con las pruebas anteriores.
*/
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook de Meta verificado correctamente ✅");
    return res.status(200).send(challenge);
  }

  console.log("Error verificando webhook de Meta ❌");
  return res.sendStatus(403);
});

/*
  Recepción directa desde Meta.
  Solo se usaría si en algún momento vuelven a conectar Meta directamente.
*/
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (!body.object) {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === "text") {
      const phone = message.from;
      const text = message.text?.body || "";

      console.log(`Mensaje recibido desde Meta: ${phone} - ${text}`);

      res.sendStatus(200);

      handleIncomingMessage(phone, text).catch((error) => {
        console.error("Error procesando mensaje recibido desde Meta:", error);
      });

      return;
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Error en webhook directo de Meta:", error);
    return res.sendStatus(500);
  }
});

/*
  Nueva ruta para recibir mensajes desde Make.
  Make enviará aquí el número del cliente y el texto recibido.
*/
app.post("/make/incoming", (req, res) => {
  try {
    const receivedSecret = req.headers["x-make-secret"];

    if (!MAKE_INCOMING_SECRET || receivedSecret !== MAKE_INCOMING_SECRET) {
      console.log("Solicitud rechazada desde Make: secreto inválido.");
      return res.status(401).json({
        ok: false,
        error: "Unauthorized"
      });
    }

    const phone = String(
      req.body.phone ||
        req.body.sender ||
        req.body.from ||
        ""
    ).trim();

    const message = String(
      req.body.message ||
        req.body.text ||
        req.body.body ||
        ""
    ).trim();

    const messageId = String(req.body.messageId || "").trim();

    if (!phone || !message) {
      console.log("Evento recibido desde Make sin teléfono o sin mensaje.");
      return res.status(400).json({
        ok: false,
        error: "phone and message are required"
      });
    }

    console.log(`Mensaje recibido desde Make: ${phone} - ${message}`);

    /*
      Respondemos rápido a Make y el bot procesa el mensaje después.
      Esto ayuda a evitar tiempos de espera largos.
    */
    res.status(200).json({
      ok: true,
      received: true,
      messageId
    });

    handleIncomingMessage(phone, message).catch((error) => {
      console.error("Error procesando mensaje recibido desde Make:", error);
    });
  } catch (error) {
    console.error("Error en endpoint /make/incoming:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: "Internal server error"
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Bot corriendo en puerto ${PORT}`);
  console.log(`Modo de envío: ${process.env.WHATSAPP_TRANSPORT || "meta"}`);
});