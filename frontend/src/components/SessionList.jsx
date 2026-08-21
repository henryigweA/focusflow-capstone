function SessionList({ sessions, loading }) {
  if (loading) return <p className="status-text">Loading sessions...</p>;
  if (sessions.length === 0) return <p className="status-text">No sessions logged yet.</p>;

  return (
    <div className="session-list">
      <h2>Recent Sessions</h2>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Category</th>
            <th>Duration</th>
            <th>Mood</th>
            <th>Logged</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.task}</td>
              <td>{s.category}</td>
              <td>{s.duration} min</td>
              <td>{s.mood || '—'}</td>
              <td>{new Date(s.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SessionList;
