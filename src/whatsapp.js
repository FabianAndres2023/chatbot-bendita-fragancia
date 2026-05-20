import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ override: true });

export async function sendWhatsAppMessage(to, body) {
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
  } catch (error) {
    console.error("\n❌ ERROR ENVIANDO MENSAJE DE WHATSAPP");
    console.error("Para:", to);

    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
}

export async function sendWhatsAppDocument(to, mediaId, filename, caption = "") {
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
  } catch (error) {
    console.error("\n❌ ERROR ENVIANDO DOCUMENTO DE WHATSAPP");
    console.error("Para:", to);

    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    throw error;
  }
}