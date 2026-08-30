import {
  sendWhatsAppMessage,
  sendWhatsAppDocument
} from "./whatsapp.js";

import { products, formatPrice } from "./products.js";
import { getAiSalesResponse } from "./ai.js";

const states = new Map();

const HUMAN_ATTENTION_SCHEDULE = "9:00 a.m. a 6:30 p.m.";
const WHOLESALE_MIN_UNITS = 3;

const PAYMENT_INFO = {
  bank: "Nequi",
  accountNumber: "3156607086",
  holderName: "Maira Mondragon"
};

export async function handleIncomingMessage(phone, message) {
  const rawText = message.trim();
  const text = normalize(rawText);

  if (!isBotAllowedToRespond()) {
    console.log(
      `Mensaje recibido fuera del horario del bot. El bot no responde. Cliente: ${phone}`
    );
    return;
  }

  if (!text) {
    return sendWhatsAppMessage(
      phone,
      "No alcancé a leer tu mensaje. ¿Me escribes nuevamente, por favor? 😊"
    );
  }

  if (isMainMenuRequest(text)) {
    states.set(phone, { step: "MAIN_MENU", cart: [] });
    return sendMainMenu(phone);
  }

  if (
    text.includes("asesor") ||
    text.includes("asesora") ||
    text.includes("humano") ||
    text.includes("persona")
  ) {
    return handleHumanHandoff(phone);
  }

  const state = states.get(phone);

  if (!state) {
    const foundProducts = searchProducts(text);

    if (foundProducts.length > 0) {
      states.set(phone, {
        step: "PRODUCT_FOUND",
        foundProducts,
        cart: []
      });

      return sendProductSearchResults(phone, foundProducts);
    }

    if (shouldUseAi(text)) {
      const newState = { step: "PRODUCT_FOUND", cart: [] };
      return sendAiHelpOrFallback(phone, text, newState, "PRODUCT_FOUND");
    }

    states.set(phone, { step: "MAIN_MENU", cart: [] });
    return sendMainMenu(phone);
  }

  switch (state.step) {
    case "MAIN_MENU":
      return handleMainMenuStep(phone, text, rawText, state);

    case "ASK_PRODUCT_HELP_OPTION":
      return handleProductHelpOptionStep(phone, text, state);

    case "ASK_GENDER":
      return handleGenderStep(phone, text, state);

    case "ASK_SCENT":
      return handleScentStep(phone, text, state);

    case "ASK_BUDGET":
      return handleBudgetStep(phone, text, state);

    case "SHOW_RECOMMENDATIONS":
      return handleProductSelectionStep(phone, text, state);

    case "PRODUCT_FOUND":
      return handleProductFoundStep(phone, text, state);

    case "ASK_QUANTITY":
      return handleQuantityStep(phone, text, state);

    case "ASK_ADD_MORE_PRODUCTS":
      return handleAddMoreProductsStep(phone, text, state);

    case "ASK_NEXT_PRODUCT_NAME":
      return handleNextProductNameStep(phone, text, state);

    case "ASK_NEXT_PRODUCT_SELECTION":
      return handleNextProductSelectionStep(phone, text, state);

    case "ASK_NEXT_QUANTITY":
      return handleNextQuantityStep(phone, text, state);

    case "ASK_CUSTOMER_NAME":
      return handleCustomerNameStep(phone, rawText, state);

    case "ASK_CITY":
      return handleCityStep(phone, rawText, state);

    case "ASK_ADDRESS":
      return handleAddressStep(phone, rawText, state);

    case "ASK_PAYMENT":
      return handlePaymentStep(phone, text, state);

    case "ASK_LEAD_NAME":
      return handleLeadNameStep(phone, rawText, state);

    case "ASK_LEAD_NEED":
      return handleLeadNeedStep(phone, rawText, state);

    case "ORDER_CONFIRMED":
      return sendWhatsAppMessage(
        phone,
        "Tu pedido ya quedó preagendado ✅ Una asesora lo confirmará lo más pronto posible. Si quieres hacer otro pedido, escribe *menu*."
      );

    default:
      states.set(phone, { step: "MAIN_MENU", cart: [] });
      return sendMainMenu(phone);
  }
}

function sendMainMenu(phone) {
  return sendWhatsAppMessage(
    phone,
    `Hola 👋 Bienvenido/a a Bendita Fragancia.

Soy el asistente virtual de Bendita Fragancia y estoy aquí para ayudarte a elegir el perfume ideal.

Puedo ayudarte con:

1. Ver catálogo
2. Buscar un perfume específico
3. Recomendarme un perfume
4. Ver opciones para regalo
5. Comprar al por mayor
6. Hablar con una asesora

Ten presente que desde ${WHOLESALE_MIN_UNITS} productos puedes acceder a precio mayorista. Pueden ser perfumes diferentes 😊

Para compras de 1 o 2 productos, una asesora te confirmará el precio al detal.

Responde con el número de la opción que prefieras.`
  );
}

