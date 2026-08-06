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

/*
  Almacena temporalmente los IDs de mensajes procesados.
  Evita que Make o Meta procesen dos veces el mismo mensaje.
*/
const processedMessageIds = new Map();

const MESSAGE_ID_TTL_MS = 24 * 60 * 60 * 1000;

app.use(express.json({ limit: "2mb" }));

/*
  Convierte una hora HH:mm a minutos desde las 00:00.
*/
function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

/*
  Obtiene la hora actual en la zona configurada.
*/
function getCurrentTimeInTimezone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date());

    const hour = Number(
      parts.find((part) => part.type === "hour")?.value
    );

    const minute = Number(
      parts.find((part) => part.type === "minute")?.value
    );

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    return {
      hour,
      minute,
      totalMinutes: hour * 60 + minute
    };
  } catch (error) {
    console.error(
      "Error obteniendo hora del bot:",
      error.message
    );

    return null;
  }
}

/*
  Determina si el bot puede responder según el horario configurado.

  Ejemplo:
  Inicio: 19:00
  Fin: 09:00

  El bot responde:
  19:00 - 23:59
  00:00 - 08:59
*/
function isBotAllowedToRespond() {
  const onlyNight =
    String(process.env.BOT_ONLY_NIGHT || "")
      .trim()
      .toLowerCase() === "true";

  /*
    Si BOT_ONLY_NIGHT no está activado,
    se permite responder siempre.
  */
  if (!onlyNight) {
    return {
      allowed: true,
      reason: "BOT_ONLY_NIGHT está desactivado"
    };
  }

  const timeZone =
    process.env.BOT_TIMEZONE || "America/Bogota";

  const startTime =
    process.env.BOT_START_TIME || "19:00";

  const endTime =
    process.env.BOT_END_TIME || "09:00";

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const currentTime = getCurrentTimeInTimezone(timeZone);

  /*
    Ante cualquier error de configuración,
    el bot queda bloqueado por seguridad.
  */
  if (
    startMinutes === null ||
    endMinutes === null ||
    !currentTime
  ) {
    return {
      allowed: false,
      reason: "Horario del bot inválido o no disponible"
    };
  }

  let allowed;

  /*
    Horario que cruza medianoche:
    19:00 hasta 09:00.
  */
  if (startMinutes > endMinutes) {
    allowed =
      currentTime.totalMinutes >= startMinutes ||
      currentTime.totalMinutes < endMinutes;
  } else {
    /*
      Horario dentro del mismo día.
    */
    allowed =
      currentTime.totalMinutes >= startMinutes &&
      currentTime.totalMinutes < endMinutes;
  }

  const currentFormatted =
    `${String(currentTime.hour).padStart(2, "0")}:` +
    `${String(currentTime.minute).padStart(2, "0")}`;

  return {
    allowed,
    reason: allowed
      ? `Bot habilitado a las ${currentFormatted}`
      : `Bot bloqueado a las ${currentFormatted}`,
    currentTime: currentFormatted,
    timeZone,
    startTime,
    endTime
  };
}

/*
  Limpia periódicamente los messageId antiguos.
*/
function cleanProcessedMessageIds() {
  const now = Date.now();

  for (const [messageId, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > MESSAGE_ID_TTL_MS) {
      processedMessageIds.delete(messageId);
    }
  }
}

setInterval(cleanProcessedMessageIds, 60 * 60 * 1000).unref();

/*
  Determina si un messageId ya fue procesado.
*/
function isDuplicateMessage(messageId) {
  if (!messageId) {
    return false;
  }

  if (processedMessageIds.has(messageId)) {
    return true;
  }

  processedMessageIds.set(messageId, Date.now());
  return false;
}

/*
  Ruta principal para comprobar que Render está funcionando.
*/
app.get("/", (req, res) => {
  res.status(200).send("Bot de perfumería funcionando ✅");
});

/*
  Ruta de diagnóstico del horario.
  No envía mensajes.
*/
app.get("/bot-status", (req, res) => {
  const status = isBotAllowedToRespond();

  return res.status(200).json({
    ok: true,
    ...status
  });
});

