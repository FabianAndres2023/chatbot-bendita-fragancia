const rawProducts = [
  ["ESCADA DE SORBETTO", 45000, 70000],
  ["AMBER OUD DUBAI AQUA", 70000, 90000],
  ["CH 212 SEXY", 40000, 60000],
  ["212 VIP ROSE", 40000, 60000],
  ["AHLI CORVUS", 70000, 90000],
  ["AHLI KARPOS", 70000, 90000],
  ["AHLI VEGA", 70000, 90000],
  ["AFEEF DE LATAFFA", 90000, 120000],
  ["AMBER ROUGE", 70000, 90000],
  ["ROYAL AMBER", 70000, 90000],
  ["OUD SAFRON", 70000, 90000],
  ["BACCARAT ROUGE", 45000, 65000],
  ["NOBLE BLUSH", 70000, 90000],
  ["AMETHYST", 70000, 90000],
  ["HONOR Y GLORY", 70000, 90000],
  ["SUBLIME", 70000, 90000],
  ["BOMBSHELL", 40000, 60000],
  ["SWEET LIKE CANDY", 40000, 60000],
  ["BRIGHT CRYSTAL", 40000, 60000],
  ["CAN CAN", 40000, 60000],
  ["ODYSSEY CANDEE", 60000, 80000],
  ["ODYSSEY MASRMALLOW", 60000, 80000],
  ["CH WOMAN", 40000, 60000],
  ["CHANCE CHANEL", 40000, 60000],
  ["BOMBA CH", 70000, 100000],
  ["ECLAIRE", 85000, 120000],
  ["CKIN2U FOR HER", 45000, 65000],
  ["360 DAMA", 45000, 65000],
  ["CLOUD", 55000, 70000],
  ["CLOUD PINK", 60000, 80000],
  ["COCO MADEMOISELLE", 40000, 60000],
  ["RALPH LAUREN", 40000, 60000],
  ["D&G DEVOTION", 45000, 70000],
  ["JEAN PAUL DIVINE", 55000, 75000],
  ["VALENTINO DONNA PINK", 40000, 60000],
  ["ETERNITY CALVIN", 40000, 60000],
  ["ATHEERI LATAFFA", 85000, 110000],
  ["MUSAMAN WHITE", 75000, 110000],
  ["FANTASY", 40000, 60000],
  ["FANTASY MINDNIGHT", 45000, 60000],
  ["KENZO FLOWER", 40000, 60000],
  ["MOSCHINO FRESH", 40000, 60000],
  ["HAYA LATAFFA", 70000, 90000],
  ["BURBERRY HER", 45000, 60000],
  ["MUSAMAN BLACK", 75000, 115000],
  ["PARIS HILTON HEIRESS", 40000, 60000],
  ["GOOD GIRL VERY", 45000, 60000],
  ["PARIS HILTON DAMA", 40000, 60000],
  ["LIGHT BLUE DAMA", 40000, 60000],
  ["BELLA GAULTIER", 45000, 60000],
  ["LADY MILLION", 40000, 60000],
  ["MISS DIOR", 45000, 65000],
  ["JADORE DIOR", 45000, 60000],
  ["LA VIDA ES BELLA", 40000, 60000],
  ["ISSEY MIYAKEE DAMA", 40000, 60000],
  ["MEOW KATTY PERRY", 40000, 60000],
  ["BVLGARI CRISTAL", 40000, 60000],
  ["BVLGARI CORAL", 40000, 60000],
  ["BVLGARI AMATYST", 40000, 60000],
  ["SCANDAL FOR HIM JEAN PAUL GAULTIER", 50000, 70000],
  ["GOOD GIRL TACON AZUL", 40000, 60000],
  ["GOOD GIRL BLUSH", 40000, 60000],
  ["THANK U NEXT", 50000, 70000],
  ["SHAHEEN GOLD LATTAFA", 70000, 90000],
  ["SWEET CANDY ARIANA GRANDE", 45000, 65000],
  ["THE SCENT HER HUGO BOSS", 40000, 60000],
  ["TOMMY HILFIGER GIRL", 40000, 60000],
  ["YARA LATTAFA", 55000, 70000],
  ["YARA CANDY LATTAFA", 55000, 70000],
  ["YARA MOI LATTAFA", 55000, 70000],
  ["YARA TOUS LATTAFA", 55000, 70000],
  ["BON BON ARMAF", 85000, 115000],
  ["BHARARA ROSE", 70000, 90000],
  ["MARSMALLOW BLUSH", 85000, 115000],
  ["HER CONFESSION", 75000, 110000],
  ["MAYAR LATTAFA", 70000, 90000],
  ["MAYAR CHERRY", 60000, 90000],
  ["DYLAN BLUE", 40000, 60000],
  ["VULCAN BAIE", 75000, 100000],
  ["TOY 2 MOSCHINO", 55000, 70000],
  ["BUBBLE GUM MOSCHINO", 55000, 70000],
  ["TOY 2 PEARL MOSCHINO", 60000, 80000],
  ["TOUCH PINK LACOSTE", 40000, 60000],
  ["ISLAND BREEZE", 85000, 115000],
  ["ISLAND BLISS", 85000, 115000],
  ["YUMYUM", 85000, 115000],
  ["NOW WOMAN", 60000, 80000],
  ["HAWAS ICE", 55000, 70000],
  ["HAWAS FOR HIM", 55000, 70000],
  ["HAWAS ELIXIR", 55000, 70000],
  ["HAWAS FIRE", 55000, 70000],
  ["212 VIP MEN", 45000, 65000],
  ["212 VIP BLACK", 45000, 65000],
  ["212 NYC", 45000, 60000],
  ["9PM", 50000, 70000],
  ["9PM REBEL", 70000, 100000],
  ["HERBA PURE XER JOFF", 70000, 100000],
  ["9PM NIGTH OUD", 85000, 120000],
  ["AQUA DI GIO MEN", 40000, 60000],
  ["AQUA DI GIO PROFUMO", 40000, 60000],
  ["ALHARAMAIN AMBER OUD", 70000, 90000],
  ["360 MEN", 45000, 60000],
  ["BVLGARI AQUA", 45000, 60000],
  ["BERGAMOTA 22", 50000, 70000],
  ["ARSENAL", 45000, 70000],
  ["ARABIANS TONKA", 50000, 70000],
  ["STARRY NIGHT", 50000, 70000],
  ["CREED AVENTUS", 45000, 60000],
  ["CREED SILVER", 45000, 60000],
  ["BLACK XS LEXCES", 40000, 60000],
  ["BAD BOY", 45000, 60000],
  ["BLEU CHANEL", 40000, 60000],
  ["BLUE SEDUCTION", 40000, 60000],
  ["VALENTINO BORN IN ROMA", 50000, 70000],
  ["CH CABALLERO", 45000, 65000],
  ["BVLGARI MAN IN BLACK", 40000, 60000],
  ["IMAGINATION", 70000, 90000],
  ["LEGEND SPIRIT MONTBLANC", 40000, 60000],
  ["LEGEND MONTBLANC", 40000, 60000],
  ["CKIN2U CABALLERO", 40000, 60000],
  ["CK ONE", 40000, 60000],
  ["CLUB DE NUIT", 55000, 80000],
  ["EAU FRAICHE", 40000, 60000],
  ["EROS FLAME", 40000, 60000],
  ["EROS ENERGY", 40000, 60000],
  ["EROS VERSACE", 40000, 60000],
  ["SWISS ARMY VICTORINOX", 40000, 60000],
  ["ETERNITY FOR MEN", 40000, 60000],
  ["FAHRENHEIT", 40000, 60000],
  ["FACKAR NEGRA", 70000, 90000],
  ["FACKAR BLANCA", 70000, 90000],
  ["HUGO BOSS RED", 40000, 60000],
  ["THE SCENT HUGO BOSS", 40000, 60000],
  ["HUGO BOSS UNLIMITED", 40000, 60000],
  ["HUGO BOSS ORANGE", 40000, 60000],
  ["INVICTUS VICTORY ELIXIR", 45000, 60000],
  ["INVICTUS", 40000, 60000],
  ["INVICTUS PARFUM", 45000, 60000],
  ["INVICTUS VICTORY", 45000, 60000],
  ["NAUTICA", 40000, 60000],
  ["ISSEY MIYAKEE CABALLERO", 40000, 60000],
  ["PARIS HILTON FOR MEN", 40000, 60000],
  ["KING", 40000, 60000],
  ["KAMRAH", 70000, 90000],
  ["KAMRAH QWA", 70000, 90000],
  ["KAMRAH DUQUE", 70000, 90000],
  ["LACOSTE NEGRA", 40000, 60000],
  ["LACOSTE ROJA", 40000, 60000],
  ["LACOSTE ROJA HUEVO", 40000, 60000],
  ["LACOSTE BLANCA", 40000, 60000],
  ["LACOSTE VERDE", 40000, 60000],
  ["LAPIDUS", 40000, 60000],
  ["LEBEAU", 60000, 80000],
  ["GARDEN GAULTIER", 55000, 70000],
  ["LEMALE PARFUM", 60000, 80000],
  ["LEMALE GAULTIER", 55000, 70000],
  ["ULTRA MALE", 55000, 70000],
  ["ELIXIRR GAULTIER", 55000, 75000],
  ["SANTAL 33", 50000, 70000],
  ["SPICE BOMB", 45000, 65000],
  ["SCANDAL JEAN PAUL GAULTIER", 40000, 60000],
  ["AMBER OUD DUBAI NIGTH", 70000, 90000],
  ["SAUVAGE DIOR", 40000, 60000],
  ["MANDARIN SKY", 55000, 75000],
  ["MANDARIN SKY ELIXIR", 60000, 80000],
  ["ODYSSEY MEGA", 60000, 80000],
  ["ODYSSEY AOUD", 60000, 80000],
  ["ODYSSEY HOMME WHITE", 60000, 80000],
  ["ODYSSEY AQUA", 60000, 80000],
  ["ODYSSEY LIMONI", 60000, 80000],
  ["ODYSSEY WILD ONE", 60000, 80000],
  ["ODYSSEY HOMME", 55000, 70000],
  ["ODYSSEY SPECTRA", 60000, 80000],
  ["ODYSSEY BAHAMAS", 60000, 80000],
  ["ODYSSEY TYRANT", 60000, 80000],
  ["ODYSSEY CHOCOLATE", 60000, 80000],
  ["ODYSSEY MANGO", 60000, 80000],
  ["ALTHAIR DE MARLY", 45000, 70000],
  ["BHARARA ONIX", 80000, 110000],
  ["STARWALKER", 40000, 60000],
  ["THE ONE", 40000, 60000],
  ["TOMMY HILFIGER", 40000, 60000],
  ["TOY BOY", 55000, 75000],
  ["OMBRE NOMADE", 70000, 90000],
  ["ONE MILLION", 40000, 60000],
  ["ONE MILLION LUCKY", 40000, 60000],
  ["OUD FOR GLORY", 70000, 85000],
  ["ASAD LATAFFA", 55000, 75000],
  ["ASAD BOURBON", 55000, 75000],
  ["ASAD SANZIBAR", 55000, 75000],
  ["ASAD ELIXIR", 60000, 85000],
  ["ART OF UNIVERS", 85000, 110000],
  ["BHARARA KING", 70000, 100000],
  ["HIS CONFESSION", 75000, 110000],
  ["VULCAN FEU", 75000, 110000],
  ["EMEER LATAFFA", 85000, 110000],
  ["BIANCO LATTE", 60000, 90000],
  ["SUMMER HAMMER", 50000, 80000],
  ["KHAMRAH ZANQAM", 80000, 120000],
  ["VANILLA FREAK", 85000, 110000],
  ["WHIPPED PLEASURE", 85000, 110000],
  ["BERRY ON TOP", 85000, 110000],
  ["COOKIE CRAVE", 85000, 110000],
  ["CHOCO OVERDOSE", 85000, 110000],
  ["MALLOW MADNESS", 85000, 110000]
];

