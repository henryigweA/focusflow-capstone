import { useState } from 'react';
import api from '../api';

const MOODS = ['Motivated', 'Focused', 'Neutral', 'Tired', 'Distracted'];

function SessionForm({ onSessionCreated }) {
  const [task, setTask] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [mood, setMood] = useState(MOODS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task || !category || !duration) return;

    setSubmitting(true);
    try {
      await api.post('/sessions', {
        task,
        category,
        duration: Number(duration),
        mood,
      });
      setTask('');
      setCategory('');
      setDuration('');
      onSessionCreated();
    } catch (err) {
      alert('Failed to save session. Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="session-form" onSubmit={handleSubmit}>
      <h2>Log a Session</h2>
      <input
        placeholder="Task (e.g. Study Docker)"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        required
      />
      <input
        placeholder="Category (e.g. Learning)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        required
      />
      <input
        type="number"
        min="1"
        placeholder="Duration (minutes)"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        required
      />
      <select value={mood} onChange={(e) => setMood(e.target.value)}>
        {MOODS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Log Session'}
      </button>
    </form>
  );
}

export default SessionForm;
