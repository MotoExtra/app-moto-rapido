// Lista de cidades do Espírito Santo para seleção
export const ES_CITIES = [
  // Grande Vitória
  "Vitória",
  "Vila Velha", 
  "Serra",
  "Cariacica",
  "Viana",
  "Guarapari",
  "Fundão",
  // Norte
  "Linhares",
  "Colatina",
  "São Mateus",
  "Aracruz",
  // Sul
  "Cachoeiro de Itapemirim",
  "Marataízes",
  "Anchieta",
] as const;

export type ESCity = typeof ES_CITIES[number];
