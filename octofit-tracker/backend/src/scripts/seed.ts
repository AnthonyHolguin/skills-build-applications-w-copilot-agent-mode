import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Activity, Team, User, Workout } from '../models/index.js';

const DEMO_TEAMS = {
  octocats: { name: 'Octocats', mascot: 'Mona' },
  robocats: { name: 'Robocats', mascot: 'Hubot' },
} as const;

const DEMO_USERS = {
  mona: { name: 'Mona', email: 'mona@example.com', fitnessGoal: 'endurance' },
  hubot: { name: 'Hubot', email: 'hubot@example.com', fitnessGoal: 'strength' },
} as const;

const DEMO_WORKOUTS = {
  intervals: { title: 'Intervals', focus: 'endurance', minutes: 30, difficulty: 'moderate' },
  strength: { title: 'Strength Circuit', focus: 'strength', minutes: 30, difficulty: 'moderate' },
} as const;

// Seed stable demo records without clearing data owned by the application.
async function upsertDemoUser(name: string, email: string, teamId: InstanceType<typeof Team>['_id'], fitnessGoal: string) {
  const previousUser = await User.findOne({ email }).select('_id team');
  if (previousUser?.team && previousUser.team.toString() !== teamId.toString()) {
    await Team.updateOne({ _id: previousUser.team }, { $pull: { members: previousUser._id } });
  }
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name, email, team: teamId, fitnessGoal } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Team.updateOne({ _id: teamId }, { $addToSet: { members: user._id } });
  return user;
}

export async function seed() {
  await connectDatabase();
  try {
    const octocats = await Team.findOneAndUpdate(
      { name: DEMO_TEAMS.octocats.name },
      { $set: DEMO_TEAMS.octocats },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const robocats = await Team.findOneAndUpdate(
      { name: DEMO_TEAMS.robocats.name },
      { $set: DEMO_TEAMS.robocats },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const mona = await upsertDemoUser(DEMO_USERS.mona.name, DEMO_USERS.mona.email, octocats._id, DEMO_USERS.mona.fitnessGoal);
    const hubot = await upsertDemoUser(DEMO_USERS.hubot.name, DEMO_USERS.hubot.email, robocats._id, DEMO_USERS.hubot.fitnessGoal);

    const monaRunAt = new Date('2026-01-10T12:00:00.000Z');
    const hubotCycleAt = new Date('2026-01-11T12:00:00.000Z');
    await Activity.updateOne(
      { user: mona._id, team: octocats._id, type: 'run', occurredAt: monaRunAt },
      { $set: { user: mona._id, team: octocats._id, type: 'run', minutes: 40, points: 40, occurredAt: monaRunAt } },
      { upsert: true },
    );
    await Activity.updateOne(
      { user: hubot._id, team: robocats._id, type: 'cycle', occurredAt: hubotCycleAt },
      { $set: { user: hubot._id, team: robocats._id, type: 'cycle', minutes: 25, points: 25, occurredAt: hubotCycleAt } },
      { upsert: true },
    );
    await Workout.updateOne(
      { title: DEMO_WORKOUTS.intervals.title },
      { $set: DEMO_WORKOUTS.intervals },
      { upsert: true },
    );
    await Workout.updateOne(
      { title: DEMO_WORKOUTS.strength.title },
      { $set: DEMO_WORKOUTS.strength },
      { upsert: true },
    );
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  await seed();
}
