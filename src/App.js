import { BrowserRouter as Router } from 'react-router-dom';

// ...existing code...

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      {/* ...existing code... */}
    </Router>
  );
}

// ...existing code...