async function sendCatalog(phone) {
  const transport = (
    process.env.WHATSAPP_TRANSPORT || "meta"
  ).toLowerCase();

  const mediaId = process.env.CATALOG_MEDIA_ID || "";

  const filename =
    process.env.CATALOG_FILE_NAME ||
    "CATALOGO BENDITA FRAGANCIA.pdf";

  const caption = `Claro 😊 Aquí tienes nuestro catálogo actualizado.

Si deseas comprar al por mayor, recuerda que el precio mayorista aplica desde ${WHOLESALE_MIN_UNITS} productos.

Pueden ser perfumes iguales o diferentes.

Cuando veas uno que te guste, escríbeme el nombre y te ayudo con disponibilidad y pedido.`;

  if (transport === "make") {
    return sendWhatsAppDocument(
      phone,
      "",
      filename,
      caption
    );
  }

  if (!mediaId) {
    return sendWhatsAppMessage(
      phone,
      "En este momento no tengo el catálogo cargado 😔 Una asesora puede ayudarte con las opciones disponibles."
    );
  }

  return sendWhatsAppDocument(
    phone,
    mediaId,
    filename,
    caption
  );
}

function askProductName(phone, state, message) {
  state.step = "PRODUCT_FOUND";
  state.waitingForProductName = true;
  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `${message}

Si ya sabes el nombre, escríbelo aquí.

También puedes responder:

1. Ver catálogo
2. Recibir recomendación
3. Hablar con una asesora`
  );
}

function offerProductHelp(phone, state) {
  state.step = "ASK_PRODUCT_HELP_OPTION";
  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `No hay problema 😊

Puedes elegir una de estas opciones:

1. Ver catálogo
2. Recibir recomendación
3. Hablar con una asesora

Responde con el número de la opción que prefieras.`
  );
}

async function sendAiHelpOrFallback(
  phone,
  text,
  state,
  nextStep = "PRODUCT_FOUND"
) {
  const aiResponse = await getAiSalesResponse(text);

  state.step = nextStep;
  state.waitingForProductName = true;
  states.set(phone, state);

  if (aiResponse) {
    return sendWhatsAppMessage(
      phone,
      `${aiResponse}

Si alguno te gustó, escríbeme el nombre del perfume y te ayudo con disponibilidad y precio mayorista 😊

También puedes responder:

1. Ver catálogo
2. Recibir recomendación
3. Hablar con una asesora`
    );
  }

  return sendWhatsAppMessage(
    phone,
    `Te ayudo con gusto 😊

Puedes elegir una de estas opciones:

1. Ver catálogo
2. Recibir recomendación
3. Hablar con una asesora

O escríbeme el nombre de un perfume que quieras buscar.`
  );
}

function isMainMenuRequest(text) {
  if (!text) {
    return false;
  }

  const exactMenuMessages = [
    "menu",
    "menu principal",
    "inicio",
    "reiniciar",
    "empezar",
    "hola",
    "buenas",
    "buenos dias",
    "buenas tardes",
    "buenas noches",
    "hola quiero mas informacion",
    "hola quiero informacion",
    "quiero mas informacion",
    "quiero informacion",
    "deseo mas informacion",
    "deseo informacion",
    "mas informacion",
    "informacion",
    "info",
    "me interesa",
    "estoy interesado",
    "estoy interesada",
    "vengo del anuncio",
    "vi el anuncio"
  ];

  if (exactMenuMessages.includes(text)) {
    return true;
  }

  const hasGreeting =
    text.startsWith("hola ") ||
    text.startsWith("buenas ") ||
    text.startsWith("buenos dias ") ||
    text.startsWith("buenas tardes ") ||
    text.startsWith("buenas noches ");

  const asksForGenericInformation =
    text.includes("quiero mas informacion") ||
    text.includes("quiero informacion") ||
    text.includes("deseo mas informacion") ||
    text.includes("deseo informacion") ||
    text.includes("me interesa") ||
    text.includes("vengo del anuncio") ||
    text.includes("vi el anuncio");

  return hasGreeting && asksForGenericInformation;
}

function shouldUseAi(text) {
  if (!text || text.length < 4) return false;

  const directOptions = ["1", "2", "3", "4", "5", "6", "si", "sí", "no"];

  if (directOptions.includes(text)) {
    return false;
  }

  const aiKeywords = [
    "quiero",
    "busco",
    "recomienda",
    "recomiendame",
    "recomiéndame",
    "regalo",
    "novia",
    "novio",
    "esposa",
    "esposo",
    "mama",
    "mamá",
    "papa",
    "papá",
    "dulce",
    "fresco",
    "elegante",
    "amaderado",
    "citrico",
    "cítrico",
    "citricos",
    "cítricos",
    "barato",
    "economico",
    "económico",
    "vender",
    "mayorista",
    "no se",
    "no sé",
    "nose",
    "no conozco",
    "cual",
    "cuál",
    "mejor",
    "huele",
    "duradero",
    "duradera",
    "bueno",
    "buena",
    "rico",
    "rica",
    "oficina",
    "noche",
    "dia",
    "día",
    "calor",
    "frio",
    "frío"
  ];

  return (
    aiKeywords.some((word) => text.includes(word)) ||
    text.split(" ").length >= 3
  );
}

async function handleProductHelpOptionStep(phone, text, state) {
  if (
    text === "1" ||
    text.includes("catalogo") ||
    text.includes("catálogo") ||
    text.includes("pdf")
  ) {
    await sendCatalog(phone);

    state.step = "PRODUCT_FOUND";
    state.waitingForProductName = true;
    states.set(phone, state);

    return sendWhatsAppMessage(
      phone,
      `Cuando veas un perfume que te guste, escríbeme el nombre.

También puedes escribir *recomiéndame* si quieres que te ayude a escoger.`
    );
  }

  if (
    text === "2" ||
    text.includes("recomendar") ||
    text.includes("recomendacion") ||
    text.includes("recomiend")
  ) {
    state.step = "ASK_GENDER";
    states.set(phone, state);

    return sendGenderQuestion(phone);
  }

  if (
    text === "3" ||
    text.includes("asesor") ||
    text.includes("asesora")
  ) {
    return handleHumanHandoff(phone);
  }

  return offerProductHelp(phone, state);
}

