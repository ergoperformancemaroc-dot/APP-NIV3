const API_KEY = 'AIzaSyBuZreXaZOBk03KG9OBrAt_UrAHwfwV-WM';

const improveImageQuality = (base64Image) => {
  return base64Image;
};

export const extractVehicleData = async (base64Image) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `EXPERT EN LECTURE DE VIN - TÂCHE CRITIQUE

Tu es un système expert en identification de numéros VIN sur les véhicules.

📋 OBJECTIVE PRINCIPALE:
Extraire le numéro VIN visible sur le tableau de bord, la portière, ou la plaque d'identification du véhicule.

🔍 CARACTÉRISTIQUES DU VIN:
- Exactement 17 caractères alphanumériques (A-Z, 0-9)
- Format standard international: ABC1234567890DEF
- Jamais de tirets, espaces ou caractères spéciaux
- Toujours en MAJUSCULES

📸 INSTRUCTIONS DE LECTURE:
1. Localise le VIN sur l'image (tableau de bord, portière, plaque moteur)
2. Lis CHAQUE caractère individuellement (gauche à droite)
3. Distingue bien: 0 (zéro) vs O (lettre O), 1 (un) vs I (lettre I), 5 vs S, 8 vs B
4. Si un caractère n'est pas lisible à 100%, marque comme UNKNOWN
5. Compte toujours 17 caractères

🚗 AUTRES INFORMATIONS:
- MAKE: Marque du véhicule (BMW, Mercedes, Toyota, Renault, etc.)
- MODEL: Modèle exact
- YEAR: Année de fabrication (extraite du VIN ou du véhicule)

⚠️ RÈGLES CRITIQUES:
- Si tu ne vois PAS le VIN clairement sur l'image: "error": "VIN non visible sur l'image"
- Si le VIN est partiellement lisible: inclure les caractères connus
- Ne JAMAIS inventer ou deviner des caractères
- Réponds UNIQUEMENT en JSON valide

RÉPONDS AU FORMAT JSON (sans texte supplémentaire):
{
  "vin": "ABC1234567890DEF",
  "make": "BMW",
  "model": "X5",
  "year": "2020",
  "confidence": "high|medium|low",
  "error": null
}

SI ERREUR:
{
  "vin": "",
  "make": "",
  "model": "",
  "year": "",
  "confidence": "low",
  "error": "Raison de l'échec"
}`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: improveImageQuality(base64Image)
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Nettoie la réponse (peut contenir du texte avant le JSON)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Impossible de lire l\'image' };
    
    // Valide le VIN
    if (result.vin && result.vin.length !== 17) {
      result.error = `VIN invalide: ${result.vin.length} caractères au lieu de 17`;
    }
    
    return result;
  } catch (err) {
    console.error('Erreur Gemini VIN:', err);
    return { error: 'Erreur réseau. Vérifiez votre connexion Internet.' };
  }
};

export const extractLocationData = async (base64Image) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Extrais le NUMÉRO OU CODE DE ZONE/EMPLACEMENT visible sur cette image.

Cherche:
- Des panneaux avec lettres et chiffres (A1, B2, ZONE-C, etc.)
- Des codes d'emplacement peints au sol
- Des étiquettes d'emplacement de stockage
- Tout identifiant de zone visible

Réponds UNIQUEMENT avec le code trouvé en MAJUSCULES (ex: A1, ZONE-B, C3).
Si rien n'est visible, réponds: UNKN OWN

Ne donne que le code, rien d'autre.`
          }, {
            inline_data: {
              mime_type: 'image/jpeg',
              data: base64Image
            }
          }]
        }]
      })
    });

    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || 'UNKNOWN').trim().toUpperCase();
    return text === 'UNKNOWN' ? null : text;
  } catch (err) {
    console.error('Erreur Gemini Location:', err);
    return null;
  }
};
