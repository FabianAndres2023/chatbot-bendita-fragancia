import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import FormData from "form-data";

dotenv.config();

const PDF_PATH = "./data/catalogo.pdf";

async function uploadCatalog() {
  try {
    if (!fs.existsSync(PDF_PATH)) {
      console.error("No encontré el archivo:", PDF_PATH);
      return;
    }

    const form = new FormData();

    form.append("messaging_product", "whatsapp");
    form.append("type", "application/pdf");
    form.append("file", fs.createReadStream(PDF_PATH));

    const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`;

    const response = await axios.post(url, form, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        ...form.getHeaders()
      }
    });

    console.log("✅ Catálogo subido correctamente.");
    console.log("MEDIA ID:");
    console.log(response.data.id);
    console.log("\nCopia ese MEDIA ID y pégalo en tu .env como CATALOG_MEDIA_ID.");
  } catch (error) {
    console.error("❌ Error subiendo el catálogo.");

    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

uploadCatalog();