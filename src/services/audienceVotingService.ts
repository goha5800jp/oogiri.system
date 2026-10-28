import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AudienceVoter } from '../types/ogiri';

export interface VotingSessionData {
  isQrVisible: boolean;
  isVotingActive: boolean;
  maxVotesPerPerson: number;
  allowMultipleVotesPerParticipant: boolean;
  topicText?: string;
  activeParticipants: Array<{
    id: number;
    name: string;
    teamName?: string;
    avatarUrl?: string;
  }>;
  updatedAt: string;
}

const AUDIENCE_BC_CHANNEL = 'flip_ogiri_audience_broadcast_channel';

// Cross-tab broadcast channel for local testing fallback
let audienceChannel: BroadcastChannel | null = null;
try {
  audienceChannel = new BroadcastChannel(AUDIENCE_BC_CHANNEL);
} catch {
  // BroadcastChannel not available in environment
}

/**
 * Host/Console: Updates current voting session configuration in Firestore
 */
export async function updateVotingSession(
  sessionData: Partial<VotingSessionData>,
  sessionId = 'current'
): Promise<void> {
  const payload = {
    ...sessionData,
    updatedAt: new Date().toISOString(),
  };

  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
    await setDoc(sessionDocRef, payload, { merge: true });
  } catch (err) {
    console.warn('Firestore updateVotingSession fallback:', err);
  }

  // Also broadcast locally
  audienceChannel?.postMessage({
    type: 'SESSION_UPDATE',
    payload,
  });
}

/**
 * Client/Smartphone: Subscribe to current voting session changes
 */
export function subscribeToVotingSession(
  onUpdate: (session: VotingSessionData | null) => void,
  sessionId = 'current'
): () => void {
  let unsubFirestore: (() => void) | null = null;

  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
    unsubFirestore = onSnapshot(
      sessionDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as VotingSessionData);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.warn('Firestore subscribeToVotingSession warning:', err);
      }
    );
  } catch (err) {
    console.warn('Firestore snapshot setup failed:', err);
  }

  // Local BroadcastChannel listener
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SESSION_UPDATE') {
      onUpdate(event.data.payload as VotingSessionData);
    }
  };
  audienceChannel?.addEventListener('message', handleBcMessage);

  return () => {
    if (unsubFirestore) unsubFirestore();
    audienceChannel?.removeEventListener('message', handleBcMessage);
  };
}

/**
 * Smartphone: Register audience voter nickname
 */
export async function registerVoter(
  voterId: string,
  nickname: string,
  sessionId = 'current'
): Promise<void> {
  const voterData = {
    id: voterId,
    nickname,
    joinedAt: Date.now(),
    isReady: true,
  };

  try {
    const voterDocRef = doc(db, 'sessions', sessionId, 'voters', voterId);
    await setDoc(voterDocRef, voterData, { merge: true });
  } catch (err) {
    console.warn('Firestore registerVoter warning:', err);
  }

  audienceChannel?.postMessage({
    type: 'VOTER_REGISTERED',
    payload: voterData,
  });
}

/**
 * Smartphone: Submit cast votes for participants
 */
export async function submitVotes(
  voterId: string,
  nickname: string,
  votesByParticipant: Record<number, number>,
  sessionId = 'current'
): Promise<void> {
  try {
    const batch = writeBatch(db);

    for (const [pIdStr, votes] of Object.entries(votesByParticipant)) {
      if (votes <= 0) continue;
      const participantId = parseInt(pIdStr, 10);
      const voteDocRef = doc(
        db,
        'sessions',
        sessionId,
        'votes',
        `${voterId}_${participantId}`
      );
      batch.set(voteDocRef, {
        voterId,
        nickname,
        participantId,
        votes,
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
      });
    }

    const voterDocRef = doc(db, 'sessions', sessionId, 'voters', voterId);
    batch.set(
      voterDocRef,
      {
        hasVoted: true,
      },
      { merge: true }
    );

    await batch.commit();
  } catch (err) {
    console.warn('Firestore submitVotes fallback:', err);
  }

  audienceChannel?.postMessage({
    type: 'VOTES_SUBMITTED',
    payload: { voterId, nickname, votesByParticipant },
  });
}

/**
 * Host/Console: Subscribes to registered voters list and aggregated votes
 */
export function subscribeToVotersAndVotes(
  onData: (data: { voters: AudienceVoter[]; votes: Record<number, number> }) => void,
  sessionId = 'current'
): () => void {
  let votersCache: AudienceVoter[] = [];
  let votesCache: Record<number, number> = {};

  const notify = () => {
    onData({ voters: [...votersCache], votes: { ...votesCache } });
  };

  let unsubVoters: (() => void) | null = null;
  let unsubVotes: (() => void) | null = null;

  try {
    const votersCol = collection(db, 'sessions', sessionId, 'voters');
    unsubVoters = onSnapshot(
      votersCol,
      (snapshot) => {
        votersCache = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: d.id || docSnap.id,
            nickname: d.nickname || '匿名',
            joinedAt: d.joinedAt || Date.now(),
            hasVoted: !!d.hasVoted,
          };
        });
        notify();
      },
      (err) => {
        console.warn('Firestore voters subscribe warning:', err);
      }
    );

    const votesCol = collection(db, 'sessions', sessionId, 'votes');
    unsubVotes = onSnapshot(
      votesCol,
      (snapshot) => {
        const aggregated: Record<number, number> = {};
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const pId = Number(d.participantId);
          const count = Number(d.votes) || 1;
          aggregated[pId] = (aggregated[pId] || 0) + count;
        });
        votesCache = aggregated;
        notify();
      },
      (err) => {
        console.warn('Firestore votes subscribe warning:', err);
      }
    );
  } catch (err) {
    console.warn('Firestore subscribeToVotersAndVotes setup failed:', err);
  }

  const handleBcMessage = (event: MessageEvent) => {
    const { type, payload } = event.data || {};
    if (type === 'VOTER_REGISTERED' && payload) {
      if (!votersCache.some((v) => v.id === payload.id)) {
        votersCache = [...votersCache, payload];
        notify();
      }
    } else if (type === 'VOTES_SUBMITTED' && payload) {
      const { votesByParticipant } = payload;
      for (const [pIdStr, count] of Object.entries(votesByParticipant || {})) {
        const pId = parseInt(pIdStr, 10);
        votesCache[pId] = (votesCache[pId] || 0) + Number(count);
      }
      notify();
    }
  };

  audienceChannel?.addEventListener('message', handleBcMessage);

  return () => {
    if (unsubVoters) unsubVoters();
    if (unsubVotes) unsubVotes();
    audienceChannel?.removeEventListener('message', handleBcMessage);
  };
}

/**
 * Host/Console: Reset all votes and voters for a new round
 */
export async function resetVotingData(sessionId = 'current'): Promise<void> {
  try {
    const votersCol = collection(db, 'sessions', sessionId, 'voters');
    const votesCol = collection(db, 'sessions', sessionId, 'votes');

    const [voterSnaps, voteSnaps] = await Promise.all([
      getDocs(votersCol),
      getDocs(votesCol),
    ]);

    const batch = writeBatch(db);
    voterSnaps.docs.forEach((d) => batch.delete(d.ref));
    voteSnaps.docs.forEach((d) => batch.delete(d.ref));

    const sessionDocRef = doc(db, 'sessions', sessionId);
    batch.set(
      sessionDocRef,
      {
        isVotingActive: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await batch.commit();
  } catch (err) {
    console.warn('resetVotingData error:', err);
  }

  audienceChannel?.postMessage({
    type: 'VOTING_RESET',
  });
}
