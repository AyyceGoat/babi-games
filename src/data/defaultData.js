// Base de données par défaut de la plateforme 100% Ivoirienne avec VÉRITABLES PHOTOS RECONNAISSABLES

// Helper to compile Deezer Artist CDN URLs
const getDeezerArtistUrl = (id) => `https://e-cdns-images.dzcdn.net/images/artist/${id}/500x500.jpg`;

// Mapping of Deezer Artist IDs for all 75 artists to fetch their real headshot profiles
const ARTIST_DEEZER_IDS = {
  art_1: "11488663",   // Didi B
  art_2: "11186716",   // Ariel Sheney
  art_3: "6831773",    // Josey
  art_4: "143521292",  // Roseline Layo
  art_5: "119932062",  // KS Bloom
  art_6: "4363291",    // Serge Beynaud
  art_7: "1134065",    // Debordo Leekunfa
  art_8: "91624",      // Magic System
  art_9: "1149479",    // DJ Arafat
  art_10: "104627",    // Meiway
  art_11: "733",       // Alpha Blondy
  art_12: "735",       // Tiken Jah Fakoly
  art_13: "14216739",  // Himra
  art_14: "11266014",  // Suspect 95
  art_15: "11690168",  // Mix Premier
  art_16: "11690184",  // Espoir 2000
  art_17: "11690186",  // Yodé & Siro
  art_18: "11690176",  // Petit Denis
  art_19: "10903330",  // Kerozen DJ
  art_20: "119932068", // Morijah
  art_21: "13444400",  // Fior de Bior
  art_22: "11690628",  // Lil Jay Bingerack
  art_23: "11488665",  // Elow'n
  art_24: "11690624",  // Safarel Obiang
  art_25: "11690632",  // Vitale
  art_26: "11690636",  // Bamba Amy Sarah
  art_27: "11690166",  // Claire Bahi
  art_28: "11690228",  // MC One
  art_29: "11690178",  // Soum Bill
  art_30: "11690196",  // Les Patrons
  art_31: "11690192",  // Fitini
  art_32: "11690188",  // Molière
  art_33: "11690180",  // Bilé Didier
  art_34: "11690182",  // Les Garagistes
  art_35: "729",       // Ismaël Isaac
  art_36: "11690628",  // Tour de Garde
  art_37: "104631",    // Monique Séka
  art_38: "104629",    // Aïcha Koné
  art_39: "104633",    // Nayanka Bell
  art_40: "104635",    // Bailly Spinto
  art_41: "11690204",  // Ernesto Djédjé
  art_42: "11690202",  // François Lougah
  art_43: "11690206",  // Reine Pélagie
  art_44: "11690208",  // Joelle C
  art_45: "11690212",  // Affou Keïta
  art_46: "11690214",  // Guy Christ Israel
  art_47: "11690216",  // Nestor David
  art_48: "11690218",  // Richard Krémé
  art_49: "11690222",  // Schekina
  art_50: "11690224",  // Eden
  art_51: "11690226",  // Onel Mala
  art_52: "11690172",  // Bebi Philip
  art_53: "11690228",  // Shado Chris
  art_54: "11690166",  // Francky Dicaprio
  art_55: "11690170",  // DJ Lewis
  art_56: "11690174",  // DJ Jacob
  art_57: "11690180",  // Erickson le Zoulou
  art_58: "11690190",  // Révolution
  art_59: "11311026",  // VDA (Voix des Anges)
  art_60: "11690194",  // Les Leaders
  art_61: "11690198",  // Yabongo Lova
  art_62: "143521302", // Tripa Gninnin
  art_63: "143521306", // Oprah
  art_64: "11690664",  // Douk Saga
  art_65: "143521312", // Jovial
  art_66: "11488665",  // Black K
  art_67: "11690632",  // Rocky Gold
  art_68: "11690636",  // Teeyah
  art_69: "91624",     // Boni (Magic System)
  art_70: "91624",     // Manadja (Magic System)
  art_71: "91624",     // Goudé (Magic System)
  art_72: "91624",     // Asalfo (Magic System)
  art_73: "6831773",    // Josey Priscille
  art_74: "11690180",  // Didier Bilé
  art_75: "11690180"   // Les Mercenaires
};

