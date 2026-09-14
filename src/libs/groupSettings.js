// In-memory per-group settings & toggles.
// ponytail: in-memory state; upgrade path: write to JSON/SQLite if persistent restarts are needed.
const groupToggles = new Map();
const groupVotes = new Map();

export function isGroupFeatureEnabled(jid, feature) {
  const group = groupToggles.get(jid);
  return group ? !!group.get(feature) : false;
}

export function setGroupFeature(jid, feature, enabled) {
  if (!groupToggles.has(jid)) {
    groupToggles.set(jid, new Map());
  }
  groupToggles.get(jid).set(feature, enabled);
}

export const isWelcomeEnabled = (jid) => isGroupFeatureEnabled(jid, 'welcome');
export const enableWelcome    = (jid) => setGroupFeature(jid, 'welcome', true);
export const disableWelcome   = (jid) => setGroupFeature(jid, 'welcome', false);

export function getGroupVote(jid) {
  return groupVotes.get(jid);
}

export function setGroupVote(jid, voteObj) {
  if (!voteObj) groupVotes.delete(jid);
  else groupVotes.set(jid, voteObj);
}

