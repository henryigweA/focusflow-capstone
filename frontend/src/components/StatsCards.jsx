function StatsCards({ stats }) {
  return (
    <div className="stats-cards">
      <div className="card">
        <span className="card-label">Total Sessions</span>
        <span className="card-value">{stats.total_sessions}</span>
      </div>
      <div className="card">
        <span className="card-label">Total Focus Time</span>
        <span className="card-value">{stats.total_minutes} min</span>
      </div>
      <div className="card">
        <span className="card-label">Avg Session Length</span>
        <span className="card-value">{stats.avg_minutes} min</span>
      </div>
    </div>
  );
}

export default StatsCards;