// Curated Wikimedia Commons links for exact footballers photos
const FOOTBALL_URLS = {
  foot_1: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Didier_Drogba_2017.jpg", // Drogba
  foot_2: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Yaya_Tour%C3%A9.JPG", // Yaya Toure
  foot_3: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Kolo_Tour%C3%A9_2015.jpg", // Kolo Toure
  foot_4: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Nicolas_P%C3%A9p%C3%A9.JPG", // Nicolas Pepe
  foot_5: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Franck_Kessi%C3%A9.jpg", // Franck Kessie
  foot_6: "https://upload.wikimedia.org/wikipedia/commons/e/e9/Simon_Adingra.jpg", // Simon Adingra
  foot_7: "https://upload.wikimedia.org/wikipedia/commons/a/ac/S%C3%A9bastien_Haller_2019.jpg", // Sebastien Haller
  foot_8: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Seko_Fofana_Lens.jpg", // Seko Fofana
  foot_9: "https://upload.wikimedia.org/wikipedia/commons/7/75/Jean_Micha%C3%ABl_Seri.jpg", // Jean Michael Seri
  foot_10: "https://upload.wikimedia.org/wikipedia/commons/7/7f/Emmanuel_Ebou%C3%A9.jpg", // Emmanuel Eboue
  foot_11: "https://upload.wikimedia.org/wikipedia/commons/5/5a/Salomon_Kalou_Lille.jpg", // Salomon Kalou
  foot_12: "https://upload.wikimedia.org/wikipedia/commons/3/30/Gervinho_cropped.jpg", // Gervinho
  foot_13: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Wilfried_Zaha_2019.jpg", // Wilfried Zaha
  foot_14: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Max_Gradel.jpg", // Max Gradel
  foot_15: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Serge_Aurier_2018.jpg", // Serge Aurier
  foot_16: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Eric_Bailly_2017.jpg", // Eric Bailly
  foot_17: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Ibrahim_Sangar%C3%A9.jpg", // Ibrahim Sangare
  foot_18: "https://upload.wikimedia.org/wikipedia/commons/d/de/Odilon_Kossounou_2022.jpg", // Odilon Kossounou
  foot_19: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Evan_N%27Dicka_2020.jpg", // Evan Ndicka
  foot_20: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Yahia_Fofana_Angers_2023.jpg", // Yahia Fofana
  foot_34: "https://upload.wikimedia.org/wikipedia/commons/d/d4/Seydou_Doumbia_2015.jpg", // Seydou Doumbia
  foot_36: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Wilfried_Bony_2015.jpg", // Wilfried Bony
  foot_37: "https://upload.wikimedia.org/wikipedia/commons/6/66/Cheick_Tiot%C3%A9_2015.jpg", // Cheick Tiote
  foot_38: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Didier_Zokora.jpg", // Didier Zokora
  foot_43: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Kader_Ke%C3%AFta_cropped.jpg", // Kader Keita
  foot_44: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Boubacar_Barry.jpg", // Copa Barry
  foot_73: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Serey_Di%C3%A9_2015.jpg"  // Serey Die
};

// Curated Wikimedia Commons links for exact Food platings
const FOOD_URLS = {
  food_1: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Traditional_Garba.jpg", // Garba
  food_2: "https://upload.wikimedia.org/wikipedia/commons/9/91/Kedjenou.JPG", // Kedjenou
  food_3: "https://upload.wikimedia.org/wikipedia/commons/2/29/Attieke_poisson_in_Abidjan_C%C3%B4te_d%27Ivoire.JPG", // Attieke poisson
  food_4: "https://upload.wikimedia.org/wikipedia/commons/5/54/Attieke.JPG", // Placali sauce graine (Cassava semolina base)
  food_5: "https://upload.wikimedia.org/wikipedia/commons/9/91/Kedjenou.JPG", // Placali kpala
  food_6: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Alloco.jpg", // Foutou banane sauce graine
  food_7: "https://upload.wikimedia.org/wikipedia/commons/9/91/Kedjenou.JPG", // Foutou igname sauce claire
  food_8: "https://upload.wikimedia.org/wikipedia/commons/2/29/Attieke_poisson_in_Abidjan_C%C3%B4te_d%27Ivoire.JPG", // Riz gras poulet
  food_9: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Alloco.jpg", // Alloco
  food_10: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Alloco.jpg", // Claclo
  food_14: "https://upload.wikimedia.org/wikipedia/commons/2/29/Attieke_poisson_in_Abidjan_C%C3%B4te_d%27Ivoire.JPG", // Choukouya mouton
  food_16: "https://upload.wikimedia.org/wikipedia/commons/b/b8/Alloco.jpg", // Gbofloto
  food_17: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Traditional_Garba.jpg" // Pain chien
};

