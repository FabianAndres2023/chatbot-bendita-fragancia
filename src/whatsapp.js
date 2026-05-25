import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ override: true });

const WHATSAPP_TRANSPORT = (
  process.env.WHATSAPP_TRANSPORT || "meta"
).toLowerCase();

const MAKE_OUTGOING_WEBHOOK_URL = process.env.MAKE_OUTGOING_WEBHOOK_URL;
const MAKE_OUTGOING_SECRET = process.env.MAKE_OUTGOING_SECRET;

/*
  Envía un mensaje de texto.
  Si WHATSAPP_TRANSPORT=make, Render llama a Make.
  Si WHATSAPP_TRANSPORT=meta, conserva el funcionamiento anterior.
*/
export async function sendWhatsAppMessage(to, body) {
  if (WHATSAPP_TRANSPORT === "make") {
    return sendThroughMake({
      type: "text",
      to,
      body
    });
  }

  return sendTextThroughMeta(to, body);
}

/*
  Envía el catálogo o cualquier documento.
  Para Make enviaremos también la URL pública del PDF de Render.
*/
export async function sendWhatsAppDocument(
  to,
  mediaId,
  filename,
  caption = ""
) {
  if (WHATSAPP_TRANSPORT === "make") {
    const publicUrl =
      process.env.CATALOG_PUBLIC_URL ||
      "https://chatbot-bendita-fragancia.onrender.com/catalogo.pdf";

    return sendThroughMake({
      type: "document",
      to,
      mediaId,
      filename,
      caption,
      url: publicUrl
    });
  }

  return sendDocumentThroughMeta(to, mediaId, filename, caption);
}

/*
  Render llama a un webhook de Make.
  Luego Make será quien envíe el mensaje por el WhatsApp real.
*/
async function sendThroughMake(payload) {
  if (!MAKE_OUTGOING_WEBHOOK_URL) {
    throw new Error(
      "Falta configurar MAKE_OUTGOING_WEBHOOK_URL en las variables de entorno."
    );
  }

  try {
    await axios.post(MAKE_OUTGOING_WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-render-secret": MAKE_OUTGOING_SECRET || ""
      },
      timeout: 20000
    });

    console.log(
      `Respuesta enviada a Make: ${payload.type} para ${payload.to}`
    );
  } catch (error) {
    console.error("\n❌ ERROR ENVIANDO RESPUESTA HACIA MAKE");
    console.error("Tipo:", payload.type);
    console.error("Para:", payload.to);

    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
}

/*
  Funcionamiento anterior: envío directo usando Meta Cloud API.
  Lo dejamos disponible para pruebas con el número de prueba.
*/
async function sendTextThroughMeta(to, body) {
  const tokenIsMissing =
    !process.env.WHATSAPP_TOKEN ||
    process.env.WHATSAPP_TOKEN.includes("PEGAR");

  const phoneIdIsMissing =
    !process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID.includes("PEGAR");

  if (tokenIsMissing || phoneIdIsMissing) {
    console.log("\n--- RESPUESTA SIMULADA ---");
    console.log("Para:", to);
    console.log(body);
    console.log("--------------------------\n");
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`Mensaje enviado directamente por Meta a ${to}`);
  } catch (error) {
    console.error("\n❌ ERROR ENVIANDO MENSAJE DIRECTO DE WHATSAPP");
    console.error("Para:", to);

    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
}

async function sendDocumentThroughMeta(to, mediaId, filename, caption = "") {
  const tokenIsMissing =
    !process.env.WHATSAPP_TOKEN ||
    process.env.WHATSAPP_TOKEN.includes("PEGAR");

  const phoneIdIsMissing =
    !process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID.includes("PEGAR");

  if (tokenIsMissing || phoneIdIsMissing) {
    console.log("\n--- DOCUMENTO SIMULADO ---");
    console.log("Para:", to);
    console.log("Media ID:", mediaId);
    console.log("Archivo:", filename);
    console.log("Caption:", caption);
    console.log("--------------------------\n");
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          id: mediaId,
          filename,
          caption
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`Documento enviado directamente por Meta a ${to}`);
  } catch (error) {
    console.error("\n❌ ERROR ENVIANDO DOCUMENTO DIRECTO DE WHATSAPP");
    console.error("Para:", to);

    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
}