function handleMainMenuStep(phone, text, rawText, state) {
  if (
    text === "1" ||
    text.includes("catalogo") ||
    text.includes("catálogo") ||
    text.includes("pdf")
  ) {
    return sendCatalog(phone);
  }

  if (
    text === "2" ||
    text.includes("buscar") ||
    text.includes("perfume especifico")
  ) {
    state.cart = [];

    return askProductName(
      phone,
      state,
      "Claro 😊 ¿Qué perfume estás buscando? Puedes escribirme el nombre o una parte del nombre. Ejemplo: Yara, 212, Hawas, Sauvage."
    );
  }

  if (
    text === "3" ||
    text.includes("recomendar") ||
    text.includes("recomendacion")
  ) {
    state.step = "ASK_GENDER";
    state.cart = [];

    states.set(phone, state);

    return sendGenderQuestion(phone);
  }

  if (
    text === "4" ||
    text.includes("regalo")
  ) {
    state.gender = "regalo";
    state.step = "ASK_SCENT";
    state.cart = [];

    states.set(phone, state);

    return sendWhatsAppMessage(
      phone,
      `Con gusto 😊 Para regalo te puedo recomendar opciones muy vendidas.

¿Qué tipo de aroma crees que le gustaría?

1. Dulce
2. Fresco
3. Elegante
4. Amaderado
5. Cítrico
6. No sé, recomiéndame`
    );
  }

  if (
    text === "5" ||
    text.includes("mayorista") ||
    text.includes("mayor") ||
    text.includes("por mayor")
  ) {
    state.cart = [];

    return askProductName(
      phone,
      state,
      `¡Claro! 😊

Manejamos precio mayorista desde ${WHOLESALE_MIN_UNITS} productos en adelante.

Pueden ser perfumes iguales o diferentes.

¿Qué perfume deseas agregar primero?`
    );
  }

  if (
    text === "6" ||
    text.includes("asesora") ||
    text.includes("asesor")
  ) {
    return handleHumanHandoff(phone);
  }

  const foundProducts = searchProducts(text);

  if (foundProducts.length > 0) {
    states.set(phone, {
      step: "PRODUCT_FOUND",
      foundProducts,
      cart: state.cart || []
    });

    return sendProductSearchResults(phone, foundProducts);
  }

  if (shouldUseAi(text)) {
    return sendAiHelpOrFallback(phone, text, state, "PRODUCT_FOUND");
  }

  return sendWhatsAppMessage(
    phone,
    `Te entiendo 😊 Para ayudarte mejor, elige una opción:

1. Ver catálogo
2. Buscar un perfume específico
3. Recomendarme un perfume
4. Ver opciones para regalo
5. Comprar al por mayor
6. Hablar con una asesora`
  );
}

function sendGenderQuestion(phone) {
  return sendWhatsAppMessage(
    phone,
    `Perfecto 😊 ¿Buscas perfume para?

1. Mujer
2. Hombre
3. Unisex

Responde con el número de la opción.`
  );
}

function handleGenderStep(phone, text, state) {
  const gender = parseGender(text);

  if (!gender) {
    return sendWhatsAppMessage(
      phone,
      `Por favor responde con una opción válida:

1. Mujer
2. Hombre
3. Unisex`
    );
  }

  state.gender = gender;
  state.step = "ASK_SCENT";

  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `Perfecto 😊 Para recomendarte mejor, cuéntame qué tipo de aroma te gusta:

1. Dulce
2. Fresco
3. Elegante
4. Amaderado
5. Cítrico
6. No sé, recomiéndame

Puedes responder con el número o con el tipo de aroma.`
  );
}

function handleScentStep(phone, text, state) {
  const scent = parseScent(text);

  if (!scent) {
    return sendWhatsAppMessage(
      phone,
      `Elige una opción válida:

1. Dulce
2. Fresco
3. Elegante
4. Amaderado
5. Cítrico
6. No sé, recomiéndame`
    );
  }

  state.scent = scent;
  state.step = "ASK_BUDGET";

  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `Muy bien. ¿Qué presupuesto mayorista tienes en mente por perfume?

1. Económico
2. Medio
3. Premium
4. Muéstrame varias opciones

Así te recomiendo opciones más ajustadas a lo que buscas.`
  );
}

