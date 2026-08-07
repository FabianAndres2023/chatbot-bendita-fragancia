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
  IDs de mensajes procesados temporalmente.
  Evita respuestas duplicadas.
*/
const processedMessageIds = new Map();

const MESSAGE_ID_TTL_MS = 24 * 60 * 60 * 1000;

/*
  Máxima antigüedad permitida de un mensaje.

  Si Make libera mensajes acumulados varias horas después,
  serán descartados aunque originalmente hayan pertenecido
  al horario nocturno.

  15 minutos da margen suficiente para retrasos normales
  de Make o Render.
*/
const MAX_MESSAGE_AGE_MINUTES = Number(
  process.env.BOT_MAX_MESSAGE_AGE_MINUTES || "15"
);

app.use(express.json({ limit: "2mb" }));

/*
  Convierte HH:mm en minutos desde medianoche.
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
  Obtiene hora/minuto de una fecha determinada
  dentro de una zona horaria.
*/
function getTimeInTimezone(date, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);

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
      totalMinutes: hour * 60 + minute,
      formatted:
        `${String(hour).padStart(2, "0")}:` +
        `${String(minute).padStart(2, "0")}`
    };
  } catch (error) {
    console.error(
      "Error obteniendo hora en zona horaria:",
      error.message
    );

    return null;
  }
}

/*
  Hora actual del bot.
*/
function getCurrentTimeInTimezone(timeZone) {
  return getTimeInTimezone(new Date(), timeZone);
}

/*
  Determina si cierta hora pertenece
  al horario nocturno configurado.
*/
function isTimeInsideBotSchedule(totalMinutes) {
  const startTime =
    process.env.BOT_START_TIME || "19:00";

  const endTime =
    process.env.BOT_END_TIME || "09:00";

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (
    startMinutes === null ||
    endMinutes === null ||
    totalMinutes === null
  ) {
    return false;
  }

  /*
    Ejemplo:
    19:00 → 09:00
    Cruza medianoche.
  */
  if (startMinutes > endMinutes) {
    return (
      totalMinutes >= startMinutes ||
      totalMinutes < endMinutes
    );
  }

  /*
    Horario dentro del mismo día.
  */
  return (
    totalMinutes >= startMinutes &&
    totalMinutes < endMinutes
  );
}

/*
  Comprueba el horario ACTUAL.

  Esta sigue siendo nuestra segunda barrera.
*/
function isBotAllowedToRespond() {
  const onlyNight =
    String(process.env.BOT_ONLY_NIGHT || "")
      .trim()
      .toLowerCase() === "true";

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

  const currentTime =
    getCurrentTimeInTimezone(timeZone);

  if (!currentTime) {
    return {
      allowed: false,
      reason: "No fue posible determinar la hora actual"
    };
  }

  const allowed = isTimeInsideBotSchedule(
    currentTime.totalMinutes
  );

  return {
    allowed,
    reason: allowed
      ? `Bot habilitado a las ${currentTime.formatted}`
      : `Bot bloqueado a las ${currentTime.formatted}`,
    currentTime: currentTime.formatted,
    timeZone,
    startTime,
    endTime
  };
}

