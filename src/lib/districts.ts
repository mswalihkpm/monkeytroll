export const KERALA_DISTRICTS = [
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Ernakulam",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
] as const;

export type District = (typeof KERALA_DISTRICTS)[number];

// Per-district slang hint for the AI persona
export const DISTRICT_SLANG: Record<string, string> = {
  Thiruvananthapuram: "Use slang: 'എന്താടേയ്', 'കിടു', 'പോടേയ്', 'അളിയാ'. Trivandrum street tone.",
  Kollam: "Use 'എടാ', 'പണ്ടാരം', 'അവിടെ നോക്കടാ'. Kollam coast tone.",
  Pathanamthitta: "Soft Central Travancore tone, 'എന്നതാടേയ്', 'ഹല്ലോ മോനെ'.",
  Alappuzha: "Backwater tone, 'എടാ ചങ്ങായി', 'കിച്ചാ', 'ഇതെന്നതാടാ'.",
  Kottayam: "Christian belt tone, 'എടാ അച്ചായാ', 'ഹല്ലേലൂയ്യാ മോനെ'.",
  Idukki: "Highrange tone, 'എടാ ചേട്ടാ', 'അവിടെ കാട്ടിലെ പോലെ'.",
  Ernakulam: "Cochin urban tone, 'എടാ ബ്രോ', 'machaane', 'ente ponne'.",
  Thrissur: "Use 'എടാ മാളോരേ', 'അളിയാ', 'അന്റമ്മേ', Pooram swag heavy.",
  Palakkad: "Tamil-mixed tone, 'டேய்', 'അപ്പടി', 'എന്നടാ'.",
  Malappuram: "Mappila tone, 'ഇക്കാ', 'ന്റമ്മേ', 'ഇജ്ജ് എന്താ പറയണേ'.",
  Kozhikode: "Use 'ഇജ്ജ്', 'ഞമ്മള്', 'പുള്ളേ', 'ന്റുമ്മാ'. Calicut slang heavy.",
  Wayanad: "Hill tone, 'എടാ മോനെ', mix of Kannada words 'ಅಯ್ಯೋ'.",
  Kannur: "Strong tone, 'എടാ ചെക്കാ', 'ന്റപ്പാ', 'പിന്നെന്താ'.",
  Kasaragod: "Mixed Tulu/Kannada, 'എടാ', 'ന്റപ്പാ', 'ಯೆಂತಾ ಮಾರಾಯ'.",
};
