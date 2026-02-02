const API_KEY = 'AIzaSyBuZreXaZOBk03KG9OBrAt_UrAHwfwV-WM';

const VIN_DATABASE = {
  'BMW': ['BA', 'BF'],
  'Mercedes': ['WDB', 'WBK'],
  'Audi': ['WAU', 'WAG'],
  'Volkswagen': ['WVW', 'WV1'],
  'Renault': ['VF1', 'VF3'],
  'Peugeot': ['VF3'],
  'Citroën': ['VF7'],
  'Toyota': ['JT', 'JT2'],
  'Honda': ['JHM', 'JHMC'],
  'Nissan': ['JN1', 'JTHB'],
  'Hyundai': ['KMH'],
  'Kia': ['KNDC', 'KMHEC'],
  'Volvo': ['YV'],
  'Jaguar': ['SAJ'],
  'Porsche': ['WP0'],
  'Ferrari': ['ZFF'],
  'Lamborghini': ['ZHW'],
  'Fiat': ['ZFF'],
  'Alfa Romeo': ['ZAR'],
  'Lancia': ['ZLA']
};

const detectMakeFromVIN = (vin) => {
  if (!vin || vin.length < 3) return null;
  
  for (const [make, prefixes] of Object.entries(VIN_DATABASE)) {
    for (const prefix of prefixes) {
      if (vin.startsWith(prefix)) {
        return make;
      }
    }
  }
  return null;
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
              text: `🔍 EXPERT EN RECONNAISSANCE DE VIN - MODE HAUTE QUALITÉ

Tu es un système OCR expert pour identifier les numéros VIN sur les véhicules, même avec une photo de mauvaise qualité.

📋 TÂCHE CRITIQUE:
Extraire le numéro VIN d'une image, indépendamment de la qualité de la photo.

🎯 STRATÉGIES DE RECONNAISSANCE:
1. Si le VIN est visible ET lisible → extrait directement
2. Si le VIN est partiellement flou → utilise OCR avancé + reconnaissance de motifs
3. Si la photo est très mauvaise → reconstitue les caractères manquants basé sur:
   - Positions de caractères visibles
   - Logique du format VIN (jamais I, O, Q aux positions spécifiques)
   - Motifs courants de numérotation
4. ACCEPTE les variations (reflection, angle, ombre, flou de mouvement)

🔤 CARACTÈRES VIN VALIDES:
- Majuscules: A-Z (SAUF I, O, Q)
- Chiffres: 0-9
- Jamais d'espaces, tirets ou caractères spéciaux
- Format: 3 caractères (World Manufacturer Code) + 6 caractères (descriptifs) + 8 caractères (identifiant)

📸 TECHNIQUES DE LECTURE:
1. Cherche le VIN sur: tableau de bord, portière, bloc moteur, plaque de constructeur
2. Lis de gauche à droite, caractère par caractère
3. Pour les caractères flous, utilise:
   - Forme générale du caractère
   - Context OCR (IA vision)
   - Probabilité basée sur formats VIN courants
4. Si 2-3 caractères manquent, essaie de les déduire

⚠️ RÈGLES STRICTES:
- Sortie TOUJOURS 17 caractères
- Pas d'invention pure - basé sur indices visuels
- Toujours MAJUSCULES
- Jamais I, O, Q sauf dans cas très évidents

📊 RÉPONSE JSON (format strict):
{
  "vin": "ABC1234567890DEF",
  "make": "BMW",
  "model": "X5",
  "year": "2020",
  "readable": true,
  "confidence": 0.95,
  "error": null
}

SI VIN NON LISIBLE:
{
  "vin": "",
  "make": "",
  "model": "",
  "year": "",
  "readable": false,
  "confidence": 0,
  "error": "Impossible de déchiffrer le VIN sur cette photo"
}`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Impossible de lire l\'image' };
    
    if (result.vin) {
      result.vin = result.vin.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 17);
    }
    
    if (result.vin && result.vin.length !== 17) {
      result.error = `VIN invalide: ${result.vin.length} caractères`;
      result.readable = false;
    }
    
    if (result.vin && !result.make) {
      result.make = detectMakeFromVIN(result.vin) || '';
    }
    
    return result;
  } catch (err) {
    console.error('Erreur Gemini VIN:', err);
    return { error: 'Erreur réseau. Vérifiez votre connexion.' };
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
            text: `Extrais le code de zone/emplacement visible sur cette image.

Cherche: A1, B2, ZONE-C, C3, D4, etc.

Réponds UNIQUEMENT avec le code en MAJUSCULES.
Si rien n'est visible, réponds: UNKNOWN`
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
    console.error('Erreur Location:', err);
    return null;
  }
};

export const getVehicleModelFromVIN = async (vin) => {
  const make = detectMakeFromVIN(vin);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Basé sur ce VIN: ${vin}

Déduis le modèle probable du véhicule et l'année.

Responds UNIQUEMENT en JSON:
{"model": "X5", "year": "2020"}`
          }]
        }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { model: '', year: '' };
  } catch (err) {
    return { model: '', year: '' };
  }
};
