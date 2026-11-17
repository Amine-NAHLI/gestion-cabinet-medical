export interface MoroccanCity {
  id: string;
  name: string;
  region: string;
}

export const MOROCCAN_CITIES: MoroccanCity[] = [
  // Région Casablanca-Settat
  { id: "casablanca", name: "Casablanca", region: "Casablanca-Settat" },
  { id: "mohammadia", name: "Mohammédia", region: "Casablanca-Settat" },
  { id: "el-jadida", name: "El Jadida", region: "Casablanca-Settat" },
  { id: "settat", name: "Settat", region: "Casablanca-Settat" },
  { id: "berrechid", name: "Berrechid", region: "Casablanca-Settat" },
  { id: "benslimane", name: "Ben Slimane", region: "Casablanca-Settat" },
  { id: "bouznika", name: "Bouznika", region: "Casablanca-Settat" },
  { id: "sidi-bennour", name: "Sidi Bennour", region: "Casablanca-Settat" },
  { id: "azemmour", name: "Azemmour", region: "Casablanca-Settat" },
  { id: "bouskoura", name: "Bouskoura", region: "Casablanca-Settat" },
  { id: "dar-bouazza", name: "Dar Bouazza", region: "Casablanca-Settat" },
  { id: "had-soualem", name: "Had Soualem", region: "Casablanca-Settat" },
  { id: "mediouna", name: "Médiouna", region: "Casablanca-Settat" },
  { id: "nouaceur", name: "Nouaceur", region: "Casablanca-Settat" },
  { id: "tit-mellil", name: "Tit Mellil", region: "Casablanca-Settat" },
  { id: "ain-harrouda", name: "Aïn Harrouda", region: "Casablanca-Settat" },
  { id: "deroua", name: "Deroua", region: "Casablanca-Settat" },
  { id: "el-mansouria", name: "El Mansouria", region: "Casablanca-Settat" },
  { id: "bir-jdid", name: "Bir Jdid", region: "Casablanca-Settat" },
  { id: "oualidia", name: "Oualidia", region: "Casablanca-Settat" },
  { id: "khmiss-zmamra", name: "Zmamra", region: "Casablanca-Settat" },

  // Région Rabat-Salé-Kénitra
  { id: "rabat", name: "Rabat", region: "Rabat-Salé-Kénitra" },
  { id: "sale", name: "Salé", region: "Rabat-Salé-Kénitra" },
  { id: "temara", name: "Témara", region: "Rabat-Salé-Kénitra" },
  { id: "skhirat", name: "Skhirat", region: "Rabat-Salé-Kénitra" },
  { id: "kenitra", name: "Kénitra", region: "Rabat-Salé-Kénitra" },
  { id: "khemisset", name: "Khémisset", region: "Rabat-Salé-Kénitra" },
  { id: "tiflet", name: "Tiflet", region: "Rabat-Salé-Kénitra" },
  { id: "sidi-kacem", name: "Sidi Kacem", region: "Rabat-Salé-Kénitra" },
  { id: "sidi-slimane", name: "Sidi Slimane", region: "Rabat-Salé-Kénitra" },
  { id: "sidi-yahya-gharba", name: "Sidi Yahya El Gharb", region: "Rabat-Salé-Kénitra" },
  { id: "mechra-bel-ksiri", name: "Mechra Bel Ksiri", region: "Rabat-Salé-Kénitra" },
  { id: "souk-el-arbaa", name: "Souk El Arbaa du Gharb", region: "Rabat-Salé-Kénitra" },
  { id: "harhoura", name: "Harhoura", region: "Rabat-Salé-Kénitra" },
  { id: "ain-el-aouda", name: "Aïn El Aouda", region: "Rabat-Salé-Kénitra" },
  { id: "sidi-bouknadel", name: "Sidi Bouknadel", region: "Rabat-Salé-Kénitra" },
  { id: "mehdya", name: "Mehdya", region: "Rabat-Salé-Kénitra" },
  { id: "moulay-bousselham", name: "Moulay Bousselham", region: "Rabat-Salé-Kénitra" },
  { id: "rommani", name: "Rommani", region: "Rabat-Salé-Kénitra" },

  // Région Tanger-Tétouan-Al Hoceïma
  { id: "tanger", name: "Tanger", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "tetouan", name: "Tétouan", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "al-hoceima", name: "Al Hoceïma", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "larache", name: "Larache", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "ksar-el-kebir", name: "Ksar El Kébir", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "chefchaouen", name: "Chefchaouen", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "ouazzane", name: "Ouazzane", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "fnideq", name: "Fnideq", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "m-diq", name: "M'diq", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "martil", name: "Martil", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "asilah", name: "Asilah", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "imzouren", name: "Imzouren", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "beni-bouayach", name: "Béni Bouayach", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "ksar-sghir", name: "Ksar Sghir", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "gzennaia", name: "Gzennaïa", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "oued-laou", name: "Oued Laou", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "bab-berred", name: "Bab Berred", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "bab-taza", name: "Bab Taza", region: "Tanger-Tétouan-Al Hoceïma" },
  { id: "jebha", name: "Jebha", region: "Tanger-Tétouan-Al Hoceïma" },

  // Région Fès-Meknès
  { id: "fes", name: "Fès", region: "Fès-Meknès" },
  { id: "meknes", name: "Meknès", region: "Fès-Meknès" },
  { id: "taza", name: "Taza", region: "Fès-Meknès" },
  { id: "sefrou", name: "Sefrou", region: "Fès-Meknès" },
  { id: "zouagha", name: "Zouagha", region: "Fès-Meknès" },
  { id: "taounate", name: "Taounate", region: "Fès-Meknès" },
  { id: "el-hajeb", name: "El Hajeb", region: "Fès-Meknès" },
  { id: "ifrane", name: "Ifrane", region: "Fès-Meknès" },
  { id: "azrou", name: "Azrou", region: "Fès-Meknès" },
  { id: "boulemane", name: "Boulemane", region: "Fès-Meknès" },
  { id: "missour", name: "Missour", region: "Fès-Meknès" },
  { id: "outat-el-haj", name: "Outat El Haj", region: "Fès-Meknès" },
  { id: "bhalil", name: "Bhalil", region: "Fès-Meknès" },
  { id: "immouzzer-kandar", name: "Immouzzer Kandar", region: "Fès-Meknès" },
  { id: "ain-taoujdate", name: "Aïn Taoujdate", region: "Fès-Meknès" },
  { id: "agourai", name: "Agouraï", region: "Fès-Meknès" },
  { id: "tissa", name: "Tissa", region: "Fès-Meknès" },
  { id: "tahar-souk", name: "Thar Es-Souk", region: "Fès-Meknès" },
  { id: "moulay-yacoub", name: "Moulay Yacoub", region: "Fès-Meknès" },

  // Région Marrakech-Safi
  { id: "marrakech", name: "Marrakech", region: "Marrakech-Safi" },
  { id: "safi", name: "Safi", region: "Marrakech-Safi" },
  { id: "essaouira", name: "Essaouira", region: "Marrakech-Safi" },
  { id: "el-kelaa-sraghna", name: "El Kelaâ des Sraghna", region: "Marrakech-Safi" },
  { id: "ben-guerir", name: "Ben Guerir", region: "Marrakech-Safi" },
  { id: "youssoufia", name: "Youssoufia", region: "Marrakech-Safi" },
  { id: "chichaoua", name: "Chichaoua", region: "Marrakech-Safi" },
  { id: "imintanout", name: "Imintanout", region: "Marrakech-Safi" },
  { id: "tahannaout", name: "Tahannaout", region: "Marrakech-Safi" },
  { id: "ait-ourir", name: "Aït Ourir", region: "Marrakech-Safi" },
  { id: "ourika", name: "Ourika", region: "Marrakech-Safi" },
  { id: "asni", name: "Asni", region: "Marrakech-Safi" },
  { id: "amizmiz", name: "Amizmiz", region: "Marrakech-Safi" },
  { id: "tamallalt", name: "Tamallalt", region: "Marrakech-Safi" },
  { id: "laattaouia", name: "Laâttaouia", region: "Marrakech-Safi" },
  { id: "sidi-bou-othman", name: "Sidi Bou Othman", region: "Marrakech-Safi" },
  { id: "skhour-rhamna", name: "Skhour Rhamna", region: "Marrakech-Safi" },
  { id: "chemmaia", name: "Chemmaia", region: "Marrakech-Safi" },
  { id: "sebt-gzoula", name: "Sebt Gzoula", region: "Marrakech-Safi" },
  { id: "tamanar", name: "Tamanar", region: "Marrakech-Safi" },

  // Région Souss-Massa
  { id: "agadir", name: "Agadir", region: "Souss-Massa" },
  { id: "inezgane", name: "Inezgane", region: "Souss-Massa" },
  { id: "ait-melloul", name: "Aït Melloul", region: "Souss-Massa" },
  { id: "dcheira-el-jihadia", name: "Dcheira El Jihadia", region: "Souss-Massa" },
  { id: "taroudant", name: "Taroudant", region: "Souss-Massa" },
  { id: "tiznit", name: "Tiznit", region: "Souss-Massa" },
  { id: "oulad-teima", name: "Oulad Teïma", region: "Souss-Massa" },
  { id: "biougra", name: "Biougra", region: "Souss-Massa" },
  { id: "tata", name: "Tata", region: "Souss-Massa" },
  { id: "tafraout", name: "Tafraout", region: "Souss-Massa" },
  { id: "aourir", name: "Aourir", region: "Souss-Massa" },
  { id: "taghazout", name: "Taghazout", region: "Souss-Massa" },
  { id: "drarga", name: "Drarga", region: "Souss-Massa" },
  { id: "lqliâa", name: "Lqliâa", region: "Souss-Massa" },
  { id: "massa", name: "Massa", region: "Souss-Massa" },
  { id: "oulad-berhil", name: "Oulad Berhil", region: "Souss-Massa" },
  { id: "aoulouz", name: "Aoulouz", region: "Souss-Massa" },
  { id: "taliouine", name: "Taliouine", region: "Souss-Massa" },
  { id: "igherm", name: "Igherm", region: "Souss-Massa" },

  // Région Béni Mellal-Khénifra
  { id: "beni-mellal", name: "Béni Mellal", region: "Béni Mellal-Khénifra" },
  { id: "khouribga", name: "Khouribga", region: "Béni Mellal-Khénifra" },
  { id: "fquih-ben-salah", name: "Fquih Ben Salah", region: "Béni Mellal-Khénifra" },
  { id: "khenifra", name: "Khénifra", region: "Béni Mellal-Khénifra" },
  { id: "azilal", name: "Azilal", region: "Béni Mellal-Khénifra" },
  { id: "oued-zem", name: "Oued Zem", region: "Béni Mellal-Khénifra" },
  { id: "kasba-tadla", name: "Kasba Tadla", region: "Béni Mellal-Khénifra" },
  { id: "souk-sebt-ouled-nemma", name: "Souk Sebt Oulad Nemma", region: "Béni Mellal-Khénifra" },
  { id: "demnate", name: "Demnate", region: "Béni Mellal-Khénifra" },
  { id: "zawyat-cheikh", name: "Zaouïat Cheikh", region: "Béni Mellal-Khénifra" },
  { id: "mrirt", name: "M'rirt", region: "Béni Mellal-Khénifra" },
  { id: "bejaad", name: "Boujniba / Bejaâd", region: "Béni Mellal-Khénifra" },
  { id: "el-ksiba", name: "El Ksiba", region: "Béni Mellal-Khénifra" },
  { id: "aghbala", name: "Aghbala", region: "Béni Mellal-Khénifra" },
  { id: "afourar", name: "Afourar", region: "Béni Mellal-Khénifra" },
  { id: "bennour", name: "Oulad Ayad", region: "Béni Mellal-Khénifra" },

  // Région Oriental
  { id: "oujda", name: "Oujda", region: "Oriental" },
  { id: "nador", name: "Nador", region: "Oriental" },
  { id: "berkane", name: "Berkane", region: "Oriental" },
  { id: "taourirt", name: "Taourirt", region: "Oriental" },
  { id: "guercif", name: "Guercif", region: "Oriental" },
  { id: "jerada", name: "Jerada", region: "Oriental" },
  { id: "driouch", name: "Driouch", region: "Oriental" },
  { id: "figuig", name: "Figuig", region: "Oriental" },
  { id: "bouarfa", name: "Bouarfa", region: "Oriental" },
  { id: "ahfir", name: "Ahfir", region: "Oriental" },
  { id: "saidia", name: "Saïdia", region: "Oriental" },
  { id: "zaio", name: "Zaïo", region: "Oriental" },
  { id: "el-aaiun-sidi-mellouk", name: "El Aïoun Sidi Mellouk", region: "Oriental" },
  { id: "selouane", name: "Selouane", region: "Oriental" },
  { id: "al-aroui", name: "Al Aroui", region: "Oriental" },
  { id: "midar", name: "Midar", region: "Oriental" },
  { id: "ben-taieb", name: "Ben Taïeb", region: "Oriental" },

  // Région Drâa-Tafilalet
  { id: "errachidia", name: "Errachidia", region: "Drâa-Tafilalet" },
  { id: "ouarzazate", name: "Ouarzazate", region: "Drâa-Tafilalet" },
  { id: "midelt", name: "Midelt", region: "Drâa-Tafilalet" },
  { id: "tinghir", name: "Tinghir", region: "Drâa-Tafilalet" },
  { id: "zagora", name: "Zagora", region: "Drâa-Tafilalet" },
  { id: "erfoud", name: "Erfoud", region: "Drâa-Tafilalet" },
  { id: "rissani", name: "Rissani", region: "Drâa-Tafilalet" },
  { id: "goulmima", name: "Goulmima", region: "Drâa-Tafilalet" },
  { id: "tinjdad", name: "Tinjdad", region: "Drâa-Tafilalet" },
  { id: "kalaat-m-gouna", name: "Kelaat M'Gouna", region: "Drâa-Tafilalet" },
  { id: "boumalne-dades", name: "Boumalne Dadès", region: "Drâa-Tafilalet" },
  { id: "taznakht", name: "Taznakht", region: "Drâa-Tafilalet" },
  { id: "agdz", name: "Agdz", region: "Drâa-Tafilalet" },
  { id: "er-rich", name: "Er-Rich", region: "Drâa-Tafilalet" },
  { id: "boudnib", name: "Boudnib", region: "Drâa-Tafilalet" },

  // Région Laâyoune-Sakia El Hamra
  { id: "laayoune", name: "Laâyoune", region: "Laâyoune-Sakia El Hamra" },
  { id: "boujdour", name: "Boujdour", region: "Laâyoune-Sakia El Hamra" },
  { id: "tarfaya", name: "Tarfaya", region: "Laâyoune-Sakia El Hamra" },
  { id: "smara", name: "Es-Semara", region: "Laâyoune-Sakia El Hamra" },
  { id: "el-marsa", name: "El Marsa", region: "Laâyoune-Sakia El Hamra" },

  // Région Guelmim-Oued Noun
  { id: "guelmim", name: "Guelmim", region: "Guelmim-Oued Noun" },
  { id: "tan-tan", name: "Tan-Tan", region: "Guelmim-Oued Noun" },
  { id: "sidi-ifni", name: "Sidi Ifni", region: "Guelmim-Oued Noun" },
  { id: "assa", name: "Assa", region: "Guelmim-Oued Noun" },
  { id: "zag", name: "Zag", region: "Guelmim-Oued Noun" },
  { id: "bouizakarne", name: "Bouizakarne", region: "Guelmim-Oued Noun" },
  { id: "el-ouatia", name: "El Ouatia", region: "Guelmim-Oued Noun" },

  // Région Dakhla-Oued Ed-Dahab
  { id: "dakhla", name: "Dakhla", region: "Dakhla-Oued Ed-Dahab" },
  { id: "aousserd", name: "Aousserd", region: "Dakhla-Oued Ed-Dahab" },
  { id: "bir-gandouz", name: "Bir Gandouz", region: "Dakhla-Oued Ed-Dahab" },
];

// Helper de recherche instantanée insensible aux accents et à la casse avec tri par pertinence
export function searchMoroccanCities(query: string): MoroccanCity[] {
  if (!query || !query.trim()) {
    return MOROCCAN_CITIES;
  }

  const cleanQuery = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const matches = MOROCCAN_CITIES.filter((city) => {
    const cleanName = city.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const cleanRegion = city.region
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return cleanName.includes(cleanQuery) || cleanRegion.includes(cleanQuery);
  });

  // Trier par pertinence : nom qui commence par le mot > nom qui contient le mot > région
  return matches.sort((a, b) => {
    const aName = a.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const bName = b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const aStarts = aName.startsWith(cleanQuery);
    const bStarts = bName.startsWith(cleanQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    const aContains = aName.includes(cleanQuery);
    const bContains = bName.includes(cleanQuery);
    if (aContains && !bContains) return -1;
    if (!aContains && bContains) return 1;

    return a.name.localeCompare(b.name, "fr");
  });
}