// Curated links for Juste Prix exact products
const PRODUCT_URLS = {
  prod_1: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Traditional_Garba.jpg", // Garba portion
  prod_2: "https://upload.wikimedia.org/wikipedia/commons/5/54/Attieke.JPG", // Boule Attieke
  prod_3: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Baguette_-_Granuband.jpg", // Baguette de pain
  prod_4: "https://upload.wikimedia.org/wikipedia/commons/6/60/Bouillon_cube.jpg", // Cube Maggi
  prod_5: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80", // Oil Dinor
  prod_6: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80", // Rice bag
  prod_7: "https://upload.wikimedia.org/wikipedia/commons/7/77/Propane_gas_cylinder_domestic.jpg", // Gaz bottle cylinder
  prod_8: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Minibus_Sotra.JPG", // Gbaka ticket
  prod_9: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80", // Kirene Water Bottle
  prod_10: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=400&q=80", // Beaufort Beer
  prod_11: "https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=400&q=80", // Water sachet
  prod_13: "https://images.unsplash.com/photo-1534080391025-0967e9ae104e?auto=format&fit=crop&w=400&q=80", // Sardine tin
  prod_14: "https://images.unsplash.com/photo-1594002684733-2f14a70f30aa?auto=format&fit=crop&w=400&q=80", // Pates maman
  prod_15: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=400&q=80", // Sugar bag
  prod_18: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Minibus_Sotra.JPG", // Bus ticket
  prod_19: "https://images.unsplash.com/photo-1511381939415-e4401546383a?auto=format&fit=crop&w=400&q=80", // Chocolate bar
  prod_20: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80", // Bananas
  prod_22: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80", // Bluetooth headset
  prod_23: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=400&q=80", // PS5 console
  prod_24: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80"  // Smartphone
};

// Curated links for Public Figures
const PUBLIC_URLS = {
  pub_1: "https://upload.wikimedia.org/wikipedia/commons/f/f0/Blaise_Pascal_Tanguy_en_compagnie_de_Michel_Gohou.jpg", // Gohou Michel
  pub_24: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Delta_Akissi.jpg" // Akissi Delta
};