function handleBudgetStep(phone, text, state) {
  const budget = parseBudget(text);

  if (!budget) {
    return sendWhatsAppMessage(
      phone,
      `Por favor elige una opción válida:

1. Económico
2. Medio
3. Premium
4. Muéstrame varias opciones`
    );
  }

  state.budget = budget;

  const recommendedProducts = getRecommendations(state);

  if (recommendedProducts.length === 0) {
    state.step = "PRODUCT_FOUND";
    state.waitingForProductName = true;

    states.set(phone, state);

    return sendWhatsAppMessage(
      phone,
      `No encontré una recomendación exacta con esos filtros 😔

Puedes escribirme el nombre de un perfume, ver el catálogo o pedir ayuda a una asesora.`
    );
  }

  state.recommendedProducts = recommendedProducts;
  state.step = "SHOW_RECOMMENDATIONS";

  states.set(phone, state);

  const productList = recommendedProducts
    .map((product, index) => {
      return `${index + 1}. ${product.name}
Precio mayorista: ${formatPrice(product.wholesalePrice)}
${product.description}`;
    })
    .join("\n\n");

  return sendWhatsAppMessage(
    phone,
    `Según lo que me contaste, estas opciones pueden gustarte mucho:

${productList}

Los precios mostrados son mayoristas y aplican desde ${WHOLESALE_MIN_UNITS} productos en total.

¿Cuál de estas opciones te gustaría agregar a tu pedido?

Responde con el número de la opción 😊`
  );
}

function handleProductSelectionStep(phone, text, state) {
  const selectedIndex = Number(text);

  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 1 ||
    selectedIndex > state.recommendedProducts.length
  ) {
    return sendWhatsAppMessage(
      phone,
      "Por favor responde con el número del perfume que quieres agregar 😊"
    );
  }

  const selectedProduct = state.recommendedProducts[selectedIndex - 1];

  state.selectedProduct = selectedProduct;
  state.step = "ASK_QUANTITY";

  states.set(phone, state);

  return askForQuantityAfterProduct(phone, selectedProduct);
}

async function handleProductFoundStep(phone, text, state) {
  if (state.waitingForProductName) {
    if (
      text === "1" ||
      text.includes("catalogo") ||
      text.includes("catálogo") ||
      text.includes("pdf")
    ) {
      await sendCatalog(phone);

      state.step = "PRODUCT_FOUND";
      state.waitingForProductName = true;

      states.set(phone, state);

      return sendWhatsAppMessage(
        phone,
        "Cuando veas un perfume que te guste, escríbeme el nombre y te ayudo con su precio mayorista 😊"
      );
    }

    if (
      text === "2" ||
      text.includes("recomendar") ||
      text.includes("recomendacion") ||
      text.includes("recomiend") ||
      text.includes("no se") ||
      text.includes("nose") ||
      text.includes("no sé") ||
      text.includes("no conozco")
    ) {
      state.step = "ASK_GENDER";

      states.set(phone, state);

      return sendGenderQuestion(phone);
    }

    if (
      text === "3" ||
      text.includes("asesor") ||
      text.includes("asesora")
    ) {
      return handleHumanHandoff(phone);
    }

    const foundProducts = searchProducts(text);

    if (foundProducts.length === 0) {
      if (shouldUseAi(text)) {
        return sendAiHelpOrFallback(
          phone,
          text,
          state,
          "PRODUCT_FOUND"
        );
      }

      return offerProductHelp(phone, state);
    }

    state.waitingForProductName = false;
    state.foundProducts = foundProducts;

    states.set(phone, state);

    return sendProductSearchResults(phone, foundProducts);
  }

  const selectedIndex = Number(text);

  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 1 ||
    selectedIndex > state.foundProducts.length
  ) {
    return sendWhatsAppMessage(
      phone,
      "Por favor responde con el número del perfume que quieres agregar 😊"
    );
  }

  const selectedProduct = state.foundProducts[selectedIndex - 1];

  state.selectedProduct = selectedProduct;
  state.step = "ASK_QUANTITY";

  states.set(phone, state);

  return askForQuantityAfterProduct(phone, selectedProduct);
}

function sendProductSearchResults(phone, foundProducts) {
  const productList = foundProducts
    .slice(0, 3)
    .map((product, index) => {
      return `${index + 1}. ${product.name}
Precio mayorista: ${formatPrice(product.wholesalePrice)}
${product.description}`;
    })
    .join("\n\n");

  return sendWhatsAppMessage(
    phone,
    `Encontré estas opciones relacionadas con tu búsqueda:

${productList}

📌 Los precios mostrados son mayoristas y aplican desde ${WHOLESALE_MIN_UNITS} productos en total. Pueden ser perfumes diferentes.

¿Cuál te gustaría agregar a tu pedido?

Responde con el número de la opción 😊`
  );
}

function askForQuantityAfterProduct(phone, selectedProduct) {
  return sendWhatsAppMessage(
    phone,
    `Excelente elección 🔥

Seleccionaste: ${selectedProduct.name}

Precio mayorista: ${formatPrice(selectedProduct.wholesalePrice)}

El precio mayorista aplica al completar mínimo ${WHOLESALE_MIN_UNITS} productos en el pedido. Pueden ser perfumes diferentes.

¿Cuántas unidades deseas agregar de este perfume?`
  );
}

function handleQuantityStep(phone, text, state) {
  const quantity = Number(text);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return sendWhatsAppMessage(
      phone,
      "Por favor dime cuántas unidades deseas agregar. Ejemplo: 1, 2, 3, 4..."
    );
  }

  addProductToCart(state, state.selectedProduct, quantity);

  state.step = "ASK_ADD_MORE_PRODUCTS";

  states.set(phone, state);

  return sendCartSummaryWithAddMoreQuestion(phone, state);
}

