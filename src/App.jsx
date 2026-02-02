import React, { useState, useRef, useEffect } from 'react';
import { extractVehicleData, extractLocationData } from './geminiService';
import Button from './Button';
import './index.css';

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
              setError(`NIV détecté incomplet (${detectedVin.length}/17). Veuillez réessayer avec une meilleure image.`);
              vibrate('warning');
            } else if (history.some(item => item.vin === detectedVin)) {
              setError("⚠️ ATTENTION : Ce véhicule est déjà en stock.");
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
              setError(null);
            }
          }
        } else {
          const locResult = await extractLocationData(base64Image);
          if (locResult) {
            vibrate('success');
            setActiveLocation(locResult.toUpperCase().substring(0, 15));
            setIsLocationLocked(true);
          }
        }
      } catch (err) {
        setError("Erreur de connexion IA. Vérifiez votre clé API.");
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
    setError(null);
    vibrate('success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white pb-32">
      {!isStandalone && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center py-3 px-4 shadow-lg">
          <div className="flex items-center justify-center gap-2 text-sm font-bold">
            <span>📲 Installation App</span>
            <button onClick={handleShare} className="ml-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all font-black text-xs">
              {copyFeedback ? '✅ COPIÉ' : 'PARTAGER'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 pt-6">
        {/* HEADER */}
        <div className="relative mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur-2xl opacity-40"></div>
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-3xl p-8 shadow-2xl border border-blue-500/30">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-black mb-2 tracking-tight">{settings.companyName}</h1>
                <p className="text-blue-100 text-sm font-bold opacity-90">Gestion de Stock IA • v0.5</p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="w-12 h-12 bg-white/15 hover:bg-white/25 rounded-full flex items-center justify-center border border-white/30 active:scale-90 transition-all backdrop-blur-sm"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>

        {/* SETTINGS MODAL */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50 p-4 animate-in">
            <div className="bg-slate-900 text-white rounded-3xl p-6 w-full max-w-md max-h-96 overflow-y-auto shadow-2xl border border-slate-700 animate-in slide-in-from-bottom">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">Paramètres</h2>
                <button onClick={() => setShowSettings(false)} className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center font-bold transition-all">✕</button>
              </div>

              <div className="space-y-5">
                <div>
                  <button onClick={handleShare} className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-black transition-all active:scale-95">
                    {copyFeedback ? '✅ Lien Copié' : '🔗 Partager App'}
                  </button>
                </div>

                <div>
                  <label className="text-sm font-bold mb-2 block text-slate-300">Nom Concession</label>
                  <input
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold mb-2 block text-slate-300">Zones (A1, B2...)</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      value={newLocationInput}
                      onChange={(e) => setNewLocationInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-all"
                      placeholder="Ex: A1"
                    />
                    <button
                      onClick={() => {
                        if(newLocationInput){
                          setSettings({...settings, allowedLocations: [...settings.allowedLocations, newLocationInput.toUpperCase()]});
                          setNewLocationInput('');
                          vibrate('success');
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg font-bold transition-all"
                    >
                      ➕
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings.allowedLocations.map(loc => (
                      <div key={loc} className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                        <span className="font-bold text-sm">{loc}</span>
                        <button onClick={() => setSettings({...settings, allowedLocations: settings.allowedLocations.filter(l => l !== loc)})} className="text-red-400 hover:text-red-300 font-bold">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={clearHistory} className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-300 rounded-lg font-bold text-sm transition-all">
                  🗑️ Vider l'historique
                </button>

                <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-lg font-black transition-all">
                  ✓ Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOCATION SECTION */}
        <div className="mb-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <span className="text-2xl">📍</span>Étape 1 : Emplacement
              </h2>
            </div>
            {isLocationLocked && <button onClick={() => setIsLocationLocked(false)} className="text-xs font-black text-cyan-400 hover:text-cyan-300 uppercase">↻ Changer</button>}
          </div>

          {!isLocationLocked ? (
            <>
              <select
                value={activeLocation}
                onChange={(e) => setActiveLocation(e.target.value)}
                className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none mb-4 transition-all"
              >
                <option value="">-- Sélectionnez une zone --</option>
                {settings.allowedLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>

              <button
                onClick={() => locCameraRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold uppercase text-sm transition-all active:scale-95 mb-4"
              >
                📷 Ou scanner une zone
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={locCameraRef}
                onChange={(e) => handleImageUpload(e, 'location')}
                className="hidden"
              />

              <button
                onClick={() => { if(activeLocation) { setIsLocationLocked(true); vibrate('success'); } }}
                disabled={!activeLocation}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-black uppercase tracking-wide rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                ✓ Valider
              </button>
            </>
          ) : (
            <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-green-500/30">
              <p className="text-sm text-slate-400 mb-2">Zone Actuelle</p>
              <p className="text-3xl font-black text-green-400">{activeLocation}</p>
            </div>
          )}
        </div>

        {/* VIN SCANNER SECTION */}
        {isLocationLocked && (
          <div className="mb-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
            <h2 className="text-xl font-black flex items-center gap-2 mb-4">
              <span className="text-2xl">🔍</span>Étape 2 : Scanner VIN
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => vinCameraRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
              >
                <span className="text-2xl">📸</span>
                <span className="text-xs">Camera</span>
              </button>

              <button
                onClick={() => vinGalleryRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-4 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all"
              >
                <span className="text-2xl">🖼️</span>
                <span className="text-xs">Galerie</span>
              </button>
            </div>

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
                className={`w-full bg-slate-800 border-2 rounded-lg px-4 py-3 text-lg font-black uppercase outline-none font-mono transition-all ${error ? 'border-red-500 bg-red-950/20' : 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'}`}
                placeholder="ABC1234567890123"
                maxLength="17"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={vehicleData.make || ''}
                  onChange={(e) => setVehicleData({...vehicleData, make: e.target.value})}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Marque"
                />
                <input
                  type="text"
                  value={vehicleData.model || ''}
                  onChange={(e) => setVehicleData({...vehicleData, model: e.target.value})}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="Modèle"
                />
              </div>

              <textarea
                value={vehicleData.remarks || ''}
                onChange={(e) => setVehicleData({...vehicleData, remarks: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all min-h-20 resize-none"
                placeholder="Remarques (pneus, clés, état...)"
              />
            </div>

            {error && (
              <div className="bg-red-600/20 border border-red-500/50 rounded-lg p-4 mb-4 text-red-200 font-bold text-sm">
                ⚠️ {error}
              </div>
            )}

            <Button onClick={saveToHistory} className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-black uppercase tracking-wide rounded-lg transition-all active:scale-95">
              ✓ Enregistrer au stock
            </Button>
          </div>
        )}

        {/* HISTORY SECTION */}
        {history.length > 0 && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black flex items-center gap-2">
                <span className="text-2xl">📦</span>Historique ({history.length})
              </h2>
              <div className="flex gap-2">
                <button onClick={clearHistory} className="text-xs bg-red-600/30 hover:bg-red-600/50 px-3 py-1 rounded border border-red-600/50 font-bold transition-all">🗑️</button>
                <button onClick={exportToCSV} className="text-xs bg-green-600/30 hover:bg-green-600/50 px-3 py-1 rounded border border-green-600/50 font-bold transition-all">📊</button>
              </div>
            </div>

            <div className="space-y-3">
              {history.map((item, idx) => (
                <div key={idx} className="bg-slate-700/30 hover:bg-slate-700/50 rounded-lg p-4 border border-slate-700 transition-all">
                  <div className="flex gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-black text-white flex-shrink-0 shadow-lg">
                      {item.make.substring(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{item.make} {item.model}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{item.vin}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                    <div className="bg-slate-800/50 rounded p-2">
                      <p className="text-slate-400">Année</p>
                      <p className="font-black text-sm">{item.year}</p>
                    </div>
                    <div className="bg-green-900/20 rounded p-2 border border-green-600/30">
                      <p className="text-slate-400">Zone</p>
                      <p className="font-black text-green-400">{item.location}</p>
                    </div>
                  </div>

                  {item.remarks && (
                    <div className="bg-slate-800/50 rounded p-2 mb-2 border-l-2 border-yellow-500">
                      <p className="text-xs text-yellow-300 font-bold">📝 {item.remarks}</p>
                    </div>
                  )}

                  <p className="text-xs text-slate-500">📅 {item.fullDate} • {item.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-2xl p-8 text-center border border-slate-700 shadow-2xl">
            <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-cyan-400 rounded-full mx-auto mb-4"></div>
            <p className="font-black text-white">Analyse Intelligence Artificielle...</p>
            <p className="text-sm text-slate-400 mt-2">Veuillez patienter</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
