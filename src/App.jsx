import React, { useState, useRef, useEffect } from 'react';
import { extractVehicleData, extractLocationData } from './geminiService';
import Button from './Button';

const App = () => {
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState({});
  const [history, setHistory] = useState([]);
  const [activeLocation, setActiveLocation] = useState('');
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [settings, setSettings] = useState({
    companyName: 'MA CONCESSION',
    allowedLocations: [],
    strictLocationMode: false
  });

  const vinCameraRef = useRef(null);
  const vinGalleryRef = useRef(null);
  const locCameraRef = useRef(null);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(checkStandalone);

    const savedHistory = localStorage.getItem('vin_scan_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedSettings = localStorage.getItem('vin_scan_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => {
    localStorage.setItem('vin_scan_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('vin_scan_settings', JSON.stringify(settings));
  }, [settings]);

  const vibrate = (type = 'success') => {
    if (!window.navigator || !window.navigator.vibrate) return;
    const patterns = { success: [10, 30, 10], warning: [100, 50, 100], error: [200, 50, 200] };
    window.navigator.vibrate(patterns[type]);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'VIN Scan Pro',
      text: `Application de gestion de stock pour ${settings.companyName}`,
      url: window.location.origin + window.location.pathname,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        vibrate('success');
      } else {
        await copyAppURL();
      }
    } catch (err) {
      if (err.name !== 'AbortError') await copyAppURL();
    }
  };

  const copyAppURL = async () => {
    const url = window.location.origin + window.location.pathname;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        showCopySuccess();
        return;
      } catch (e) {}
    }

    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showCopySuccess();
      } else {
        window.prompt("Copiez ce lien :", url);
      }
    } catch (err) {
      window.prompt("Copiez ce lien :", url);
    }
    document.body.removeChild(textArea);
  };

  const showCopySuccess = () => {
    setCopyFeedback(true);
    vibrate('success');
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const clearHistory = () => {
    if (window.confirm("Voulez-vous vraiment vider tout l'historique ?")) {
      setHistory([]);
      vibrate('warning');
    }
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    const headers = ["NIV", "Marque", "Modele", "Annee", "Emplacement", "Remarques", "Date", "Heure", "Entreprise"];
    const rows = history.map(item => [
      item.vin,
      item.make,
      item.model,
      item.year,
      item.location,
      item.remarks || "",
      item.fullDate,
      item.timestamp,
      settings.companyName
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stock_${settings.companyName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const handleImageUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result.split(',')[1];
      try {
        if (type === 'vin') {
          const result = await extractVehicleData(base64String);
          if (result.error) {
            setError(result.error);
            vibrate('error');
          } else {
            const detectedVin = (result.vin || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
            if (detectedVin.length !== 17) {
              setError(`NIV détecté incomplet (${detectedVin.length}/17).`);
              vibrate('warning');
            } else if (history.some(item => item.vin === detectedVin)) {
              setError("ATTENTION : Déjà en stock.");
              vibrate('error');
            } else {
              vibrate('success');
              setVehicleData({
                vin: detectedVin,
                make: result.make || '',
                model: result.model || '',
                year: result.year || '',
                remarks: ''
              });
            }
          }
        } else {
          const locResult = await extractLocationData(base64String);
          if (locResult) {
            vibrate('success');
            setActiveLocation(locResult.toUpperCase().substring(0, 15));
            setIsLocationLocked(true);
          }
        }
      } catch (err) {
        setError("Erreur de connexion IA.");
      } finally {
        setLoading(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const saveToHistory = () => {
    const vin = (vehicleData.vin || '').trim().toUpperCase();
    if (vin.length !== 17 || !activeLocation) return;
    const now = new Date();
    const newEntry = {
      vin,
      make: vehicleData.make || 'Inconnue',
      model: vehicleData.model || 'Inconnu',
      year: vehicleData.year || 'N/A',
      location: activeLocation,
      remarks: (vehicleData.remarks || '').trim(),
      fullDate: now.toLocaleDateString('fr-FR'),
      timestamp: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setHistory([newEntry, ...history]);
    setVehicleData({ vin: '', make: '', model: '', year: '', remarks: '' });
    vibrate('success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 pb-32">
      {!isStandalone && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-2 px-4 text-xs font-bold z-50">
          📲 Installation App : Options {">"} Ajouter à l'écran d'accueil
          <button onClick={handleShare} className="ml-2 underline font-black">
            {copyFeedback ? 'LIEN COPIÉ !' : 'PARTAGER APP'}
          </button>
        </div>
      )}

      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-6 mb-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <h1 className="text-3xl font-black mb-1 relative z-10">{settings.companyName}</h1>
          <p className="text-blue-100 text-sm font-bold relative z-10">Gestion de Stock IA v0.5</p>
          <button
            onClick={() => setShowSettings(true)}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 active:scale-90 transition-all cursor-pointer"
          >
            ⚙️
          </button>
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white text-slate-900 rounded-3xl p-6 max-h-96 overflow-y-auto w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">Paramètres</h2>
                <button onClick={() => setShowSettings(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-black mb-2">Partager l'Application</h3>
                  <button onClick={handleShare} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black">
                    {copyFeedback ? 'Lien Copié ! ✅' : 'Partager / Copier Lien'}
                  </button>
                </div>

                <div>
                  <h3 className="font-black mb-2">Nom Concession</h3>
                  <input
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <h3 className="font-black mb-2">Zones (A1, B2...)</h3>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newLocationInput}
                      onChange={(e) => setNewLocationInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                      placeholder="Ex: ZONE-A"
                    />
                    <button
                      onClick={() => {
                        if(newLocationInput){
                          setSettings({...settings, allowedLocations: [...settings.allowedLocations, newLocationInput.toUpperCase()]});
                          setNewLocationInput('');
                          vibrate('success');
                        }
                      }}
                      className="bg-blue-600 text-white px-5 rounded-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                  {settings.allowedLocations.map(loc => (
                    <div key={loc} className="flex justify-between items-center p-2 bg-slate-100 rounded mb-1">
                      <span className="font-black">{loc}</span>
                      <button onClick={() => setSettings({...settings, allowedLocations: settings.allowedLocations.filter(l => l !== loc)})} className="text-red-400">×</button>
                    </div>
                  ))}
                </div>

                <button onClick={clearHistory} className="w-full py-2 bg-red-600 text-white rounded-xl font-black text-sm">
                  Vider l'historique de stock
                </button>

                <button onClick={() => setShowSettings(false)} className="w-full py-4 uppercase font-black tracking-widest text-[11px] bg-slate-900 text-white rounded-xl">
                  Enregistrer & Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black">1. Emplacement</h2>
            {isLocationLocked && <button onClick={() => setIsLocationLocked(false)} className="text-[10px] font-black text-blue-400 uppercase underline">Changer</button>}
          </div>

          {!isLocationLocked ? (
            <>
              <select
                value={activeLocation}
                onChange={(e) => setActiveLocation(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 focus:border-blue-500 outline-none appearance-none mb-4"
              >
                <option value="">-- Sélectionnez Zone --</option>
                {settings.allowedLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>

              <label className="block mb-4">
                <span className="text-sm font-bold mb-2 block">Ou Photo</span>
                <button
                  onClick={() => locCameraRef.current?.click()}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  📷 Scanner Zone
                </button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={locCameraRef}
                  onChange={(e) => handleImageUpload(e, 'location')}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => { if(activeLocation) setIsLocationLocked(true); vibrate('success'); }}
                disabled={!activeLocation}
                className="w-full py-4 bg-emerald-600 font-black uppercase tracking-widest text-[11px] rounded-xl disabled:opacity-50"
              >
                Valider Emplacement
              </button>
            </>
          ) : (
            <div className="bg-slate-700/50 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-300">Zone Actuelle :</p>
              <p className="text-2xl font-black text-emerald-400">{activeLocation}</p>
            </div>
          )}
        </div>

        {isLocationLocked && (
          <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700">
            <h2 className="text-lg font-black mb-4">2. Scanner NIV</h2>

            <button
              onClick={() => vinCameraRef.current?.click()}
              className="w-full flex items-center justify-center gap-4 py-8 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-sm shadow-xl active:scale-95 transition-all shadow-blue-500/20 mb-3"
            >
              📸 Scanner VIN depuis photo
            </button>

            <button
              onClick={() => vinGalleryRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all mb-4"
            >
              🖼️ Importer depuis Galerie
            </button>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={vinCameraRef}
              onChange={(e) => handleImageUpload(e, 'vin')}
              className="hidden"
            />
            <input
              type="file"
              accept="image/*"
              ref={vinGalleryRef}
              onChange={(e) => handleImageUpload(e, 'vin')}
              className="hidden"
            />

            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={vehicleData.vin || ''}
                onChange={(e) => setVehicleData({...vehicleData, vin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                className={`w-full bg-slate-50 border-2 rounded-2xl px-5 py-5 text-lg font-black uppercase outline-none transition-all font-mono text-slate-900 ${error ? 'border-red-500 ring-4 ring-red-100' : 'border-slate-100 focus:border-blue-500'}`}
                placeholder="ABC1234567890..."
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={vehicleData.make || ''}
                  onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                  className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  placeholder="Marque"
                />
                <input
                  type="text"
                  value={vehicleData.model || ''}
                  onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                  className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  placeholder="Modèle"
                />
              </div>

              <label className="block">
                <span className="text-sm font-bold mb-2 block">Remarques (Pneus, clés...)</span>
                <textarea
                  value={vehicleData.remarks || ''}
                  onChange={(e) => setVehicleData({...vehicleData, remarks: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-500 min-h-[60px]"
                  placeholder="Notes facultatives..."
                />
              </label>
            </div>

            {error && <div className="bg-red-500/20 border border-red-500 rounded-xl p-3 mb-4 text-red-200 font-bold text-sm">{error}</div>}

            <Button onClick={saveToHistory} className="w-full py-4 bg-emerald-600 font-black uppercase tracking-widest text-[11px] rounded-xl">
              Enregistrer au Stock
            </Button>
          </div>
        )}

        {history.length > 0 && (
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black">Historique Stock ({history.length})</h2>
              <div className="flex gap-2">
                <button onClick={clearHistory} className="text-xs bg-red-600 px-3 py-1 rounded font-bold">Vider</button>
                <button onClick={exportToCSV} className="text-xs bg-green-600 px-3 py-1 rounded font-bold">CSV</button>
              </div>
            </div>

            <div className="space-y-3">
              {history.map((item, idx) => (
                <div key={idx} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                  <div className="flex gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-black text-white flex-shrink-0">
                      {item.make.substring(0, 1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-black">{item.make} {item.model}</p>
                      <p className="text-sm text-slate-400 font-mono">{item.vin}</p>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-emerald-400 mb-2">📍 {item.location}</p>

                  {item.remarks && (
                    <div className="bg-slate-800/50 rounded p-2 mb-2">
                      <p className="text-xs font-bold text-slate-300">Notes: {item.remarks}</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400">{settings.companyName} • {item.fullDate} - {item.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="font-black text-slate-900">Analyse Intelligence Artificielle...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
