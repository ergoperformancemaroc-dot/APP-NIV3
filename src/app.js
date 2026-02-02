import React, { useState } from 'react';

export default function App() {
  const [vin, setVin] = useState('');
  const [location, setLocation] = useState('');
  const [history, setHistory] = useState([]);

  const handleAddVehicle = () => {
    if (vin && location) {
      setHistory([...history, { vin, location, date: new Date().toLocaleString('fr-FR') }]);
      setVin('');
      setLocation('');
    }
  };

  return React.createElement('div', { style: { padding: '20px', fontFamily: 'Arial', maxWidth: '600px', margin: '0 auto' } },
    React.createElement('h1', null, 'VIN Scan Pro'),
    React.createElement('div', { style: { marginBottom: '20px' } },
      React.createElement('input', {
        type: 'text',
        placeholder: 'Entrez le NIV',
        value: vin,
        onChange: (e) => setVin(e.target.value.toUpperCase()),
        style: { width: '100%', padding: '10px', marginBottom: '10px', fontSize: '16px', boxSizing: 'border-box' }
      }),
      React.createElement('input', {
        type: 'text',
        placeholder: 'Entrez l\'emplacement',
        value: location,
        onChange: (e) => setLocation(e.target.value),
        style: { width: '100%', padding: '10px', marginBottom: '10px', fontSize: '16px', boxSizing: 'border-box' }
      }),
      React.createElement('button', {
        onClick: handleAddVehicle,
        style: { width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }
      }, 'Ajouter au stock')
    ),
    React.createElement('h2', null, `Historique (${history.length})`),
    React.createElement('div', null,
      history.map((item, idx) =>
        React.createElement('div', { key: idx, style: { padding: '10px', backgroundColor: '#f0f0f0', marginBottom: '10px', borderRadius: '5px' } },
          React.createElement('p', null, React.createElement('strong', null, 'NIV: '), item.vin),
          React.createElement('p', null, React.createElement('strong', null, 'Emplacement: '), item.location),
          React.createElement('p', null, React.createElement('strong', null, 'Date: '), item.date)
        )
      )
    )
  );
}