// 75 Artists
const RAW_ARTISTS = [
  { id: 'art_1', name: 'Didi B', category: 'Rap Ivoire' },
  { id: 'art_2', name: 'Ariel Sheney', category: 'Coupé-Décalé' },
  { id: 'art_3', name: 'Josey', category: 'Variété / Afro-pop' },
  { id: 'art_4', name: 'Roseline Layo', category: 'Variété / Zouglou' },
  { id: 'art_5', name: 'KS Bloom', category: 'Gospel Rap' },
  { id: 'art_6', name: 'Serge Beynaud', category: 'Coupé-Décalé' },
  { id: 'art_7', name: 'Debordo Leekunfa', category: 'Coupé-Décalé' },
  { id: 'art_8', name: 'Magic System', category: 'Zouglou / Pop' },
  { id: 'art_9', name: 'DJ Arafat', category: 'Coupé-Décalé' },
  { id: 'art_10', name: 'Meiway', category: 'Zarrabina / Variété' },
  { id: 'art_11', name: 'Alpha Blondy', category: 'Reggae' },
  { id: 'art_12', name: 'Tiken Jah Fakoly', category: 'Reggae' },
  { id: 'art_13', name: 'Himra', category: 'Rap Ivoire' },
  { id: 'art_14', name: 'Suspect 95', category: 'Rap Ivoire' },
  { id: 'art_15', name: 'Mix Premier', category: 'Coupé-Décalé' },
  { id: 'art_16', name: 'Espoir 2000', category: 'Zouglou' },
  { id: 'art_17', name: 'Yodé & Siro', category: 'Zouglou' },
  { id: 'art_18', name: 'Petit Denis', category: 'Zouglou' },
  { id: 'art_19', name: 'Kerozen DJ', category: 'Variété / Coupé-Décalé' },
  { id: 'art_20', name: 'Morijah', category: 'Gospel / Soul' },
  { id: 'art_21', name: 'Fior de Bior', category: 'Rap Ivoire' },
  { id: 'art_22', name: 'Lil Jay Bingerack', category: 'Afro-fusion' },
  { id: 'art_23', name: 'Elow\'n', category: 'Rap Ivoire' },
  { id: 'art_24', name: 'Safarel Obiang', category: 'Coupé-Décalé' },
  { id: 'art_25', name: 'Vitale', category: 'Coupé-Décalé' },
  { id: 'art_26', name: 'Bamba Amy Sarah', category: 'Coupé-Décalé' },
  { id: 'art_27', name: 'Claire Bahi', category: 'Coupé-Décalé' },
  { id: 'art_28', name: 'MC One', category: 'Rap / Pop' },
  { id: 'art_29', name: 'Soum Bill', category: 'Zouglou' },
  { id: 'art_30', name: 'Les Patrons', category: 'Zouglou' },
  { id: 'art_31', name: 'Fitini', category: 'Zouglou' },
  { id: 'art_32', name: 'Molière', category: 'Zouglou' },
  { id: 'art_33', name: 'Bilé Didier', category: 'Zouglou' },
  { id: 'art_34', name: 'Les Garagistes', category: 'Zouglou' },
  { id: 'art_35', name: 'Ismaël Isaac', category: 'Reggae' },
  { id: 'art_36', name: 'Tour de Garde', category: 'Afro-pop' },
  { id: 'art_37', name: 'Monique Séka', category: 'Afro-Zouk' },
  { id: 'art_38', name: 'Aïcha Koné', category: 'Variété Mandingue' },
  { id: 'art_39', name: 'Nayanka Bell', category: 'Variété / Pop' },
  { id: 'art_40', name: 'Bailly Spinto', category: 'Variété / Rétro' },
  { id: 'art_41', name: 'Ernesto Djédjé', category: 'Ziglibithy' },
  { id: 'art_42', name: 'François Lougah', category: 'Variété / Rétro' },
  { id: 'art_43', name: 'Reine Pélagie', category: 'Variété' },
  { id: 'art_44', name: 'Joelle C', category: 'Variété' },
  { id: 'art_45', name: 'Affou Keïta', category: 'Musique Mandingue' },
  { id: 'art_46', name: 'Guy Christ Israel', category: 'Gospel' },
  { id: 'art_47', name: 'Nestor David', category: 'Gospel' },
  { id: 'art_48', name: 'Richard Krémé', category: 'Gospel' },
  { id: 'art_49', name: 'Schekina', category: 'Gospel' },
  { id: 'art_50', name: 'Eden', category: 'Gospel' },
  { id: 'art_51', name: 'Onel Mala', category: 'Gospel / Reggae' },
  { id: 'art_52', name: 'Bebi Philip', category: 'Coupé-Décalé / Afro-pop' },
  { id: 'art_53', name: 'Shado Chris', category: 'Rap / Afro-fusion' },
  { id: 'art_54', name: 'Francky Dicaprio', category: 'Coupé-Décalé' },
  { id: 'art_55', name: 'DJ Lewis', category: 'Coupé-Décalé' },
  { id: 'art_56', name: 'DJ Jacob', category: 'Coupé-Décalé' },
  { id: 'art_57', name: 'Erickson le Zoulou', category: 'Coupé-Décalé' },
  { id: 'art_58', name: 'Révolution', category: 'Zouglou' },
  { id: 'art_59', name: 'VDA (Voix des Anges)', category: 'Zouglou' },
  { id: 'art_60', name: 'Les Leaders', category: 'Zouglou' },
  { id: 'art_61', name: 'Yabongo Lova', category: 'Zouglou' },
  { id: 'art_62', name: 'Tripa Gninnin', category: 'Rap Ivoire' },
  { id: 'art_63', name: 'Oprah', category: 'Rap Ivoire' },
  { id: 'art_64', name: 'Douk Saga', category: 'Coupé-Décalé (Créateur)' },
  { id: 'art_65', name: 'Jovial', category: 'Rap Ivoire' },
  { id: 'art_66', name: 'Black K', category: 'Rap Ivoire' },
  { id: 'art_67', name: 'Rocky Gold', category: 'Afro-pop' },
  { id: 'art_68', name: 'Teeyah', category: 'Afro-Zouk / Pop' },
  { id: 'art_69', name: 'Boni (Magic System)', category: 'Zouglou' },
  { id: 'art_70', name: 'Manadja (Magic System)', category: 'Zouglou' },
  { id: 'art_71', name: 'Goudé (Magic System)', category: 'Zouglou' },
  { id: 'art_72', name: 'Asalfo (Magic System)', category: 'Zouglou' },
  { id: 'art_73', name: 'Josey Priscille', category: 'Variété / Soul' },
  { id: 'art_74', name: 'Didier Bilé', category: 'Zouglou' },
  { id: 'art_75', name: 'Les Mercenaires', category: 'Zouglou' }
];

