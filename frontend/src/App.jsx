import { useEffect, useState, useCallback } from 'react';
import api from './api';
import StatsCards from './components/StatsCards';
import SessionForm from './components/SessionForm';
import SessionList from './components/SessionList';

function App() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, statsRes] = await Promise.all([
        api.get('/sessions'),
        api.get('/sessions/stats'),
      ]);
      setSessions(sessionsRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      setError('Could not reach the FocusFlow API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="app">
      <header>
        <h1>FocusFlow</h1>
        <p>Track your focus sessions and see your progress.</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {stats && <StatsCards stats={stats} />}

      <SessionForm onSessionCreated={loadData} />

      <SessionList sessions={sessions} loading={loading} />
    </div>
  );
}

export default App;
