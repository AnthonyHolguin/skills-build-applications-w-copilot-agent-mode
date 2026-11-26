import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = { title: string; focus?: string; reason?: string };
type WorkoutResponse = { suggestions: WorkoutSuggestion[] };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userEmail = encodeURIComponent('mona@example.com');
    getJson<WorkoutResponse>(`/api/workouts/suggestions/${userEmail}`)
      .then(({ suggestions: result }) => setSuggestions(result))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unknown error'));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {error ? (
          <p role="alert">Unable to load workout suggestions: {error}</p>
        ) : suggestions === null ? (
          <p role="status">Loading workout suggestions...</p>
        ) : suggestions.length === 0 ? (
          <p>No workout suggestions yet.</p>
        ) : (
          <ul className="list-group">
            {suggestions.map((suggestion, index) => (
              <li className="list-group-item" key={`${suggestion.title}-${index}`}>
                <strong>{suggestion.title}</strong>
                {suggestion.focus && <span> — {suggestion.focus}</span>}
                {suggestion.reason && <p className="mb-0">{suggestion.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