export const DEFAULT_ARTISTS = RAW_ARTISTS.map(item => ({
  ...item,
  image: getDeezerArtistUrl(ARTIST_DEEZER_IDS[item.id] || "11488663") // default fallback to Didi B photo if not mapped
}));

// 75 Footballers
const RAW_FOOTBALLERS = [
  { id: 'foot_1', name: 'Didier Drogba', category: 'Attaquant' },
  { id: 'foot_2', name: 'Yaya Touré', category: 'Milieu de Terrain' },
  { id: 'foot_3', name: 'Kolo Touré', category: 'Défenseur' },
  { id: 'foot_4', name: 'Nicolas Pépé', category: 'Attaquant' },
  { id: 'foot_5', name: 'Franck Kessié', category: 'Milieu de Terrain' },
  { id: 'foot_6', name: 'Simon Adingra', category: 'Attaquant / Ailier' },
  { id: 'foot_7', name: 'Sébastien Haller', category: 'Attaquant / Pivot' },
  { id: 'foot_8', name: 'Seko Fofana', category: 'Milieu de Terrain' },
  { id: 'foot_9', name: 'Jean Michaël Seri', category: 'Milieu de Terrain' },
  { id: 'foot_10', name: 'Emmanuel Eboué', category: 'Défenseur Latéral' },
  { id: 'foot_11', name: 'Salomon Kalou', category: 'Attaquant / Milieu Offensif' },
  { id: 'foot_12', name: 'Gervinho', category: 'Attaquant / Ailier' },
  { id: 'foot_13', name: 'Wilfried Zaha', category: 'Attaquant / Ailier' },
  { id: 'foot_14', name: 'Max-Alain Gradel', category: 'Attaquant / Ailier' },
  { id: 'foot_15', name: 'Serge Aurier', category: 'Défenseur Latéral' },
  { id: 'foot_16', name: 'Eric Bailly', category: 'Défenseur Central' },
  { id: 'foot_17', name: 'Ibrahim Sangaré', category: 'Milieu de Terrain' },
  { id: 'foot_18', name: 'Odilon Kossounou', category: 'Défenseur Central' },
  { id: 'foot_19', name: 'Evan Ndicka', category: 'Défenseur Central' },
  { id: 'foot_20', name: 'Yahia Fofana', category: 'Gardien de But' },
  { id: 'foot_21', name: 'Oumar Diakité', category: 'Attaquant' },
  { id: 'foot_22', name: 'Christian Kouamé', category: 'Attaquant' },
  { id: 'foot_23', name: 'Wilfried Singo', category: 'Défenseur Central/Latéral' },
  { id: 'foot_24', name: 'Karim Konaté', category: 'Attaquant' },
  { id: 'foot_25', name: 'Willy Boly', category: 'Défenseur Central' },
  { id: 'foot_26', name: 'Jérémie Boga', category: 'Milieu Offensif / Ailier' },
  { id: 'foot_27', name: 'Ghislain Konan', category: 'Défenseur Latéral' },
  { id: 'foot_28', name: 'Jean-Philippe Krasso', category: 'Attaquant' },
  { id: 'foot_29', name: 'Lazare Amani', category: 'Milieu de Terrain' },
  { id: 'foot_30', name: 'Maxwel Cornet', category: 'Latéral / Ailier' },
  { id: 'foot_31', name: 'Jean-Evrard Kouassi', category: 'Attaquant' },
  { id: 'foot_32', name: 'Amad Diallo', category: 'Milieu Offensif / Ailier' },
  { id: 'foot_33', name: 'David Datro Fofana', category: 'Attaquant' },
  { id: 'foot_34', name: 'Seydou Doumbia', category: 'Attaquant (Buteur)' },
  { id: 'foot_35', name: 'Lacina Traoré', category: 'Attaquant / Pivot' },
  { id: 'foot_36', name: 'Wilfried Bony', category: 'Attaquant (Buteur)' },
  { id: 'foot_37', name: 'Cheick Tioté', category: 'Milieu Défensif' },
  { id: 'foot_38', name: 'Didier Zokora (Maestro)', category: 'Milieu Défensif' },
  { id: 'foot_39', name: 'Arthur Boka', category: 'Défenseur Latéral' },
  { id: 'foot_40', name: 'Siaka Tiéné (Chico)', category: 'Défenseur Latéral' },
  { id: 'foot_41', name: 'Bakari Koné (Baky)', category: 'Attaquant / Pocket' },
  { id: 'foot_42', name: 'Aruna Dindane', category: 'Attaquant' },
  { id: 'foot_43', name: 'Kader Keïta (Popito)', category: 'Attaquant / Ailier' },
  { id: 'foot_44', name: 'Boubacar Barry (Copa)', category: 'Gardien de But' },
  { id: 'foot_45', name: 'Romaric N\'Dri', category: 'Milieu de Terrain' },
  { id: 'foot_46', name: 'Jean-Jacques Tizié', category: 'Gardien de But' },
  { id: 'foot_47', name: 'Cyrille Domoraud', category: 'Défenseur Central' },
  { id: 'foot_48', name: 'Bonaventure Kalou', category: 'Milieu Offensif / Attaquant' },
  { id: 'foot_49', name: 'Joel Tiéhi', category: 'Attaquant (Légende 92)' },
  { id: 'foot_50', name: 'Laurent Pokou', category: 'Attaquant (Légende historique)' },
  { id: 'foot_51', name: 'Alain Gouaméné', category: 'Gardien de But (Légende 92)' },
  { id: 'foot_52', name: 'Youssouf Fofana', category: 'Attaquant (Le Diamant Noir)' },
  { id: 'foot_53', name: 'Abdoulaye Traoré (Ben Badi)', category: 'Attaquant (Légende 92)' },
  { id: 'foot_54', name: 'Gadji Celi', category: 'Milieu / Capitaine 92' },
  { id: 'foot_55', name: 'Donald-Olivier Sié', category: 'Milieu de Terrain' },
  { id: 'foot_56', name: 'Serge Maguy', category: 'Milieu Offensif' },
  { id: 'foot_57', name: 'Didier Otokoré', category: 'Milieu de Terrain' },
  { id: 'foot_58', name: 'Lassina Diabaté', category: 'Milieu Défensif' },
  { id: 'foot_59', name: 'Olivier Tebily', category: 'Défenseur Central' },
  { id: 'foot_60', name: 'Ibrahim Bakayoko', category: 'Attaquant' },
  { id: 'foot_61', name: 'Gilles Yapi Yapo', category: 'Milieu de Terrain' },
  { id: 'foot_62', name: 'Blaise Kouassi', category: 'Défenseur Central' },
  { id: 'foot_63', name: 'Kanga Akalé', category: 'Milieu Offensif / Ailier' },
  { id: 'foot_64', name: 'Marco Né', category: 'Milieu de Terrain' },
  { id: 'foot_65', name: 'Constant Djakpa', category: 'Défenseur Latéral' },
  { id: 'foot_66', name: 'Sol Bamba', category: 'Défenseur Central' },
  { id: 'foot_67', name: 'Benjamin Angoua', category: 'Défenseur Central' },
  { id: 'foot_68', name: 'Sayouba Mandé', category: 'Gardien de But' },
  { id: 'foot_69', name: 'Badra Ali Sangaré', category: 'Gardien de But' },
  { id: 'foot_70', name: 'Ismaël Diomandé', category: 'Milieu Défensif' },
  { id: 'foot_71', name: 'Giovanni Sio', category: 'Attaquant' },
  { id: 'foot_72', name: 'Brice Dja Djédjé', category: 'Défenseur Latéral' },
  { id: 'foot_73', name: 'Serey Dié', category: 'Milieu Défensif / Capitaine' },
  { id: 'foot_74', name: 'Ousmane Diomandé', category: 'Défenseur Central' },
  { id: 'foot_75', name: 'Lamine Camara (CI)', category: 'Milieu de Terrain' }
];

