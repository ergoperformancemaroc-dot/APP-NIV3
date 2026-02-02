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

// Corrige les erreurs courantes de reconnaissance OCR
const correctCommonOCRErrors = (vin) => {
  if (!vin) return vin;
  
  let corrected = vin.toUpperCase();
  
  // Remplace les caractères fréquemment mal reconnus
  const corrections = {
    '0': 'O', // Zéro → O (si contexte le demande)
    'O': '0', // O → 0
    'l': '1', // L minuscule → 1
    'L': '1', // L majuscule → 1
    'I': '1', // I → 1
    'S': '5', // S → 5
    'Z': '2', // Z → 2
    'G': '6', // G → 6
    'B': '8', // B → 8
  };
  
  // Correction intelligente basée sur position
  let result = '';
  for (let i = 0; i < corrected.length; i++) {
    let char = corrected[i];
    
    // Les 3 premiers caractères sont toujours des lettres (WMI)
    if (i < 3) {
      if (char === '0') char = 'O';
      if (char === '1') char = 'I';
    }
    
    result += char;
  }
  
  // Enlève les caractères invalides (jamais I, O, Q dans un VIN)
  result = result.replace(/[IOQ]/g, '');
  
  return result;
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
              text: `🔍 LECTEUR VIN EXPERT - RECONNAISSANCE OPTIQUE AVANCÉE

Tu es un système OCR ultra-spécialisé en reconnaissance de numéros VIN sur automobile. Ton objectif est d'extraire le VIN avec MAXIMUM de précision même si la photo est floue, mal éclairée ou en angle.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FORMAT VIN (17 caractères)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Position 1-3: WMI (World Manufacturer Code) - LETTRES UNIQUEMENT
Position 4-9: VDS (Vehicle Descriptor Section) - Lettres/Chiffres
Position 10: Année
Position 11-17: VIS (Vehicle Identifier Section) - Lettres/Chiffres

CARACTÈRES VALIDES: A-H, J-N, P, R-Z, 0-9
JAMAIS: I, O, Q (ambiguïté avec 1, 0, 9)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 STRATÉGIE DE RECONNAISSANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ÉTAPE 1 - LOCALISATION:
- Cherche le VIN sur le tableau de bord (lieu principal)
- Cherche sur la portière conducteur ou plaque de constructeur
- Ignore les numéros de série autres (immatriculation, etc.)

ÉTAPE 2 - EXTRACTION:
- Lis chaque caractère individuellement de gauche à droite
- Utilise OCR haute résolution même sur images floues
- Accepte les variations: reflets, ombres, angles, flou

ÉTAPE 3 - CORRECTION INTELLIGENTE:
Pour chaque caractère mal lisible, applique ces règles:

Position 1-3 (WMI - Marque):
  - Toujours des LETTRES
  - 0 → O, 1 → I, 2 → Z, etc.
  
Position 4-9 (VDS - Descripteur):
  - Peut être Lettre ou Chiffre
  - Contexte du véhicule
  
Position 10 (Année):
  - Généralement chiffre 0-9 ou lettre A-Y
  - Suit un pattern cyclique
  
Position 11-17 (VIS - Identifiant):
  - Lettres et chiffres
  - Dernier chiffre = checksum (calculable)

ÉTAPE 4 - VALIDATION:
- Compte 17 caractères exactement
- Pas de I, O, Q
- Premier caractère = lettre
- Si manquent 1-2 caractères: essaie de les deviner

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CONFUSIONS COURANTES À ÉVITER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0 (zéro) vs O (lettre)    → Position 1-3: O | Position 4+: contexte
1 (un) vs I (lettre)      → Position 1-3: I | Jamais I dans VIN
1 (un) vs L (lettre)      → 1 = plus droit, L = courbé
5 vs S                    → 5 = anguleux, S = arrondi
2 vs Z                    → 2 = fermé haut, Z = diagonal
8 vs B                    → 8 = deux cercles, B = un côté plat
6 vs G                    → 6 = cercle seul, G = avec crochet

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 FORMAT RÉPONSE JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SI SUCCÈS:
{
  "vin": "WBXYZ1234567890",
  "make": "BMW",
  "model": "3 Series",
  "year": "2020",
  "readable": true,
  "confidence": 0.95,
  "notes": "VIN lu clairement du tableau de bord",
  "error": null
}

SI PARTIELLEMENT LISIBLE:
{
  "vin": "WBX??1234567890",
  "make": "BMW",
  "model": "Serie 3",
  "year": "2020",
  "readable": true,
  "confidence": 0.75,
  "notes": "2 caractères flous mais reconstituables",
  "error": null
}

SI NON LISIBLE:
{
  "vin": "",
  "make": "",
  "model": "",
  "year": "",
  "readable": false,
  "confidence": 0,
  "notes": "Aucun VIN visible",
  "error": "VIN non visible ou complètement illisible"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 RÈGLES STRICTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Chaque réponse = JSON valide uniquement
2. VIN = exactement 17 caractères (ou marqué comme incomplet)
3. Pas d'I, O, Q sauf cas exceptionnel
4. Confiance (0-1) honnête, pas d'optimisme
5. Si doute: marque comme "??" le caractère
6. Essaie TOUJOURS de récupérer au moins 15 caractères

Réponds UNIQUEMENT en JSON, sans texte supplémentaire.`
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
    
    // Nettoie et corrige le VIN
    if (result.vin) {
      result.vin = result.vin.toUpperCase().replace(/[^A-Z0-9?]/g, '').substring(0, 17);
      
      // Si le VIN a des "??", essaie de le corriger
      if (result.vin.includes('?')) {
        result.vin = correctCommonOCRErrors(result.vin);
      }
    }
    
    // Valide la longueur
    if (result.vin && result.vin.replace(/\?/g, '').length < 15) {
      result.error = `VIN trop incomplet. ${result.vin.replace(/\?/g, '').length}/17 caractères lisibles`;
      result.readable = false;
    }
    
    // Si on a un VIN complet, détecte la marque
    if (result.vin && result.vin.length === 17 && !result.vin.includes('?')) {
      if (!result.make) {
        result.make = detectMakeFromVIN(result.vin) || '';
      }
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

Cherche des panneaux, étiquettes ou marquages avec:
- Lettres + Chiffres (A1, B2, ZONE-C, C3, D4, etc.)
- Codes de stationnement/stockage
- Identifiants d'emplacement

Technique OCR avancée:
- Si flou: utilise reconnaissance de motifs
- Si mal éclairé: intensifie le contraste mentalement
- Si angle: corrige l'angle virtuellement

Réponds UNIQUEMENT avec le code trouvé en MAJUSCULES.
Exemple: A1, ZONE-B, C3

Si rien n'est visible ou lisible, réponds: UNKNOWN`
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
Marque détectée: ${make}

Déduis le modèle probable du véhicule et l'année de fabrication.

Utilise ta connaissance des codes VIN pour:
- Position 10 = code année (A=2010, B=2011, ..., Y=2030)
- Positions 4-8 = descripteur du modèle
- Positions 11-17 = identifiant unique

Réponds UNIQUEMENT en JSON:
{"model": "3 Series", "year": "2020"}`
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
