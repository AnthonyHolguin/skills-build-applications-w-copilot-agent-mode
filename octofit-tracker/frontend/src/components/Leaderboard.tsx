import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = { teamName: string; totalPoints: number; rank: number };
type LeaderboardResponse = { leaderboard: LeaderboardEntry[] };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<LeaderboardResponse>('/api/leaderboard')
      .then(({ leaderboard: result }) => setLeaderboard(result))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unknown error'));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {error ? (
          <p role="alert">Unable to load leaderboard: {error}</p>
        ) : leaderboard === null ? (
          <p role="status">Loading leaderboard...</p>
        ) : leaderboard.length === 0 ? (
          <p>No leaderboard scores yet.</p>
        ) : (
          <ol className="list-group list-group-numbered">
            {leaderboard.map((entry) => (
              <li className="list-group-item d-flex justify-content-between" key={entry.rank}>
                <span>{entry.teamName}</span>
                <span>{entry.totalPoints} points</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
