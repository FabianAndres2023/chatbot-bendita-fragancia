import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { products, formatPrice } from "./products.js";

dotenv.config({ override: true });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

function getCatalogContext(limit = 120) {
  return products
    .slice(0, limit)
    .map((product) => {
      return `- ${product.name} | Marca: ${product.brand || "No especificada"} | Género: ${product.gender || "No especificado"} | Aroma: ${product.scent || "No especificado"} | Detal: ${formatPrice(product.retailPrice)} | Mayorista desde 3 productos: ${formatPrice(product.wholesalePrice)}`;
    })
    .join("\n");
}

export async function getAiSalesResponse(userMessage) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log("Gemini no configurado. Se usa flujo normal.");
      return null;
    }

    const catalogContext = getCatalogContext();

    const prompt = `
Eres una asesora virtual de ventas de Bendita Fragancia, una perfumería.

Tu objetivo es ayudar a vender de forma amable, clara y natural por WhatsApp.

REGLAS OBLIGATORIAS:
- No inventes productos.
- No inventes precios.
- No inventes disponibilidad exacta.
- No confirmes pedidos.
- No pidas pagos directamente.
- No digas que un producto está disponible con seguridad.
- Usa solamente productos del catálogo entregado.
- Si recomiendas, recomienda máximo 3 productos.
- Si el cliente quiere comprar, dile que escriba el nombre del perfume para agregarlo al pedido.
- Recuerda que desde 3 productos aplica precio mayorista.
- Responde breve, cálido y vendedor.
- Si el cliente está indeciso, ayúdalo a escoger.
- Si no estás segura, ofrece ver catálogo o hablar con una asesora.

CATÁLOGO DISPONIBLE:
${catalogContext}

MENSAJE DEL CLIENTE:
"${userMessage}"

Responde como asesora de WhatsApp en español colombiano.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const text = response.text;

    if (!text) {
      return null;
    }

    return text.trim();
  } catch (error) {
    console.error("\n⚠️ Gemini no respondió. El bot seguirá con flujo normal.");

    if (error.message) {
      console.error("Detalle:", error.message);
    }

    return null;
  }
}