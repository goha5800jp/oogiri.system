import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GayaSubmission, GayaStreamEvent } from '../types/ogiri';

const GAYA_BC_CHANNEL = 'flip_ogiri_gaya_broadcast_channel';

let gayaChannel: BroadcastChannel | null = null;
try {
  gayaChannel = new BroadcastChannel(GAYA_BC_CHANNEL);
} catch {
  // BroadcastChannel not available in environment
}

/**
 * Audience/Mobile: Submit a custom text comment for moderator approval.
 */
export async function submitGayaComment(
  nickname: string,
  text: string,
  voterId?: string,
  sessionId = 'current'
): Promise<void> {
  const cleanNick = (nickname || '匿名').trim().slice(0, 50);
  const cleanText = (text || '').trim().slice(0, 200);
  if (!cleanText) return;

  const id = `gaya_sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const submission: GayaSubmission = {
    id,
    voterId: voterId || '',
    nickname: cleanNick,
    text: cleanText,
    createdAt: Date.now(),
    approved: false,
  };

  try {
    const docRef = doc(db, 'sessions', sessionId, 'gaya_submissions', id);
    await setDoc(docRef, submission);
  } catch (err) {
    console.warn('Firestore submitGayaComment error:', err);
  }

  // Also broadcast locally across tabs
  gayaChannel?.postMessage({
    type: 'GAYA_SUBMISSION_NEW',
    payload: submission,
  });
}

/**
 * Audience/Mobile: Send instant preset reaction (e.g. "ｗｗｗ", "88888", "👺").
 * Immediately streams on monitor without requiring approval.
 */
export async function sendInstantReaction(
  reactionText: string,
  isTengu = false,
  sessionId = 'current'
): Promise<void> {
  const id = `gaya_ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const event: GayaStreamEvent = {
    id,
    text: reactionText,
    isTengu,
    createdAt: Date.now(),
  };

  try {
    const docRef = doc(db, 'sessions', sessionId, 'gaya_stream', id);
    await setDoc(docRef, event);
  } catch (err) {
    console.warn('Firestore sendInstantReaction error:', err);
  }

  // Local broadcast
  gayaChannel?.postMessage({
    type: 'GAYA_STREAM_EVENT',
    payload: event,
  });
}

/**
 * Console/Host: Approve a pending audience submission to stream on the monitor.
 */