function handleAddMoreProductsStep(phone, text, state) {
  if (isYes(text)) {
    state.step = "ASK_NEXT_PRODUCT_NAME";

    states.set(phone, state);

    return sendWhatsAppMessage(
      phone,
      `Perfecto 😊 ¿Qué otro perfume deseas agregar?

Puedes escribir el nombre del perfume o responder:

1. Ver catálogo
2. Recibir recomendación
3. Hablar con una asesora`
    );
  }

  if (isNo(text)) {
    calculateCartTotals(state);

    state.step = "ASK_CUSTOMER_NAME";

    states.set(phone, state);

    return sendWhatsAppMessage(
      phone,
      `${buildCartSummary(state)}

Para dejar tu pedido preagendado, ¿me regalas tu nombre, por favor?`
    );
  }

  return sendWhatsAppMessage(
    phone,
    "¿Deseas agregar otro perfume al pedido? Responde *sí* o *no* 😊"
  );
}

async function handleNextProductNameStep(phone, text, state) {
  if (
    text === "1" ||
    text.includes("catalogo") ||
    text.includes("catálogo") ||
    text.includes("pdf")
  ) {
    await sendCatalog(phone);

    state.step = "ASK_NEXT_PRODUCT_NAME";

    states.set(phone, state);

    return sendWhatsAppMessage(
      phone,
      "Cuando veas otro perfume que te guste, escríbeme el nombre para agregarlo al pedido 😊"
    );
  }

  if (
    text === "2" ||
    text.includes("recomendar") ||
    text.includes("recomendacion") ||
    text.includes("recomiend") ||
    text.includes("no se") ||
    text.includes("nose") ||
    text.includes("no sé")
  ) {
    state.step = "ASK_GENDER";

    states.set(phone, state);

    return sendGenderQuestion(phone);
  }

  if (
    text === "3" ||
    text.includes("asesor") ||
    text.includes("asesora")
  ) {
    return handleHumanHandoff(phone);
  }

  const foundProducts = searchProducts(text);

  if (foundProducts.length === 0) {
    if (shouldUseAi(text)) {
      return sendAiHelpOrFallback(
        phone,
        text,
        state,
        "ASK_NEXT_PRODUCT_NAME"
      );
    }

    return offerProductHelp(phone, state);
  }

  state.nextFoundProducts = foundProducts;
  state.step = "ASK_NEXT_PRODUCT_SELECTION";

  states.set(phone, state);

  const productList = foundProducts
    .slice(0, 3)
    .map((product, index) => {
      return `${index + 1}. ${product.name}
Precio mayorista: ${formatPrice(product.wholesalePrice)}
${product.description}`;
    })
    .join("\n\n");

  return sendWhatsAppMessage(
    phone,
    `Encontré estas opciones:

${productList}

Los precios mostrados son mayoristas.

¿Cuál deseas agregar?

Responde con el número de la opción 😊`
  );
}

function handleNextProductSelectionStep(phone, text, state) {
  const selectedIndex = Number(text);

  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 1 ||
    selectedIndex > state.nextFoundProducts.length
  ) {
    return sendWhatsAppMessage(
      phone,
      "Por favor responde con el número del perfume que deseas agregar 😊"
    );
  }

  const selectedProduct = state.nextFoundProducts[selectedIndex - 1];

  state.selectedProduct = selectedProduct;
  state.step = "ASK_NEXT_QUANTITY";

  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `Seleccionaste: ${selectedProduct.name}

Precio mayorista: ${formatPrice(selectedProduct.wholesalePrice)}

¿Cuántas unidades deseas agregar de este perfume?`
  );
}

function handleNextQuantityStep(phone, text, state) {
  const quantity = Number(text);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return sendWhatsAppMessage(
      phone,
      "Por favor dime cuántas unidades deseas agregar. Ejemplo: 1, 2, 3, 4..."
    );
  }

  addProductToCart(state, state.selectedProduct, quantity);

  state.step = "ASK_ADD_MORE_PRODUCTS";

  states.set(phone, state);

  return sendCartSummaryWithAddMoreQuestion(phone, state);
}

function addProductToCart(state, product, quantity) {
  if (!state.cart) {
    state.cart = [];
  }

  const existingItem = state.cart.find(
    (item) => item.product.id === product.id
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.cart.push({
      product,
      quantity
    });
  }

  calculateCartTotals(state);
}

function calculateCartTotals(state) {
  const cart = state.cart || [];

  const totalUnits = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const isWholesale = totalUnits >= WHOLESALE_MIN_UNITS;

  state.totalUnits = totalUnits;
  state.isWholesale = isWholesale;

  if (!isWholesale) {
    state.totalPrice = null;

    state.cart = cart.map((item) => ({
      ...item,
      unitPrice: null,
      subtotal: null
    }));

    return;
  }

  let totalPrice = 0;

  state.cart = cart.map((item) => {
    const unitPrice = item.product.wholesalePrice;
    const subtotal = unitPrice * item.quantity;

    totalPrice += subtotal;

    return {
      ...item,
      unitPrice,
      subtotal
    };
  });

  state.totalPrice = totalPrice;
}

function sendCartSummaryWithAddMoreQuestion(phone, state) {
  calculateCartTotals(state);

  return sendWhatsAppMessage(
    phone,
    `${buildCartSummary(state)}

¿Deseas agregar otro perfume al pedido?

Responde *sí* para agregar otro o *no* para continuar con tus datos.`
  );
}