/*
  Ruta pública del catálogo.
*/
app.get("/catalogo.pdf", (req, res) => {
  res.sendFile(catalogPath, (error) => {
    if (error) {
      console.error(
        "Error enviando catálogo PDF:",
        error.message
      );

      if (!res.headersSent) {
        res.status(404).send("Catálogo no encontrado");
      }
    }
  });
});

/*
  Verificación del webhook directo de Meta.
*/
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log(
      "Webhook de Meta verificado correctamente ✅"
    );

    return res.status(200).send(challenge);
  }

  console.log("Error verificando webhook de Meta ❌");
  return res.sendStatus(403);
});

/*
  Recepción directa desde Meta.
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

    if (!message || message.type !== "text") {
      return res.sendStatus(200);
    }

    const phone = String(message.from || "").trim();
    const text = String(message.text?.body || "").trim();
    const messageId = String(message.id || "").trim();

    /*
      Respondemos rápidamente a Meta.
    */
    res.sendStatus(200);

    if (!phone || !text) {
      console.log(
        "Evento recibido desde Meta sin teléfono o texto."
      );

      return;
    }

    if (isDuplicateMessage(messageId)) {
      console.log(
        `Mensaje duplicado ignorado desde Meta: ${messageId}`
      );

      return;
    }

    const scheduleStatus = isBotAllowedToRespond();

    if (!scheduleStatus.allowed) {
      console.log(
        `Mensaje ignorado fuera del horario del bot. ` +
        `Cliente: ${phone}. ${scheduleStatus.reason}`
      );

      return;
    }

    console.log(
      `Mensaje recibido desde Meta: ${phone} - ${text}`
    );

    handleIncomingMessage(phone, text).catch((error) => {
      console.error(
        "Error procesando mensaje recibido desde Meta:",
        error
      );
    });
  } catch (error) {
    console.error(
      "Error en webhook directo de Meta:",
      error
    );

    if (!res.headersSent) {
      return res.sendStatus(500);
    }
  }
});

/*
  Ruta para recibir mensajes desde Make.
*/
app.post("/make/incoming", (req, res) => {
  try {
    const receivedSecret = req.headers["x-make-secret"];

    if (
      !MAKE_INCOMING_SECRET ||
      receivedSecret !== MAKE_INCOMING_SECRET
    ) {
      console.log(
        "Solicitud rechazada desde Make: secreto inválido."
      );

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

    const messageId = String(
      req.body.messageId || ""
    ).trim();

    if (!phone || !message) {
      console.log(
        "Evento recibido desde Make sin teléfono o sin mensaje."
      );

      return res.status(400).json({
        ok: false,
        error: "phone and message are required"
      });
    }

    /*
      Se responde rápidamente a Make.
    */
    res.status(200).json({
      ok: true,
      received: true,
      messageId
    });

    /*
      Evita reprocesar el mismo mensaje.
    */
    if (isDuplicateMessage(messageId)) {
      console.log(
        `Mensaje duplicado ignorado desde Make: ${messageId}`
      );

      return;
    }

    /*
      Bloquea el bot fuera del horario nocturno.
    */
    const scheduleStatus = isBotAllowedToRespond();

    if (!scheduleStatus.allowed) {
      console.log(
        `Mensaje ignorado fuera del horario del bot. ` +
        `Cliente: ${phone}. ${scheduleStatus.reason}`
      );

      return;
    }

    console.log(
      `Mensaje recibido desde Make: ${phone} - ${message}`
    );

    handleIncomingMessage(phone, message).catch((error) => {
      console.error(
        "Error procesando mensaje recibido desde Make:",
        error
      );
    });
  } catch (error) {
    console.error(
      "Error en endpoint /make/incoming:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: "Internal server error"
      });
    }
  }
});

app.listen(PORT, () => {
  const scheduleStatus = isBotAllowedToRespond();

  console.log(`Bot corriendo en puerto ${PORT}`);
  console.log(
    `Modo de envío: ${
      process.env.WHATSAPP_TRANSPORT || "meta"
    }`
  );
  console.log(
    `Estado inicial del horario: ${scheduleStatus.reason}`
  );
});