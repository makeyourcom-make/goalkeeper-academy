// Tailles d'équipement proposées sur la fiche d'un gardien.
//
// Volontairement dans leur propre fichier: un module "use server" ne peut
// exporter que des fonctions async, et les déclarer à côté des actions faisait
// échouer le build (sans que le message n'apparaisse avant la collecte des
// pages, donc en passant inaperçu).
//
// Les gants suivent la numérotation universelle (4 = petite main d'enfant,
// 11 = grande main d'adulte); le haut va de la taille enfant 10 ans aux
// tailles adulte.
export const GLOVE_SIZES = [
  "4",
  "5",
  "6",
  "7",
  "7.5",
  "8",
  "8.5",
  "9",
  "9.5",
  "10",
  "10.5",
  "11",
] as const;

export const SHIRT_SIZES = [
  "10 ans",
  "12 ans",
  "14 ans",
  "16 ans",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
] as const;