/*
  Convierte distintos formatos de timestamp
  enviados por Make o Meta en Date.
*/
function parseMessageTimestamp(rawTimestamp) {
  if (
    rawTimestamp === undefined ||
    rawTimestamp === null ||
    rawTimestamp === ""
  ) {
    return null;
  }

  /*
    Timestamp numérico:
    Meta normalmente usa segundos Unix.
  */
  if (
    typeof rawTimestamp === "number" ||
    /^\d+$/.test(String(rawTimestamp).trim())
  ) {
    const numeric = Number(rawTimestamp);

    if (!Number.isFinite(numeric)) {
      return null;
    }

    /*
      10 dígitos aprox. = segundos Unix.
      13 dígitos aprox. = milisegundos Unix.
    */
    const milliseconds =
      numeric < 100000000000
        ? numeric * 1000
        : numeric;

    const date = new Date(milliseconds);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  /*
    ISO u otro formato de fecha compatible.
  */
  const date = new Date(String(rawTimestamp).trim());

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/*
  Valida la hora ORIGINAL del mensaje.

  Esta es la protección contra mensajes acumulados
  durante el día.
*/
function validateOriginalMessageTime(rawTimestamp) {
  const timeZone =
    process.env.BOT_TIMEZONE || "America/Bogota";

  const parsedDate =
    parseMessageTimestamp(rawTimestamp);

  /*
    Si Make no envía timestamp o llega inválido,
    bloqueamos por seguridad.
  */
  if (!parsedDate) {
    return {
      allowed: false,
      reason:
        "Timestamp original ausente o inválido"
    };
  }

  const messageTime =
    getTimeInTimezone(parsedDate, timeZone);

  if (!messageTime) {
    return {
      allowed: false,
      reason:
        "No fue posible interpretar la hora original"
    };
  }

  /*
    Comprobamos antigüedad.
  */
  const ageMs =
    Date.now() - parsedDate.getTime();

  const ageMinutes =
    ageMs / (60 * 1000);

  /*
    Permitimos hasta 5 minutos hacia el futuro
    por pequeñas diferencias de reloj.
  */
  if (ageMinutes < -5) {
    return {
      allowed: false,
      reason:
        `Timestamp futuro inválido: ${ageMinutes.toFixed(1)} min`
    };
  }

  /*
    Mensajes demasiado viejos se descartan.
  */
  if (ageMinutes > MAX_MESSAGE_AGE_MINUTES) {
    return {
      allowed: false,
      reason:
        `Mensaje antiguo descartado: ` +
        `${ageMinutes.toFixed(1)} minutos de antigüedad`,
      messageTime: messageTime.formatted
    };
  }

  /*
    Ahora comprobamos que la HORA ORIGINAL
    pertenezca al horario del chatbot.
  */
  const insideSchedule =
    isTimeInsideBotSchedule(
      messageTime.totalMinutes
    );

  if (!insideSchedule) {
    return {
      allowed: false,
      reason:
        `Mensaje original enviado fuera del horario del bot ` +
        `a las ${messageTime.formatted}`,
      messageTime: messageTime.formatted
    };
  }

  return {
    allowed: true,
    reason:
      `Mensaje original válido a las ${messageTime.formatted}`,
    messageTime: messageTime.formatted,
    ageMinutes
  };
}

/*
  Limpia IDs antiguos.
*/
function cleanProcessedMessageIds() {
  const now = Date.now();

  for (
    const [messageId, timestamp]
    of processedMessageIds.entries()
  ) {
    if (now - timestamp > MESSAGE_ID_TTL_MS) {
      processedMessageIds.delete(messageId);
    }
  }
}

setInterval(
  cleanProcessedMessageIds,
  60 * 60 * 1000
).unref();

/*
  Detecta mensajes duplicados.
*/
function isDuplicateMessage(messageId) {
  if (!messageId) {
    return false;
  }

  if (processedMessageIds.has(messageId)) {
    return true;
  }

  processedMessageIds.set(
    messageId,
    Date.now()
  );

  return false;
}

/*
  Estado del servidor.
*/
app.get("/", (req, res) => {
  res
    .status(200)
    .send("Bot de perfumería funcionando ✅");
});

/*
  Diagnóstico del horario actual.
*/
app.get("/bot-status", (req, res) => {
  const status = isBotAllowedToRespond();

  return res.status(200).json({
    ok: true,
    maxMessageAgeMinutes:
      MAX_MESSAGE_AGE_MINUTES,
    ...status
  });
});

/*
  Catálogo.
*/
app.get("/catalogo.pdf", (req, res) => {
  res.sendFile(catalogPath, (error) => {
    if (error) {
      console.error(
        "Error enviando catálogo PDF:",
        error.message
      );

      if (!res.headersSent) {
        res
          .status(404)
          .send("Catálogo no encontrado");
      }
    }
  });
});

/*
  Verificación del webhook directo de Meta.
*/
app.get("/webhook", (req, res) => {
  const mode =
    req.query["hub.mode"];

  const token =
    req.query["hub.verify_token"];

  const challenge =
    req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN
  ) {
    console.log(
      "Webhook de Meta verificado correctamente ✅"
    );

    return res
      .status(200)
      .send(challenge);
  }

  console.log(
    "Error verificando webhook de Meta ❌"
  );

  return res.sendStatus(403);
});

/*
  Recepción directa desde Meta.
  Se conserva por compatibilidad.
*/
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (!body.object) {
      return res.sendStatus(404);
    }

    const entry =
      body.entry?.[0];

    const changes =
      entry?.changes?.[0];

    const value =
      changes?.value;

    const message =
      value?.messages?.[0];

    if (
      !message ||
      message.type !== "text"
    ) {
      return res.sendStatus(200);
    }

    const phone =
      String(
        message.from || ""
      ).trim();

    const text =
      String(
        message.text?.body || ""
      ).trim();

    const messageId =
      String(
        message.id || ""
      ).trim();

    const messageTimestamp =
      message.timestamp;

    /*
      Meta recibe respuesta inmediatamente.
    */
    res.sendStatus(200);

    if (!phone || !text) {
      console.log(
        "Evento recibido desde Meta sin teléfono o texto."
      );

      return;
    }

    /*
      Hora original.
    */
    const originalTimeStatus =
      validateOriginalMessageTime(
        messageTimestamp
      );

    if (!originalTimeStatus.allowed) {
      console.log(
        `Mensaje de Meta descartado. ` +
        `Cliente: ${phone}. ` +
        `${originalTimeStatus.reason}`
      );

      return;
    }

    /*
      Horario actual.
    */
    const scheduleStatus =
      isBotAllowedToRespond();

    if (!scheduleStatus.allowed) {
      console.log(
        `Mensaje ignorado fuera del horario actual. ` +
        `Cliente: ${phone}. ` +
        `${scheduleStatus.reason}`
      );

      return;
    }

    if (isDuplicateMessage(messageId)) {
      console.log(
        `Mensaje duplicado ignorado desde Meta: ` +
        `${messageId}`
      );

      return;
    }

    console.log(
      `Mensaje recibido desde Meta: ` +
      `${phone} - ${text}`
    );

    handleIncomingMessage(
      phone,
      text
    ).catch((error) => {
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
  Entrada desde Make.
*/
app.post("/make/incoming", (req, res) => {
  try {
    const receivedSecret =
      req.headers["x-make-secret"];

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

    /*
      NUEVO:
      timestamp ORIGINAL enviado por Make.
    */
    const messageTimestamp =
      req.body.messageTimestamp;

    if (!phone || !message) {
      console.log(
        "Evento recibido desde Make sin teléfono o mensaje."
      );

      return res.status(400).json({
        ok: false,
        error:
          "phone and message are required"
      });
    }

    /*
      Contestamos inmediatamente a Make.
    */
    res.status(200).json({
      ok: true,
      received: true,
      messageId
    });

    /*
      ==================================================
      BARRERA 1:
      validar timestamp ORIGINAL del mensaje.
      ==================================================
    */
    const originalTimeStatus =
      validateOriginalMessageTime(
        messageTimestamp
      );

    if (!originalTimeStatus.allowed) {
      console.log(
        `Mensaje descartado desde Make. ` +
        `Cliente: ${phone}. ` +
        `${originalTimeStatus.reason}. ` +
        `Timestamp recibido: ${messageTimestamp || "vacío"}`
      );

      return;
    }

    /*
      ==================================================
      BARRERA 2:
      comprobar que ACTUALMENTE también estamos
      en horario del bot.
      ==================================================
    */
    const scheduleStatus =
      isBotAllowedToRespond();

    if (!scheduleStatus.allowed) {
      console.log(
        `Mensaje ignorado fuera del horario actual. ` +
        `Cliente: ${phone}. ` +
        `${scheduleStatus.reason}`
      );

      return;
    }

    /*
      ==================================================
      BARRERA 3:
      bloqueo de Message ID duplicado.
      ==================================================
    */
    if (isDuplicateMessage(messageId)) {
      console.log(
        `Mensaje duplicado ignorado desde Make: ` +
        `${messageId}`
      );

      return;
    }

    /*
      Solo llegamos aquí si:

      1. El mensaje es reciente.
      2. Fue enviado originalmente entre 19:00 y 09:00.
      3. Actualmente estamos entre 19:00 y 09:00.
      4. El messageId no ha sido procesado.
    */
    console.log(
      `Mensaje válido recibido desde Make: ` +
      `${phone} - ${message}. ` +
      `Hora original: ${originalTimeStatus.messageTime}`
    );

    handleIncomingMessage(
      phone,
      message
    ).catch((error) => {
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
  const scheduleStatus =
    isBotAllowedToRespond();

  console.log(
    `Bot corriendo en puerto ${PORT}`
  );

  console.log(
    `Modo de envío: ${
      process.env.WHATSAPP_TRANSPORT || "meta"
    }`
  );

  console.log(
    `Estado inicial del horario: ` +
    `${scheduleStatus.reason}`
  );

  console.log(
    `Antigüedad máxima permitida de mensajes: ` +
    `${MAX_MESSAGE_AGE_MINUTES} minutos`
  );
});