function buildCartSummary(state) {
  calculateCartTotals(state);

  if (!state.isWholesale) {
    const cartLines = state.cart
      .map((item, index) => {
        return `${index + 1}. ${item.product.name}
Cantidad: ${item.quantity}`;
      })
      .join("\n\n");

    const missingUnits =
      WHOLESALE_MIN_UNITS - state.totalUnits;

    return `🛒 Resumen de tu pedido:

${cartLines}

Total de productos: ${state.totalUnits}

Para acceder al precio mayorista debes completar mínimo ${WHOLESALE_MIN_UNITS} productos.

Te ${
      missingUnits === 1
        ? "falta 1 producto"
        : `faltan ${missingUnits} productos`
    } para aplicar precio mayorista.

Si deseas continuar con ${state.totalUnits} ${
      state.totalUnits === 1 ? "producto" : "productos"
    }, una asesora confirmará el precio al detal.`;
  }

  const cartLines = state.cart
    .map((item, index) => {
      return `${index + 1}. ${item.product.name}
Cantidad: ${item.quantity}
Precio mayorista unitario: ${formatPrice(item.unitPrice)}
Subtotal: ${formatPrice(item.subtotal)}`;
    })
    .join("\n\n");

  return `🛒 Resumen de tu pedido:

${cartLines}

Total de productos: ${state.totalUnits}
Tipo de precio: Mayorista ✅
Total estimado: ${formatPrice(state.totalPrice)}

Ya aplicas precio mayorista por llevar ${WHOLESALE_MIN_UNITS} productos o más 🎉`;
}

function handleCustomerNameStep(phone, rawText, state) {
  const name = rawText.trim();

  if (name.length < 2 || isInvalidName(name)) {
    return sendWhatsAppMessage(
      phone,
      "Por favor escríbeme tu nombre. Ejemplo: Fabian 😊"
    );
  }

  state.customerName = capitalizeWords(name);
  state.step = "ASK_CITY";

  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `Gracias, ${state.customerName} 😊

¿En qué ciudad estás ubicado/a?`
  );
}

function handleCityStep(phone, rawText, state) {
  const city = rawText.trim();

  if (city.length < 2 || isInvalidCity(city)) {
    return sendWhatsAppMessage(
      phone,
      "Por favor dime la ciudad donde recibirías el pedido. Ejemplo: Medellín, Bello, Bogotá, Cali, etc. 😊"
    );
  }

  state.city = capitalizeWords(city);
  state.step = "ASK_ADDRESS";

  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `Perfecto, ${state.customerName} 😊

Ahora dime la dirección exacta de entrega.

Ejemplo: Calle 10 # 20-30, apto 401, barrio Centro.`
  );
}

function handleAddressStep(phone, rawText, state) {
  const address = rawText.trim();

  if (address.length < 5 || isInvalidAddress(address)) {
    return sendWhatsAppMessage(
      phone,
      "Por favor escríbeme una dirección más completa. Ejemplo: Calle 10 # 20-30, apto 401, barrio Centro 😊"
    );
  }

  state.address = capitalizeWords(address);

  calculateCartTotals(state);

  if (!state.isWholesale) {
    state.step = "ORDER_CONFIRMED";

    states.set(phone, state);

    console.log("\n📦 PEDIDO AL DETAL PENDIENTE DE ASESORA");
    console.log("Cliente:", state.customerName);
    console.log("Teléfono:", phone);
    console.log(buildOwnerCartSummary(state));
    console.log("Ciudad:", state.city);
    console.log("Dirección:", state.address);
    console.log("Estado: precio al detal pendiente de asesora\n");

    return sendWhatsAppMessage(
      phone,
      `Gracias, ${state.customerName} ✅

Tu solicitud quedó preagendada:

${buildCartSummary(state)}

Ciudad: ${state.city}
Dirección: ${state.address}

Como tu pedido tiene menos de ${WHOLESALE_MIN_UNITS} productos, una asesora te confirmará el precio al detal, disponibilidad, método de pago y entrega en horario de atención.

Gracias por confiar en Bendita Fragancia 🖤`
    );
  }

  state.step = "ASK_PAYMENT";

  states.set(phone, state);

  return sendWhatsAppMessage(
    phone,
    `Gracias. Tu pedido ya aplica precio mayorista ✅

¿Qué método de pago prefieres?

1. Transferencia
2. Contraentrega`
  );
}