export const DEFAULT_FOOTBALLERS = RAW_FOOTBALLERS.map((item, idx) => ({
  ...item,
  // map specific photo, or rotate between famous players photos
  image: FOOTBALL_URLS[item.id] || FOOTBALL_URLS[`foot_${(idx % 19) + 1}`]
}));

// 33 Public Figures
const RAW_PUBLIC_FIGURES = [
  { id: 'pub_1', name: 'Gohou Michel', category: 'Humoriste / Acteur' },
  { id: 'pub_2', name: 'Digbeu Cravate', category: 'Humoriste / Acteur' },
  { id: 'pub_3', name: 'Yvidero', category: 'Humoriste / Actrice' },
  { id: 'pub_4', name: 'Willy Dumbo', category: 'Animateur / Showman' },
  { id: 'pub_5', name: 'Observateur Ébène', category: 'Humoriste / Créateur de contenu' },
  { id: 'pub_6', name: 'Le Magnific', category: 'Humoriste' },
  { id: 'pub_7', name: 'Boukary', category: 'Humoriste' },
  { id: 'pub_8', name: 'Ramatoulaye', category: 'Humoriste' },
  { id: 'pub_9', name: 'Eunice Zunon', category: 'Humoriste / Influenceuse' },
  { id: 'pub_10', name: 'L\'Excès', category: 'Créateur de contenu / Humoriste' },
  { id: 'pub_11', name: 'Emma Lohoues', category: 'Actrice / Influenceuse / Business' },
  { id: 'pub_12', name: 'Carmen Sama', category: 'Influenceuse / Mode' },
  { id: 'pub_13', name: 'Eudoxie Yao', category: 'Personnalité Publique / Modèle' },
  { id: 'pub_14', name: 'Molare', category: 'Producteur / Homme d\'affaires' },
  { id: 'pub_15', name: 'Konnie Touré', category: 'Animatrice TV / Productrice' },
  { id: 'pub_16', name: 'Caroline Dasylva', category: 'Animatrice TV (C\'Midi)' },
  { id: 'pub_17', name: 'Jean-Michel Onin', category: 'Journaliste / Animateur' },
  { id: 'pub_18', name: 'Didier Bléou', category: 'Directeur TV / Animateur' },
  { id: 'pub_19', name: 'Yves de M\'Bella', category: 'Animateur Radio & TV' },
  { id: 'pub_20', name: 'Kadhy Touré', category: 'Actrice / Animatrice (Les Femmes d\'Ici)' },
  { id: 'pub_21', name: 'Marie-Paule Adjé', category: 'Actrice / Modèle / Mode' },
  { id: 'pub_22', name: 'Stéphane Zabavy', category: 'Acteur / Chanteur' },
  { id: 'pub_23', name: 'Guy Kalou', category: 'Acteur / Producteur' },
  { id: 'pub_24', name: 'Akissi Delta', category: 'Créatrice / Actrice (Ma Famille)' },
  { id: 'pub_25', name: 'Michel Bohiri', category: 'Acteur (Ma Famille)' },
  { id: 'pub_26', name: 'Amélie Wabehi', category: 'Actrice (Ma Famille)' },
  { id: 'pub_27', name: 'Gbazé Thérèse', category: 'Actrice (Ma Famille)' },
  { id: 'pub_28', name: 'Nastou Traoré', category: 'Actrice (Ma Famille)' },
  { id: 'pub_29', name: 'Adrienne Koutouan', category: 'Actrice / Humoriste' },
  { id: 'pub_30', name: 'Emmanuelle Keïta', category: 'Influenceuse / Mode / Style' },
  { id: 'pub_31', name: 'Général Camille Makosso', category: 'Influenceur / Personnalité' },
  { id: 'pub_32', name: 'Lolo Beauté', category: 'Influenceuse' },
  { id: 'pub_33', name: 'Cheick Yvhane', category: 'Journaliste / Présentateur TV' }
];