function inferGender(name) {
  const text = name.toLowerCase();

  const womenKeywords = [
    "dama",
    "woman",
    "girl",
    "her",
    "rose",
    "pink",
    "lady",
    "miss",
    "good girl",
    "yara",
    "bombshell",
    "candy",
    "cloud",
    "burberry her",
    "chanel",
    "j'adore",
    "jadore",
    "meow",
    "bella",
    "divine"
  ];

  const menKeywords = [
    "men",
    "caballero",
    "for him",
    "homme",
    "boy",
    "king",
    "asad",
    "invictus",
    "sauvage",
    "eros",
    "boss",
    "nautica",
    "212 vip men",
    "9pm",
    "bad boy",
    "one million"
  ];

  if (womenKeywords.some((word) => text.includes(word))) {
    return "mujer";
  }

  if (menKeywords.some((word) => text.includes(word))) {
    return "hombre";
  }

  return "unisex";
}

function inferScent(name) {
  const text = name.toLowerCase();

  const sweetKeywords = [
    "candy",
    "cloud",
    "yara",
    "marsh",
    "mallow",
    "choco",
    "chocolate",
    "cookie",
    "vanilla",
    "vainilla",
    "eclaire",
    "fantasy",
    "million",
    "good girl",
    "bon bon",
    "whipped",
    "berry"
  ];

  const freshKeywords = [
    "aqua",
    "ice",
    "fresh",
    "blue",
    "bleu",
    "nautica",
    "fraiche",
    "bergamota",
    "limoni",
    "gio",
    "hawas",
    "light blue"
  ];

  const woodyKeywords = [
    "oud",
    "tonka",
    "santal",
    "amber",
    "black",
    "asado",
    "asad",
    "fackar",
    "ombre",
    "spice"
  ];

  const citrusKeywords = [
    "limoni",
    "bergamota",
    "mandarin",
    "citrus"
  ];

  if (citrusKeywords.some((word) => text.includes(word))) {
    return "citrico";
  }

  if (sweetKeywords.some((word) => text.includes(word))) {
    return "dulce";
  }

  if (freshKeywords.some((word) => text.includes(word))) {
    return "fresco";
  }

  if (woodyKeywords.some((word) => text.includes(word))) {
    return "amaderado";
  }

  return "elegante";
}

