
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiResponse } from "../types";

export const extractVehicleData = async (base64Image: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyse cette image d'un véhicule, d'une plaque d'immatriculation ou d'une plaque constructeur.
    1. Trouve impérativement le NIV (Numéro d'Identification du Véhicule) ou VIN. Il DOIT faire exactement 17 caractères alphanumériques.
    2. Si le NIV est trouvé, décode-le pour extraire la Marque (Make), le Modèle (Model) et l'Année (Year).
    3. Cherche aussi tout code court d'emplacement (ex: A1, B12, ZONE-A).
    
    Réponds EXCLUSIVEMENT en JSON. 
    Format attendu : {"vin": "17_CARACTS", "make": "...", "model": "...", "year": "...", "locationCode": "..."}
    Si le VIN ne fait pas 17 caractères, laisse le champ vide ou mets ce que tu vois mais note que la précision est vitale.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vin: { type: Type.STRING, description: "Numéro de châssis de 17 caractères" },
            make: { type: Type.STRING },
            model: { type: Type.STRING },
            year: { type: Type.STRING },
            locationCode: { type: Type.STRING },
          },
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error) {
    console.error("Erreur Gemini:", error);
    return { error: "Impossible d'analyser l'image. Vérifiez que le NIV est bien lisible." };
  }
};

export const extractLocationData = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyse cette image et extrais uniquement le code d'emplacement court (ex: A1, B-202, SHELF-01). 
    Ignore tout autre texte. Réponds uniquement par le texte du code détecté.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      }
    });

    return (response.text || "").trim().substring(0, 15);
  } catch (error) {
    console.error("Erreur Gemini Location:", error);
    return "";
  }
};