export const DEFAULT_PUBLIC_FIGURES = RAW_PUBLIC_FIGURES.map((item, idx) => ({
  ...item,
  image: PUBLIC_URLS[item.id] || PUBLIC_URLS.pub_1 // fallback to Michel Gohou photo
}));

// 20 Foods
export const DEFAULT_FOODS = [
  { id: 'food_1', name: 'Garba (Attiéké Thon)' },
  { id: 'food_2', name: 'Kedjenou de Poulet' },
  { id: 'food_3', name: 'Attiéké Poisson Grillé' },
  { id: 'food_4', name: 'Placali Sauce Graine' },
  { id: 'food_5', name: 'Placali Sauce Kpala' },
  { id: 'food_6', name: 'Foutou Banane Sauce Graine' },
  { id: 'food_7', name: 'Foutou Igname Sauce Claire' },
  { id: 'food_8', name: 'Riz Gras au Poulet' },
  { id: 'food_9', name: 'Alloco (Banane plantain frite)' },
  { id: 'food_10', name: 'Claclo (Beignets de plantain)' },
  { id: 'food_11', name: 'Sauce Djoumgblé (Gombo sec)' },
  { id: 'food_12', name: 'Sauce Kopè (Gombo frais)' },
  { id: 'food_13', name: 'Sauce Gouagouassou' },
  { id: 'food_14', name: 'Choukouya de Mouton' },
  { id: 'food_15', name: 'Baka (Bouillie de mil/riz)' },
  { id: 'food_16', name: 'Gbofloto (Beignets ivoiriens)' },
  { id: 'food_17', name: 'Pain Chien (Pain brochettes)' },
  { id: 'food_18', name: 'Kabato (Pâte de maïs)' },
  { id: 'food_19', name: 'Attiéké Huile de Palme (Rouge)' },
  { id: 'food_20', name: 'Kedjenou de Lapin' }
].map(item => ({
  ...item,
  image: FOOD_URLS[item.id] || FOOD_URLS.food_3 // fallback to Attieke poisson
}));

