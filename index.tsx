import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Starting index.tsx execution...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  // Explicitly clear the loading spinner HTML to ensure a clean slate
  rootElement.innerHTML = '';
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // Signal to the HTML watchdog that we successfully initiated the mount
  // The actual App useEffect will confirm full load, but this stops the panic timer
  (window as any).appMounted = true;
  console.log("React mount command sent.");
} catch (error) {
  console.error("Fatal error during React mounting:", error);
  throw error;
}