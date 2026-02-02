import React, { useState } from 'react';

const App: React.FC = () => {
  const [vin, setVin] = useState('');
  const [location, setLocation] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const handleAddVehicle = () => {
    if (vin && location) {
      setHistory([...history, { vin, location, date: new Date().toLocaleString('fr-FR') }]);
      setVin('');
      setLocation('');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>VIN Scan Pro</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Entrez le NIV"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase())}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '16px', boxSizing: 'border-box' }}
        />
        
        <input
          type="text"
          placeholder="Entrez l'emplacement"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px', fontSize: '16px', boxSizing: 'border-box' }}
        />
        
        <button
          onClick={handleAddVehicle}
          style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          Ajouter au stock
        </button>
      </div>

      <h2>Historique ({history.length})</h2>
      <div>
        {history.map((item, idx) => (
          <div key={idx} style={{ padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '10px', borderRadius: '5px' }}>
            <p><strong>NIV:</strong> {item.vin}</p>
            <p><strong>Emplacement:</strong> {item.location}</p>
            <p><strong>Date:</strong> {item.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