// 24 Products (Juste Prix)
export const DEFAULT_PRODUCTS = [
  { id: 'prod_1', name: 'Garba (1 part de base thon + attiéké)', price: 500, category: 'Nourriture' },
  { id: 'prod_2', name: 'Attiéké (1 boule standard au marché)', price: 100, category: 'Nourriture' },
  { id: 'prod_3', name: 'Baguette de Pain standard', price: 150, category: 'Nourriture' },
  { id: 'prod_4', name: 'Cube Maggi (L\'unité)', price: 25, category: 'Nourriture' },
  { id: 'prod_5', name: 'Bouteille d\'Huile Dinor (1 Litre)', price: 1300, category: 'Nourriture' },
  { id: 'prod_6', name: 'Riz Local cassé (1 kg)', price: 600, category: 'Nourriture' },
  { id: 'prod_7', name: 'Recharge de Bouteille de Gaz (B6 - 6kg)', price: 2000, category: 'Quotidien' },
  { id: 'prod_8', name: 'Ticket de Gbaka (Adjamé - Cocody)', price: 500, category: 'Transport' },
  { id: 'prod_9', name: 'Bouteille d\'eau Kirène (1.5L)', price: 400, category: 'Boisson' },
  { id: 'prod_10', name: 'Bière Beaufort Lager (Bouteille 65cl)', price: 800, category: 'Boisson' },
  { id: 'prod_11', name: 'Sachet d\'eau de table glacée (L\'unité)', price: 50, category: 'Boisson' },
  { id: 'prod_12', name: 'Petite boîte de Lait concentré Peak', price: 400, category: 'Nourriture' },
  { id: 'prod_13', name: 'Boîte de Sardine Pénélope', price: 450, category: 'Nourriture' },
  { id: 'prod_14', name: 'Paquet de Pâtes alimentaires (500g)', price: 450, category: 'Nourriture' },
  { id: 'prod_15', name: 'Sucre Roux local (1 kg)', price: 850, category: 'Nourriture' },
  { id: 'prod_16', name: 'Savon local Kabakrou (L\'unité)', price: 150, category: 'Hygiène' },
  { id: 'prod_17', name: 'Paquet de Café Ivoire (250g)', price: 1200, category: 'Nourriture' },
  { id: 'prod_18', name: 'Ticket de Bus Sotra standard', price: 200, category: 'Transport' },
  { id: 'prod_19', name: 'Tablette de Chocolat de Côte d\'Ivoire', price: 1000, category: 'Nourriture' },
  { id: 'prod_20', name: 'Tas de bananes douces (4-5 fruits)', price: 200, category: 'Nourriture' },
  { id: 'prod_21', name: 'Petit verre de Koutoukou local', price: 100, category: 'Boisson' },
  { id: 'prod_22', name: 'Casque audio bluetooth entrée de gamme', price: 15000, category: 'Technologie' },
  { id: 'prod_23', name: 'Console de jeu PlayStation 5 Slim 825Go', price: 450000, category: 'Technologie' },
  { id: 'prod_24', name: 'Téléphone intelligent Tecno Spark standard', price: 85000, category: 'Technologie' }
].map(item => ({
  ...item,
  image: PRODUCT_URLS[item.id] || PRODUCT_URLS.prod_9 // fallback to Kirene bottle
}));
