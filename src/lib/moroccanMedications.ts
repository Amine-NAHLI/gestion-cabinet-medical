export interface MedicationItem {
  name: string;
  form?: string;
  dosageUnit?: string;
  category?: string;
  defaultInstructions?: string;
}

export const MOROCCAN_COMMON_MEDICATIONS: MedicationItem[] = [
  // Analgésiques & Antipyrétiques
  { name: "Doliprane 1000mg", form: "Comprimé", dosageUnit: "1g", defaultInstructions: "1 comprimé toutes les 8h si douleur ou fièvre (max 3g/j)" },
  { name: "Doliprane 500mg", form: "Gélule", dosageUnit: "500mg", defaultInstructions: "1 gélule 3 fois par jour" },
  { name: "Doliprane Sirop Pédiatrique", form: "Sirop", dosageUnit: "2,4%", defaultInstructions: "1 dose-kilo toutes les 6 heures" },
  { name: "Dafalgan 1g", form: "Comprimé effervescent", dosageUnit: "1g", defaultInstructions: "1 comprimé effervescent 3 fois par jour après les repas" },
  { name: "Efferalgan 1g", form: "Comprimé effervescent", dosageUnit: "1g", defaultInstructions: "1 comprimé effervescent dans un verre d'eau max 3x/jour" },
  { name: "Paracétamol Mylan 1g", form: "Comprimé", dosageUnit: "1g", defaultInstructions: "1 comprimé toutes les 8 heures" },
  { name: "Tramadol 50mg", form: "Gélule", dosageUnit: "50mg", defaultInstructions: "1 gélule en cas de douleur intense (max 4/j)" },
  { name: "Ixprim (Tramadol/Paracétamol)", form: "Comprimé", dosageUnit: "37.5mg/325mg", defaultInstructions: "1 à 2 comprimés toutes les 6h si besoin" },
  { name: "Acupan 20mg", form: "Ampoule injectable", dosageUnit: "20mg", defaultInstructions: "1 ampoule sur sucre ou IM si douleur aiguë" },

  // Anti-inflammatoires (AINS)
  { name: "Bi-Profénid 150mg", form: "Comprimé sécable", dosageUnit: "150mg", defaultInstructions: "1 comprimé matin et soir au milieu des repas pendant 5 jours" },
  { name: "Profénid 100mg", form: "Comprimé", dosageUnit: "100mg", defaultInstructions: "1 comprimé 2 fois par jour au cours des repas" },
  { name: "Voltarène 50mg (Diclofénac)", form: "Comprimé enrobé", dosageUnit: "50mg", defaultInstructions: "1 comprimé 3 fois par jour pendant les repas" },
  { name: "Voltarène 75mg Retard", form: "Comprimé", dosageUnit: "75mg", defaultInstructions: "1 comprimé le soir au dîner" },
  { name: "Apranax 550mg (Naproxène)", form: "Comprimé", dosageUnit: "550mg", defaultInstructions: "1 comprimé matin et soir après les repas pendant 5 jours" },
  { name: "Nifluril 250mg", form: "Gélule", dosageUnit: "250mg", defaultInstructions: "1 gélule 3 fois par jour pendant 4 jours" },
  { name: "Celebrex 200mg (Célécoxib)", form: "Gélule", dosageUnit: "200mg", defaultInstructions: "1 gélule par jour le matin pendant 10 jours" },
  { name: "Surgam 200mg", form: "Comprimé", dosageUnit: "200mg", defaultInstructions: "1 comprimé midi et soir" },
  { name: "Célestène 2mg (Bétaméthasone)", form: "Comprimé soluble", dosageUnit: "2mg", defaultInstructions: "1 comprimé le matin au petit-déjeuner pendant 3 jours" },
  { name: "Solupred 20mg (Prednisolone)", form: "Comprimé orodispersible", dosageUnit: "20mg", defaultInstructions: "2 comprimés le matin pendant 5 jours" },

  // Antibiotiques
  { name: "Augmentin 1g/125mg Adulte", form: "Comprimé", dosageUnit: "1g", defaultInstructions: "1 comprimé matin et soir au début des repas pendant 7 jours" },
  { name: "Augmentin Sirop Enfant", form: "Poudre pour suspension", dosageUnit: "100mg/12.5mg/ml", defaultInstructions: "Selon le poids, 3 doses par jour pendant 7 jours" },
  { name: "Amoxil 1g (Amoxicilline)", form: "Comprimé", dosageUnit: "1g", defaultInstructions: "1 comprimé matin et soir pendant 6 jours" },
  { name: "Amoxil 500mg", form: "Gélule", dosageUnit: "500mg", defaultInstructions: "1 gélule 3 fois par jour pendant 6 jours" },
  { name: "Clamoxyl 1g", form: "Comprimé dispersible", dosageUnit: "1g", defaultInstructions: "1 comprimé matin et soir dissous dans l'eau pendant 6 jours" },
  { name: "Zithromax 250mg (Azithromycine)", form: "Gélule", dosageUnit: "250mg", defaultInstructions: "2 gélules le 1er jour, puis 1 gélule par jour pendant 4 jours" },
  { name: "Ciflox 500mg (Ciprofloxacine)", form: "Comprimé", dosageUnit: "500mg", defaultInstructions: "1 comprimé matin et soir pendant 7 jours" },
  { name: "Oflocet 200mg (Ofloxacine)", form: "Comprimé", dosageUnit: "200mg", defaultInstructions: "1 comprimé matin et soir" },
  { name: "Oroken 200mg (Céfixime)", form: "Comprimé", dosageUnit: "200mg", defaultInstructions: "1 comprimé matin et soir pendant 5 jours" },
  { name: "Pyostacine 500mg", form: "Comprimé", dosageUnit: "500mg", defaultInstructions: "2 comprimés matin et soir au cours des repas pendant 8 jours" },
  { name: "Bactrim Forte", form: "Comprimé", dosageUnit: "800mg/160mg", defaultInstructions: "1 comprimé matin et soir pendant 7 jours" },
  { name: "Flagyl 500mg (Métronidazole)", form: "Comprimé", dosageUnit: "500mg", defaultInstructions: "1 comprimé 3 fois par jour pendant les repas pendant 7 jours" },

  // Gastro-entérologie
  { name: "Inexium 40mg (Esoméprazole)", form: "Comprimé", dosageUnit: "40mg", defaultInstructions: "1 comprimé le matin à jeun 30 min avant le petit-déjeuner pendant 4 semaines" },
  { name: "Inexium 20mg", form: "Comprimé", dosageUnit: "20mg", defaultInstructions: "1 comprimé le matin à jeun pendant 14 jours" },
  { name: "Mopral 20mg (Oméprazole)", form: "Gélule gastro-résistante", dosageUnit: "20mg", defaultInstructions: "1 gélule le matin à jeun" },
  { name: "Pantozol 40mg (Pantoprazole)", form: "Comprimé", dosageUnit: "40mg", defaultInstructions: "1 comprimé le matin avant le repas" },
  { name: "Gaviscon Suspension Buvable", form: "Sachet", dosageUnit: "10ml", defaultInstructions: "1 sachet après les 3 principaux repas et au coucher" },
  { name: "Maalox Maux d'Estomac", form: "Comprimé à croquer", dosageUnit: "400mg", defaultInstructions: "1 à 2 comprimés à croquer au moment des brûlures" },
  { name: "Smecta", form: "Poudre pour suspension", dosageUnit: "3g", defaultInstructions: "1 sachet dans un demi-verre d'eau 3 fois par jour" },
  { name: "Imodium 2mg (Lopéramide)", form: "Gélule", dosageUnit: "2mg", defaultInstructions: "2 gélules d'emblée, puis 1 gélule après chaque selle liquide (max 6/j)" },
  { name: "Debridat 100mg (Trimébutine)", form: "Comprimé", dosageUnit: "100mg", defaultInstructions: "1 comprimé 3 fois par jour avant les repas" },
  { name: "Météospasmyl", form: "Capsule molle", dosageUnit: "60mg/300mg", defaultInstructions: "1 capsule au début des repas 2 à 3 fois par jour" },
  { name: "Spasfon (Phloroglucinol)", form: "Comprimé", dosageUnit: "80mg", defaultInstructions: "2 comprimés au moment des spasmes, à renouveler si besoin (max 6/j)" },
  { name: "Vogalène 10mg (Métopimazine)", form: "Gélule", dosageUnit: "10mg", defaultInstructions: "1 gélule 15 min avant les repas en cas de nausées" },
  { name: "Primpéran 10mg", form: "Comprimé", dosageUnit: "10mg", defaultInstructions: "1 comprimé 3 fois par jour avant les repas" },

  // Cardiologie & HTA & Métabolisme
  { name: "Kardégic 75mg", form: "Sachet", dosageUnit: "75mg", defaultInstructions: "1 sachet par jour au milieu du déjeuner" },
  { name: "Kardégic 160mg", form: "Sachet", dosageUnit: "160mg", defaultInstructions: "1 sachet par jour le midi" },
  { name: "Coversyl 5mg (Périndopril)", form: "Comprimé sécable", dosageUnit: "5mg", defaultInstructions: "1 comprimé le matin avant le repas" },
  { name: "Amlor 5mg (Amlodipine)", form: "Gélule", dosageUnit: "5mg", defaultInstructions: "1 gélule le matin" },
  { name: "Amlor 10mg", form: "Gélule", dosageUnit: "10mg", defaultInstructions: "1 gélule par jour le matin" },
  { name: "Tareg 80mg (Valsartan)", form: "Comprimé", dosageUnit: "80mg", defaultInstructions: "1 comprimé par jour" },
  { name: "Tareg 160mg", form: "Comprimé", dosageUnit: "160mg", defaultInstructions: "1 comprimé par jour le matin" },
  { name: "Co-Tareg 80/12.5mg", form: "Comprimé", dosageUnit: "80/12.5mg", defaultInstructions: "1 comprimé par jour le matin" },
  { name: "Tahor 10mg (Atorvastatine)", form: "Comprimé", dosageUnit: "10mg", defaultInstructions: "1 comprimé le soir au coucher" },
  { name: "Tahor 20mg", form: "Comprimé", dosageUnit: "20mg", defaultInstructions: "1 comprimé le soir au coucher" },
  { name: "Crestor 10mg (Rosuvastatine)", form: "Comprimé", dosageUnit: "10mg", defaultInstructions: "1 comprimé le soir" },
  { name: "Lasilix 40mg (Furosémide)", form: "Comprimé", dosageUnit: "40mg", defaultInstructions: "1 comprimé le matin à jeun" },
  { name: "Glucophage 850mg (Metformine)", form: "Comprimé", dosageUnit: "850mg", defaultInstructions: "1 comprimé 2 fois par jour au milieu des repas" },
  { name: "Glucophage 1000mg", form: "Comprimé", dosageUnit: "1000mg", defaultInstructions: "1 comprimé matin et soir à la fin des repas" },
  { name: "Diamicron 60mg LM", form: "Comprimé", dosageUnit: "60mg", defaultInstructions: "1 comprimé le matin au petit-déjeuner" },
  { name: "Januvia 100mg (Sitagliptine)", form: "Comprimé", dosageUnit: "100mg", defaultInstructions: "1 comprimé par jour le matin" },

  // Allergologie & Pneumologie & ORL
  { name: "Aérius 5mg (Desloratadine)", form: "Comprimé", dosageUnit: "5mg", defaultInstructions: "1 comprimé le soir au coucher pendant 15 jours" },
  { name: "Zyrtec 10mg (Cétirizine)", form: "Comprimé sécable", dosageUnit: "10mg", defaultInstructions: "1 comprimé le soir au coucher" },
  { name: "Xyzall 5mg (Lévocétirizine)", form: "Comprimé", dosageUnit: "5mg", defaultInstructions: "1 comprimé par jour le soir" },
  { name: "Ventoline 100µg (Salbutamol)", form: "Inhalateur pressurisé", dosageUnit: "100mcg/dose", defaultInstructions: "1 à 2 bouffées en cas de crise d'asthme ou gêne respiratoire" },
  { name: "Sérétide Diskus 50/250µg", form: "Inhalateur poudre", dosageUnit: "50/250mcg", defaultInstructions: "1 inhalation matin et soir, bien rincer la bouche après" },
  { name: "Symbicort Turbuhaler 200/6µg", form: "Inhalateur poudre", dosageUnit: "200/6mcg", defaultInstructions: "1 à 2 inhalations matin et soir" },
  { name: "Rhinathiol 5% Adulte", form: "Sirop sans sucre", dosageUnit: "5%", defaultInstructions: "1 cuillère à soupe 3 fois par jour à distance des repas" },
  { name: "Solmucol 200mg (Acétylcystéine)", form: "Sachet", dosageUnit: "200mg", defaultInstructions: "1 sachet 3 fois par jour dans un peu d'eau" },
  { name: "Stérimar Eau de Mer", form: "Spray nasal", dosageUnit: "100ml", defaultInstructions: "1 à 2 pulvérisations dans chaque narine 3 fois par jour" },
  { name: "Atrovent Nasal 0.03%", form: "Spray nasal", dosageUnit: "0.03%", defaultInstructions: "2 pulvérisations par narine matin et soir" },
  { name: "Maxidrol Collyre", form: "Collyre", dosageUnit: "5ml", defaultInstructions: "1 goutte 3 fois par jour dans l'œil atteint pendant 7 jours" },

  // Neurologie & Sommeil & Vitamines
  { name: "Lexomil 6mg (Bromazépam)", form: "Comprimé quadrisécable", dosageUnit: "6mg", defaultInstructions: "1/4 de comprimé le soir au coucher" },
  { name: "Xanax 0.25mg (Alprazolam)", form: "Comprimé", dosageUnit: "0.25mg", defaultInstructions: "1 comprimé le soir ou en cas d'angoisse aiguë" },
  { name: "Magnésium B6", form: "Comprimé", dosageUnit: "48mg/5mg", defaultInstructions: "2 comprimés matin et soir au cours des repas pendant 1 mois" },
  { name: "Vitamine D3 100 000 UI", form: "Ampoule buvable", dosageUnit: "100 000 UI", defaultInstructions: "1 ampoule à boire avec un peu d'eau, à renouveler dans 1 mois" },
  { name: "Tardiféron 80mg (Fer)", form: "Comprimé", dosageUnit: "80mg", defaultInstructions: "1 comprimé le matin avant le petit-déjeuner avec un jus d'orange" },
  { name: "Fumafer 66mg", form: "Comprimé", dosageUnit: "66mg", defaultInstructions: "1 comprimé midi et soir avant les repas" },
];