async function handlePaymentStep(phone, text, state) {
  const paymentMethod = parsePaymentMethod(text);

  if (!paymentMethod) {
    return sendWhatsAppMessage(
      phone,
      `Elige una opción válida:

1. Transferencia
2. Contraentrega`
    );
  }

  calculateCartTotals(state);

  if (!state.isWholesale) {
    state.step = "ORDER_CONFIRMED";

    states.set(phone, state);

    return sendWhatsAppMessage(
      phone,
      `Tu pedido tiene menos de ${WHOLESALE_MIN_UNITS} productos.

Una asesora confirmará el precio al detal y el método de pago contigo.`
    );
  }

  state.paymentMethod = paymentMethod;
  state.step = "ORDER_CONFIRMED";

  states.set(phone, state);

  console.log("\n📦 PEDIDO MAYORISTA PREAGENDADO POR EL BOT");
  console.log("Cliente:", state.customerName);
  console.log("Teléfono:", phone);
  console.log(buildOwnerCartSummary(state));
  console.log("Ciudad:", state.city);
  console.log("Dirección:", state.address);
  console.log("Pago:", state.paymentMethod);
  console.log("Estado: pendiente de revisión por asesoras\n");

  if (paymentMethod === "transferencia") {
    return sendWhatsAppMessage(
      phone,
      `Listo, ${state.customerName} ✅

Tu pedido mayorista queda preagendado para confirmación:

${buildCartSummary(state)}

Ciudad: ${state.city}
Dirección: ${state.address}
Pago: Transferencia

Puedes realizar la transferencia a:

Medio de pago: ${PAYMENT_INFO.bank}
Número: ${PAYMENT_INFO.accountNumber}
Titular: ${PAYMENT_INFO.holderName}

Cuando realices el pago, por favor envía el comprobante por este chat.

Apenas nuestro equipo inicie atención, una asesora validará el pago, disponibilidad, dirección exacta y entrega.

Gracias por confiar en Bendita Fragancia 🖤`
    );
  }

  return sendWhatsAppMessage(
    phone,
    `Listo, ${state.customerName} ✅

Tu pedido mayorista queda preagendado para confirmación:

${buildCartSummary(state)}

Ciudad: ${state.city}
Dirección: ${state.address}
Pago: ${state.paymentMethod}

Apenas nuestro equipo inicie atención, una asesora te escribirá para confirmar disponibilidad, dirección exacta y entrega.

Gracias por confiar en Bendita Fragancia 🖤`
  );
}

function buildOwnerCartSummary(state) {
  calculateCartTotals(state);

  if (!state.isWholesale) {
    const cartLines = state.cart
      .map((item, index) => {
        return `${index + 1}. ${item.product.name} x${item.quantity}`;
      })
      .join("\n");

    return `Productos:
${cartLines}

Total de productos: ${state.totalUnits}
Tipo de precio: Detal pendiente
Total: pendiente de confirmación por asesora`;
  }

  const cartLines = state.cart
    .map((item, index) => {
      return `${index + 1}. ${item.product.name} x${item.quantity}
Precio mayorista unitario: ${formatPrice(item.unitPrice)}
Subtotal: ${formatPrice(item.subtotal)}`;
    })
    .join("\n");

  return `Productos:
${cartLines}

Total de productos: ${state.totalUnits}
Tipo de precio: Mayorista
Total estimado: ${formatPrice(state.totalPrice)}`;
}

function handleHumanHandoff(phone) {
  states.set(phone, { step: "ASK_LEAD_NAME" });

  return sendWhatsAppMessage(
    phone,
    `Claro 😊

Puedo dejar tu solicitud registrada para que una asesora revise este chat en horario de atención.

Nuestro horario de atención con asesoras es de ${HUMAN_ATTENTION_SCHEDULE}.

¿Me regalas tu nombre, por favor?`
  );
}

function handleLeadNameStep(phone, rawText, state) {
  const name = rawText.trim();

  if (name.length < 2) {
    return sendWhatsAppMessage(
      phone,
      "¿Me regalas tu nombre, por favor? 😊"
    );
  }

  state.customerName = capitalizeWords(name);
  state.step = "ASK_LEAD_NEED";

  states.set(phone, state);

  if (state.need) {
    return handleLeadNeedStep(
      phone,
      state.need,
      state
    );
  }

  return sendWhatsAppMessage(
    phone,
    `Gracias, ${state.customerName}. ¿Qué perfume o tipo de aroma estás buscando?`
  );
}

async function handleLeadNeedStep(phone, rawText, state) {
  state.need = rawText.trim();
  state.step = "ORDER_CONFIRMED";

  states.set(phone, state);

  console.log("\n📩 SOLICITUD REGISTRADA POR EL BOT");
  console.log("Cliente:", state.customerName);
  console.log("Teléfono:", phone);
  console.log("Necesidad:", state.need);
  console.log(
    "Horario de atención:",
    HUMAN_ATTENTION_SCHEDULE
  );
  console.log(
    "Estado: pendiente de revisión por asesoras\n"
  );

  return sendWhatsAppMessage(
    phone,
    `Gracias, ${state.customerName} ✅

Dejamos tu solicitud registrada.

Una de nuestras asesoras revisará este chat en horario de atención para ayudarte con:

${state.need}

Gracias por escribirnos 😊

📌 PENDIENTE PARA ASESORA

Cliente solicitó atención personalizada.
Nombre: ${state.customerName}
Teléfono: ${phone}
Necesidad: ${state.need}

Por favor revisar este chat y continuar la atención en horario laboral.`
  );
}

function searchProducts(text) {
  const normalizedText = normalize(text);

  return products
    .filter((product) => {
      if (!product.available) {
        return false;
      }

      const searchableText = normalize(
        [
          product.name,
          product.brand,
          product.gender,
          product.scent,
          ...(product.keywords || [])
        ].join(" ")
      );

      return (
        searchableText.includes(normalizedText) ||
        normalizedText.includes(
          normalize(product.name)
        )
      );
    })
    .slice(0, 5);
}

