import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function apiError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input) || typeof input.userId !== 'string' || typeof input.teamId !== 'string' ||
      typeof input.type !== 'string' || !input.type.trim() || typeof input.minutes !== 'number' ||
      !Number.isFinite(input.minutes) || input.minutes <= 0) {
    throw apiError('Activity requires valid userId, teamId, type, and positive minutes', 400);
  }
  if (!mongoose.isObjectIdOrHexString(input.userId) || !mongoose.isObjectIdOrHexString(input.teamId)) {
    throw apiError('Activity userId and teamId must be valid ObjectIds', 400);
  }
  const [user, team] = await Promise.all([
    User.exists({ _id: input.userId }),
    Team.exists({ _id: input.teamId }),
  ]);
  if (!user || !team) {
    throw apiError('Activity userId and teamId must reference existing records', 400);
  }
  return Activity.create({
    user: user._id,
    team: team._id,
    type: input.type.trim(),
    minutes: input.minutes,
    points: input.minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input) || typeof input.name !== 'string' || !input.name.trim()) {
    throw apiError('Team name is required', 400);
  }
  if (typeof input.mascot !== 'string' || !input.mascot.trim()) {
    throw apiError('Team mascot is required', 400);
  }
  const memberIds = input.members === undefined ? [] : input.members;
  if (!Array.isArray(memberIds) || memberIds.some((id) => typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id))) {
    throw apiError('Team members must be valid user ObjectIds', 400);
  }
  const uniqueMemberIds = [...new Set(memberIds)];
  if (uniqueMemberIds.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: uniqueMemberIds } });
    if (existingMembers !== uniqueMemberIds.length) {
      throw apiError('Team members must reference existing users', 400);
    }
  }
  return Team.create({
    name: input.name.trim(),
    mascot: input.mascot.trim(),
    members: uniqueMemberIds,
  });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(String(team._id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

function focusForActivity(type: string) {
  const normalized = type.trim().toLowerCase();
  if (['run', 'running', 'cycle', 'cycling', 'walk', 'walking', 'swim', 'swimming', 'cardio'].includes(normalized)) {
    return 'endurance';
  }
  if (['strength', 'weights', 'weight training'].includes(normalized)) return 'strength';
  if (['yoga', 'stretching', 'mobility'].includes(normalized)) return 'mobility';
  return normalized;
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw apiError('User not found', 404);

  const [workouts, recentActivities] = await Promise.all([
    Workout.find().lean(),
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(10).lean(),
  ]);
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const recentActivity = recentActivities[0];
  const recentFocus = recentActivity ? focusForActivity(recentActivity.type) : undefined;
  const matchingFocus = [goalFocus, recentFocus].find((focus) =>
    focus && workouts.some((workout) => workout.focus.trim().toLowerCase() === focus),
  );
  const preferredFocus = matchingFocus ?? goalFocus ?? recentFocus;
  const sortedWorkouts = [...workouts].sort((left, right) => {
    const leftMatches = left.focus.trim().toLowerCase() === preferredFocus;
    const rightMatches = right.focus.trim().toLowerCase() === preferredFocus;
    return Number(rightMatches) - Number(leftMatches) || left.title.localeCompare(right.title);
  });
  const reason = recentActivity
    ? `Matches your ${goalFocus} goal and recent ${recentActivity.type} activity.`
    : `Matches your ${goalFocus} fitness goal.`;
  return sortedWorkouts.map((workout) => ({ ...workout, reason }));
}

export { User };