function inferBrand(name) {
  const text = name.toLowerCase();

  if (text.includes("ch ") || text.includes("212") || text.includes("good girl")) {
    return "Carolina Herrera";
  }

  if (text.includes("chanel")) return "Chanel";
  if (text.includes("dior") || text.includes("sauvage")) return "Dior";
  if (text.includes("versace") || text.includes("eros")) return "Versace";
  if (text.includes("moschino") || text.includes("toy boy")) return "Moschino";
  if (text.includes("lattafa") || text.includes("lataffa") || text.includes("asad")) return "Lattafa";
  if (text.includes("hugo boss") || text.includes("boss")) return "Hugo Boss";
  if (text.includes("lacoste")) return "Lacoste";
  if (text.includes("paris hilton")) return "Paris Hilton";
  if (text.includes("ariana grande")) return "Ariana Grande";
  if (text.includes("calvin") || text.includes("ck ")) return "Calvin Klein";
  if (text.includes("bvlgari")) return "Bvlgari";
  if (text.includes("jean paul") || text.includes("gaultier")) return "Jean Paul Gaultier";
  if (text.includes("tommy hilfiger")) return "Tommy Hilfiger";
  if (text.includes("montblanc") || text.includes("starwalker")) return "Montblanc";
  if (text.includes("bharara")) return "Bharara";
  if (text.includes("odyssey")) return "Armaf";
  if (text.includes("armaf")) return "Armaf";
  if (text.includes("creed")) return "Creed";
  if (text.includes("paco") || text.includes("million") || text.includes("invictus")) return "Paco Rabanne";

  return "Varios";
}

export const products = rawProducts.map(
  ([name, wholesalePrice, retailPrice], index) => ({
    id: index + 1,
    name,
    brand: inferBrand(name),
    gender: inferGender(name),
    scent: inferScent(name),
    wholesalePrice,
    retailPrice,
    available: true,
    keywords: [
      name.toLowerCase(),
      name.toLowerCase().replace(/\s+/g, ""),
      ...name.toLowerCase().split(" ")
    ],
    description: `Aroma ${inferScent(name)}, opción ${inferGender(name)} disponible en el catálogo actualizado de Bendita Fragancia.`
  })
);

export function formatPrice(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}