function getRecommendations(state) {
  const filtered = products.filter((product) => {
    if (!product.available) {
      return false;
    }

    const genderMatches =
      state.gender === "regalo" ||
      product.gender === state.gender ||
      product.gender === "unisex";

    const scentMatches =
      state.scent === "recomendacion" ||
      product.scent === state.scent;

    const budgetMatches = matchesBudget(
      product,
      state.budget
    );

    return (
      genderMatches &&
      scentMatches &&
      budgetMatches
    );
  });

  if (filtered.length >= 3) {
    return filtered.slice(0, 3);
  }

  const combined = [...filtered];

  for (const product of products) {
    if (!product.available) {
      continue;
    }

    const genderMatches =
      state.gender === "regalo" ||
      product.gender === state.gender ||
      product.gender === "unisex";

    if (
      genderMatches &&
      !combined.find(
        (item) => item.id === product.id
      )
    ) {
      combined.push(product);
    }

    if (combined.length === 3) {
      break;
    }
  }

  return combined.slice(0, 3);
}

function matchesBudget(product, budget) {
  const price = product.wholesalePrice;

  if (budget === "economico") {
    return price <= 55000;
  }

  if (budget === "medio") {
    return price > 55000 && price <= 70000;
  }

  if (budget === "premium") {
    return price > 70000;
  }

  return true;
}

function parseGender(text) {
  if (
    text === "1" ||
    text.includes("mujer")
  ) {
    return "mujer";
  }

  if (
    text === "2" ||
    text.includes("hombre")
  ) {
    return "hombre";
  }

  if (
    text === "3" ||
    text.includes("unisex")
  ) {
    return "unisex";
  }

  return null;
}

function parseScent(text) {
  if (
    text === "1" ||
    text.includes("dulce")
  ) {
    return "dulce";
  }

  if (
    text === "2" ||
    text.includes("fresco")
  ) {
    return "fresco";
  }

  if (
    text === "3" ||
    text.includes("elegante")
  ) {
    return "elegante";
  }

  if (
    text === "4" ||
    text.includes("amaderado")
  ) {
    return "amaderado";
  }

  if (
    text === "5" ||
    text.includes("citrico")
  ) {
    return "citrico";
  }

  if (
    text === "6" ||
    text.includes("recomiend")
  ) {
    return "recomendacion";
  }

  return null;
}

function parseBudget(text) {
  if (
    text === "1" ||
    text.includes("economico")
  ) {
    return "economico";
  }

  if (
    text === "2" ||
    text.includes("medio")
  ) {
    return "medio";
  }

  if (
    text === "3" ||
    text.includes("premium")
  ) {
    return "premium";
  }

  if (
    text === "4" ||
    text.includes("opciones")
  ) {
    return "abierto";
  }

  return null;
}

function parsePaymentMethod(text) {
  if (
    text === "1" ||
    text.includes("transferencia")
  ) {
    return "transferencia";
  }

  if (
    text === "2" ||
    text.includes("contraentrega")
  ) {
    return "contraentrega";
  }

  return null;
}

function isYes(text) {
  return (
    text === "si" ||
    text === "sí" ||
    text === "s" ||
    text.includes("claro") ||
    text.includes("agregar") ||
    text.includes("otro")
  );
}

function isNo(text) {
  return (
    text === "no" ||
    text === "n" ||
    text.includes("continuar") ||
    text.includes("finalizar") ||
    text.includes("listo")
  );
}

function isBotAllowedToRespond() {
  const onlyNight =
    process.env.BOT_ONLY_NIGHT === "true";

  if (!onlyNight) {
    return true;
  }

  const timezone =
    process.env.BOT_TIMEZONE ||
    "America/Bogota";

  const startTime =
    process.env.BOT_START_TIME ||
    "18:30";

  const endTime =
    process.env.BOT_END_TIME ||
    "09:00";

  const currentMinutes =
    getCurrentMinutesInTimezone(timezone);

  const startMinutes =
    timeToMinutes(startTime);

  const endMinutes =
    timeToMinutes(endTime);

  if (
    startMinutes === null ||
    endMinutes === null
  ) {
    console.log(
      "Horario del bot mal configurado. El bot responderá por seguridad."
    );

    return true;
  }

  if (startMinutes < endMinutes) {
    return (
      currentMinutes >= startMinutes &&
      currentMinutes < endMinutes
    );
  }

  return (
    currentMinutes >= startMinutes ||
    currentMinutes < endMinutes
  );
}

function getCurrentMinutesInTimezone(timezone) {
  const now = new Date();

  const parts = new Intl.DateTimeFormat(
    "es-CO",
    {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).formatToParts(now);

  const hour = Number(
    parts.find(
      (part) => part.type === "hour"
    )?.value
  );

  const minute = Number(
    parts.find(
      (part) => part.type === "minute"
    )?.value
  );

  return hour * 60 + minute;
}

function timeToMinutes(time) {
  if (!time || !time.includes(":")) {
    return null;
  }

  const [hourText, minuteText] =
    time.split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function normalize(text) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function capitalizeWords(text) {
  return text
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function isInvalidName(name) {
  const normalized = normalize(name);

  const invalidWords = [
    "1",
    "2",
    "3",
    "transferencia",
    "contraentrega",
    "centro",
    "norte",
    "sur",
    "barrio",
    "pago"
  ];

  return invalidWords.includes(normalized);
}

function isInvalidCity(city) {
  const normalized = normalize(city);

  const invalidWords = [
    "1",
    "2",
    "transferencia",
    "contraentrega",
    "pago"
  ];

  return invalidWords.includes(normalized);
}

function isInvalidAddress(address) {
  const normalized = normalize(address);

  const invalidWords = [
    "1",
    "2",
    "transferencia",
    "contraentrega",
    "pago"
  ];

  return invalidWords.includes(normalized);
}