export async function approveGayaComment(
  submission: GayaSubmission,
  sessionId = 'current'
): Promise<void> {
  const eventId = `gaya_ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const streamEvent: GayaStreamEvent = {
    id: eventId,
    text: submission.text,
    isTengu: false,
    createdAt: Date.now(),
    nickname: submission.nickname,
  };

  try {
    // 1. Mark submission approved
    const subDocRef = doc(db, 'sessions', sessionId, 'gaya_submissions', submission.id);
    await setDoc(subDocRef, { approved: true }, { merge: true });

    // 2. Add to gaya_stream
    const streamDocRef = doc(db, 'sessions', sessionId, 'gaya_stream', eventId);
    await setDoc(streamDocRef, streamEvent);
  } catch (err) {
    console.warn('Firestore approveGayaComment error:', err);
  }

  gayaChannel?.postMessage({
    type: 'GAYA_SUBMISSION_APPROVED',
    payload: { id: submission.id },
  });

  gayaChannel?.postMessage({
    type: 'GAYA_STREAM_EVENT',
    payload: streamEvent,
  });
}

/**
 * Console/Host: Delete a pending or unwanted submission.
 */
export async function deleteGayaSubmission(
  submissionId: string,
  sessionId = 'current'
): Promise<void> {
  try {
    const docRef = doc(db, 'sessions', sessionId, 'gaya_submissions', submissionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteGayaSubmission error:', err);
  }

  gayaChannel?.postMessage({
    type: 'GAYA_SUBMISSION_DELETED',
    payload: { id: submissionId },
  });
}

/**
 * Console/Host: Clear all submissions.
 */
export async function clearAllGayaSubmissions(sessionId = 'current'): Promise<void> {
  try {
    const colRef = collection(db, 'sessions', sessionId, 'gaya_submissions');
    const snaps = await getDocs(colRef);
    const batch = writeBatch(db);
    snaps.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn('Firestore clearAllGayaSubmissions error:', err);
  }

  gayaChannel?.postMessage({
    type: 'GAYA_SUBMISSIONS_CLEARED',
  });
}

/**
 * Console/Host: Subscribe to submitted comments list (max 30, newest first).
 */
export function subscribeToGayaSubmissions(
  onUpdate: (submissions: GayaSubmission[]) => void,
  sessionId = 'current'
): () => void {
  let localCache: GayaSubmission[] = [];

  const notify = () => {
    onUpdate([...localCache]);
  };

  let unsubFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, 'sessions', sessionId, 'gaya_submissions');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(30));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        const items: GayaSubmission[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            voterId: d.voterId || '',
            nickname: d.nickname || '匿名',
            text: d.text || '',
            createdAt: d.createdAt || Date.now(),
            approved: !!d.approved,
          };
        });
        localCache = items;
        notify();
      },
      (err) => {
        console.warn('subscribeToGayaSubmissions warning:', err);
      }
    );
  } catch (err) {
    console.warn('subscribeToGayaSubmissions init error:', err);
  }

  // Cross-tab broadcast listener
  const handleBcMessage = (event: MessageEvent) => {
    const { type, payload } = event.data || {};
    if (type === 'GAYA_SUBMISSION_NEW' && payload) {
      if (!localCache.some((s) => s.id === payload.id)) {
        localCache = [payload, ...localCache].slice(0, 30);
        notify();
      }
    } else if (type === 'GAYA_SUBMISSION_APPROVED' && payload) {
      localCache = localCache.map((s) => (s.id === payload.id ? { ...s, approved: true } : s));
      notify();
    } else if (type === 'GAYA_SUBMISSION_DELETED' && payload) {
      localCache = localCache.filter((s) => s.id !== payload.id);
      notify();
    } else if (type === 'GAYA_SUBMISSIONS_CLEARED') {
      localCache = [];
      notify();
    }
  };

  gayaChannel?.addEventListener('message', handleBcMessage);

  return () => {
    if (unsubFirestore) unsubFirestore();
    gayaChannel?.removeEventListener('message', handleBcMessage);
  };
}

/**
 * Monitor: Subscribe to real-time barrage stream events to fly across the screen.
 */
export function subscribeToGayaStream(
  onEvent: (event: GayaStreamEvent) => void,
  sessionId = 'current'
): () => void {
  const mountTime = Date.now() - 3000;
  const processedEventIds = new Set<string>();

  const trigger = (ev: GayaStreamEvent) => {
    if (processedEventIds.has(ev.id)) return;
    processedEventIds.add(ev.id);
    if (processedEventIds.size > 200) {
      const first = processedEventIds.values().next().value;
      if (first) processedEventIds.delete(first);
    }
    onEvent(ev);
  };

  let unsubFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, 'sessions', sessionId, 'gaya_stream');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(15));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const d = change.doc.data();
            const createdAt = d.createdAt || Date.now();
            if (createdAt >= mountTime) {
              trigger({
                id: change.doc.id,
                text: d.text || '',
                isTengu: !!d.isTengu,
                createdAt,
                nickname: d.nickname,
              });
            }
          }
        });
      },
      (err) => {
        console.warn('subscribeToGayaStream warning:', err);
      }
    );
  } catch (err) {
    console.warn('subscribeToGayaStream init error:', err);
  }

  const handleBcMessage = (event: MessageEvent) => {
    if (event.data?.type === 'GAYA_STREAM_EVENT' && event.data?.payload) {
      trigger(event.data.payload);
    }
  };

  gayaChannel?.addEventListener('message', handleBcMessage);

  return () => {
    if (unsubFirestore) unsubFirestore();
    gayaChannel?.removeEventListener('message', handleBcMessage);
  };
}
