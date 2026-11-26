import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { name: string; mascot?: string; members: string[] };
type TeamResponse = { teams: Team[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<TeamResponse>('/api/teams')
      .then(({ teams: result }) => setTeams(result))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unknown error'));
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {error ? (
          <p role="alert">Unable to load teams: {error}</p>
        ) : teams === null ? (
          <p role="status">Loading teams...</p>
        ) : teams.length === 0 ? (
          <p>No teams yet.</p>
        ) : (
          <ul className="list-group">
            {teams.map((team, index) => (
              <li className="list-group-item" key={`${team.name}-${index}`}>
                <strong>{team.name}</strong>
                {team.mascot && <span> — {team.mascot}</span>}
                {team.members.length > 0 && <span> ({team.members.join(', ')})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
