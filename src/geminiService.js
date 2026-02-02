const API_KEY = 'AIzaSyBuZreXaZOBk03KG9OBrAt_UrAHwfwV-WM';

export const extractVehicleData = async (base64Image) => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Extrait le VIN, la marque, le modèle et l\'année de cette image de véhicule. Réponds UNIQUEMENT en JSON: {"vin":"", "make":"", "model":"", "year":""}. Si tu ne peux pas extraire une information, laisse le champ vide.'
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    return result;
  } catch (err) {
    console.error('Erreur Gemini:', err);
    return { error: 'Erreur de connexion IA' };
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
            text: 'Extrait le numéro ou le code de zone/emplacement visible sur cette image. Réponds UNIQUEMENT avec le code (ex: A1, B2, ZONE-3). Si tu ne trouves rien, réponds: INCONNU'
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'INCONNU';
    return text.trim();
  } catch (err) {
    console.error('Erreur Gemini:', err);
    return null;
  }
};
