import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTopicLines,
  getTopicFontSize,
  reorderList,
  reorderTopics,
  removeTopicAt,
  reorderParticipants,
  calculateTotalScore,
  getActiveOrderedParticipants,
  createDefaultOgiriState,
  validateTimerInput,
  formatTimeMMSS,
  validateScoreButtonInput,
  applyScoreOperation,
  exportTopicsToText,
  parseTopicsFromText,
  exportParticipantsToText,
  parseParticipantsFromText,
  parseParticipantName,
  getPaletteTheme,
  PALETTE_CONFIGS,
  getParticipantNameFontSize,
  canActivateParticipant,
  MAX_ACTIVE_PARTICIPANTS,
  exportFullStateToJson,
  parseFullStateFromJson,
  resetAllToDefault,
  resetExceptTopicsAndParticipants,
  toCircledNumber,
} from './ogiriLogic';
import { Participant, Topic } from '../types/ogiri';

test('parseTopicLines correctly splits on (k) and (K)', () => {
  const input = 'こんな学校のチャイムは嫌だ。(k)どんなチャイム？';
  const lines = parseTopicLines(input);
  assert.deepEqual(lines, ['こんな学校のチャイムは嫌だ。', 'どんなチャイム？']);

  const inputMultiple = '行1(k)行2(K)行3';
  assert.deepEqual(parseTopicLines(inputMultiple), ['行1', '行2', '行3']);
});

test('getTopicFontSize scales appropriately according to character length', () => {
  const short = getTopicFontSize(['写真で一言']);
  assert.match(short.fontSizeClass, /text-5xl|text-8xl/);

  const longLines = ['非常に長いお題がここに入ります。12345678901234567890', 'さらに2行目も長くて詳細な指示が書かれています。'];
  const longResult = getTopicFontSize(longLines);
  assert.match(longResult.fontSizeClass, /text-2xl|text-3xl|text-4xl/);
});

test('reorderList correctly moves an item from startIndex to endIndex', () => {
  const initial = [1, 2, 3, 4];
  const reordered = reorderList(initial, 0, 2);
  assert.deepEqual(reordered, [2, 3, 1, 4]);
});

test('reorderTopics correctly renumbers items 1..N and moves topic to target position', () => {
  const initialTopics: Topic[] = [
    { id: 1, text: 'お題1', isUsed: false },
    { id: 2, text: 'お題2', isUsed: false },
    { id: 3, text: 'お題3', isUsed: false },
    { id: 4, text: 'お題4', isUsed: false },
  ];

  // Move topic 3 (index 2, text: 'お題3') down to index 3
  const result = reorderTopics(initialTopics, 2, 3);
  assert.equal(result.length, 4);
  assert.deepEqual(
    result.map((t) => ({ id: t.id, text: t.text })),
    [
      { id: 1, text: 'お題1' },
      { id: 2, text: 'お題2' },
      { id: 3, text: 'お題4' },
      { id: 4, text: 'お題3' },
    ]
  );
  // Topic at position 3 took id 3 ('お題4') and moved topic took id 4 ('お題3')
});

test('removeTopicAt removes item at given 1-based index and renumbers remaining 1..N', () => {
  const topics: Topic[] = [
    { id: 1, text: 'お題1', isUsed: true },
    { id: 2, text: 'お題2', imageUrl: 'data:img', isUsed: false },
    { id: 3, text: 'お題3', isUsed: false },
    { id: 4, text: 'お題4', isUsed: false },
  ];

  const result = removeTopicAt(topics, 2);
  assert.equal(result.length, 3);
  assert.deepEqual(result, [
    { id: 1, text: 'お題1', isUsed: true },
    { id: 2, text: 'お題3', isUsed: false },
    { id: 3, text: 'お題4', isUsed: false },
  ]);
});

test('reorderParticipants reorders participants and sequentially reassigns IDs', () => {
  const participants: Participant[] = [
    { id: 1, name: 'A', isParticipating: true, score: 10 },
    { id: 2, name: 'B', isParticipating: true, score: 5 },
    { id: 3, name: 'C', isParticipating: false, score: 0 },
  ];

  const result = reorderParticipants(participants, 2, 0);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'C');
  assert.equal(result[0].id, 1);
  assert.equal(result[1].name, 'A');
  assert.equal(result[1].id, 2);
  assert.equal(result[2].name, 'B');
  assert.equal(result[2].id, 3);
});

test('calculateTotalScore sums scores of participating participants with names', () => {
  const participants: Participant[] = [
    { id: 1, name: 'Alice', isParticipating: true, score: 5 },
    { id: 2, name: 'Bob', isParticipating: true, score: 12 },
    { id: 3, name: 'Charlie', isParticipating: false, score: 20 }, // inactive, excluded
    { id: 4, name: '   ', isParticipating: true, score: 8 }, // empty name, excluded
  ];

  assert.equal(calculateTotalScore(participants), 17);
});

test('getActiveOrderedParticipants filters inactive/empty and orders strictly by orderIds', () => {
  const participants: Participant[] = [
    { id: 1, name: 'Alice', isParticipating: true, score: 0 },
    { id: 2, name: 'Bob', isParticipating: false, score: 0 },
    { id: 3, name: '   ', isParticipating: true, score: 0 },
    { id: 4, name: 'Charlie', isParticipating: true, score: 0 },
    { id: 5, name: 'David', isParticipating: true, score: 0 },
  ];

  const result = getActiveOrderedParticipants(participants, [4, 1, 5]);
  assert.equal(result.length, 3);
  assert.equal(result[0].id, 4);
  assert.equal(result[1].id, 1);
  assert.equal(result[2].id, 5);
});

test('validateTimerInput rejects alert time greater than total time and out of bound seconds', () => {
  // Valid case: 3m0s total, 0m30s alert
  const valid = validateTimerInput(3, 0, 0, 30);
  assert.equal(valid.valid, true);

  // Invalid: alert time greater than total time
  const alertTooLong = validateTimerInput(2, 0, 2, 30);
  assert.equal(alertTooLong.valid, false);
  assert.match(alertTooLong.error || '', /色変更時間/);

  // Invalid: total 0m 0s
  const zeroTotal = validateTimerInput(0, 0, 0, 0);
  assert.equal(zeroTotal.valid, false);
  assert.match(zeroTotal.error || '', /最小で0分1秒以上/);

  // Invalid: seconds > 59
  const invalidSec = validateTimerInput(1, 60, 0, 30);
  assert.equal(invalidSec.valid, false);
});

test('formatTimeMMSS formats correctly', () => {
  assert.equal(formatTimeMMSS(180), '03:00');
  assert.equal(formatTimeMMSS(65), '01:05');
  assert.equal(formatTimeMMSS(9), '00:09');
  assert.equal(formatTimeMMSS(0), '00:00');
});

test('validateScoreButtonInput strictly allows operators +, -, *, /, ×, ÷ and digits', () => {
  assert.equal(validateScoreButtonInput('+1').valid, true);
  assert.equal(validateScoreButtonInput('+10').valid, true);
  assert.equal(validateScoreButtonInput('-2').valid, true);
  assert.equal(validateScoreButtonInput('*2').valid, true);
  assert.equal(validateScoreButtonInput('×2').valid, true);
  assert.equal(validateScoreButtonInput('/2').valid, true);
  assert.equal(validateScoreButtonInput('÷2').valid, true);
  assert.equal(validateScoreButtonInput('5').valid, true);

  // Illegal characters
  assert.equal(validateScoreButtonInput('+1pt').valid, false);
  assert.equal(validateScoreButtonInput('abc').valid, false);
  assert.equal(validateScoreButtonInput('+1+2').valid, false);
  assert.equal(validateScoreButtonInput('').valid, false);
});

test('applyScoreOperation calculates points accurately', () => {
  assert.equal(applyScoreOperation(5, '+2'), 7);
  assert.equal(applyScoreOperation(5, '-1'), 4);
  assert.equal(applyScoreOperation(5, '*3'), 15);
  assert.equal(applyScoreOperation(5, '×2'), 10);
  assert.equal(applyScoreOperation(10, '/2'), 5);
  assert.equal(applyScoreOperation(10, '÷3'), 3);
  assert.equal(applyScoreOperation(5, '10'), 15);
});

test('exportTopicsToText and parseTopicsFromText round-trip properly with image and isUsed', () => {
  const topics: Topic[] = [
    { id: 1, text: 'お題1', isUsed: true },
    { id: 2, text: 'お題2(k)改行あり', imageUrl: 'data:image/png;base64,photoSample', isUsed: false },
  ];
  const exported = exportTopicsToText(topics);
  const parsed = parseTopicsFromText(exported);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].text, 'お題1');
  assert.equal(parsed[0].isUsed, true);
  assert.equal(parsed[1].text, 'お題2(k)改行あり');
  assert.equal(parsed[1].imageUrl, 'data:image/png;base64,photoSample');
  assert.equal(parsed[1].isUsed, false);
});

test('exportParticipantsToText and parseParticipantsFromText round-trip properly', () => {
  const participants: Participant[] = [
    { id: 1, name: '回答者A', isParticipating: true, score: 3, avatarUrl: 'data:image/png;base64,sample' },
    { id: 2, name: '回答者B', isParticipating: false, score: 0 },
  ];
  const exported = exportParticipantsToText(participants);
  const parsed = parseParticipantsFromText(exported);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, '回答者A');
  assert.equal(parsed[0].avatarUrl, 'data:image/png;base64,sample');
  assert.equal(parsed[0].score, 3);
});

test('parseParticipantName handles single line, (k), (K), and multi-breaks up to 2 lines', () => {
  // Single line without break
  const res1 = parseParticipantName('回答者 1');
  assert.equal(res1.hasBreak, false);
  assert.deepEqual(res1.lines, ['回答者 1']);

  // Line with (k)
  const res2 = parseParticipantName('チビタダン(k)サブロー');
  assert.equal(res2.hasBreak, true);
  assert.deepEqual(res2.lines, ['チビタダン', 'サブロー']);

  // Line with (K)
  const res3 = parseParticipantName('チビタダン(K)サブロー');
  assert.equal(res3.hasBreak, true);
  assert.deepEqual(res3.lines, ['チビタダン', 'サブロー']);

  // Multi-breaks joins remainder into line 2
  const res4 = parseParticipantName('チビタダン(k)サブロー(k)三世');
  assert.equal(res4.hasBreak, true);
  assert.deepEqual(res4.lines, ['チビタダン', 'サブロー 三世']);

  // Empty string
  const res5 = parseParticipantName('');
  assert.equal(res5.hasBreak, false);
  assert.deepEqual(res5.lines, []);
});

test('getPaletteTheme returns correct properties for light and dark palettes', () => {
  // Default yellow
  const yellowTheme = getPaletteTheme('yellow');
  assert.equal(yellowTheme.isDark, false);
  assert.equal(yellowTheme.bgHex, '#FEF9C3');
  assert.equal(yellowTheme.textColorClass, 'text-neutral-950');

  // Black dark mode
  const blackTheme = getPaletteTheme('black');
  assert.equal(blackTheme.isDark, true);
  assert.equal(blackTheme.bgHex, '#121212');
  assert.equal(blackTheme.textColorClass, 'text-white');

  // Other light colors
  assert.equal(getPaletteTheme('white').bgHex, '#FFFFFF');
  assert.equal(getPaletteTheme('gray').bgHex, '#F3F4F6');
  assert.equal(getPaletteTheme('blue').bgHex, '#E0F2FE');
  assert.equal(getPaletteTheme('pink').bgHex, '#FCE7F3');
  assert.equal(getPaletteTheme('green').bgHex, '#DCFCE7');

  assert.equal(PALETTE_CONFIGS.length, 7);
});

test('getParticipantNameFontSize scales dynamically based on character count and mode', () => {
  // 1-row normal mode (<= 7 participants)
  const shortNormal = getParticipantNameFontSize(['山田']);
  assert.match(shortNormal, /text-xl|text-2xl|text-3xl/);

  const longNormal = getParticipantNameFontSize(['スーパーカリフラジリスティック']);
  assert.match(longNormal, /text-xs|text-sm|text-base/);

  // 2-row compact mode (>= 8 participants)
  const shortCompact = getParticipantNameFontSize(['山田'], true);
  assert.match(shortCompact, /text-sm|text-base|text-lg/);

  const longCompact = getParticipantNameFontSize(['スーパーカリフラジリスティック'], true);
  assert.match(longCompact, /text-\[10px\]|text-\[11px\]|text-xs/);
});

test('canActivateParticipant correctly enforces 14-person maximum', () => {
  assert.equal(MAX_ACTIVE_PARTICIPANTS, 14);
  assert.equal(canActivateParticipant(0), true);
  assert.equal(canActivateParticipant(13), true);
  assert.equal(canActivateParticipant(14), false);
  assert.equal(canActivateParticipant(15), false);
});

test('exportFullStateToJson and parseFullStateFromJson round-trip complete state', () => {
  const initial = createDefaultOgiriState();
  initial.participants[0].name = 'テスト回答者';
  initial.participants[0].teamName = '赤組';
  initial.participants[0].score = 42;
  initial.colorPalette = 'blue';

  const jsonStr = exportFullStateToJson(initial);
  const result = parseFullStateFromJson(jsonStr);

  assert.equal(result.success, true);
  assert.ok(result.state);
  assert.equal(result.state.participants[0].name, 'テスト回答者');
  assert.equal(result.state.participants[0].teamName, '赤組');
  assert.equal(result.state.participants[0].score, 42);
  assert.equal(result.state.colorPalette, 'blue');
});

test('toCircledNumber converts 1..20 correctly to circled numbers', () => {
  assert.equal(toCircledNumber(1), '①');
  assert.equal(toCircledNumber(2), '②');
  assert.equal(toCircledNumber(10), '⑩');
  assert.equal(toCircledNumber(20), '⑳');
  assert.equal(toCircledNumber(21), '(21)');
});

test('resetAllToDefault returns full fresh default state', () => {
  const def = resetAllToDefault();
  assert.equal(def.topics.length, 10);
  assert.equal(def.participants.length, 20);
  assert.equal(def.colorPalette, 'yellow');
  assert.equal(def.isScoringModeEnabled, true);
  assert.equal(def.activeAnsweringParticipantId, null);
  assert.equal(def.titles?.length, 20);
  assert.deepEqual(def.gameLogs, []);
});

test('resetExceptTopicsAndParticipants preserves topics, participants names/teams, titles, and resets scores and controls', () => {
  const current = createDefaultOgiriState();
  current.topics[0].text = 'カスタムお題';
  current.participants[0].name = '鈴木';
  current.participants[0].teamName = 'チームA';
  current.participants[0].score = 15;
  current.colorPalette = 'pink';
  current.selectedTopicNumber = 5;
  current.isScoringModeEnabled = false;
  current.activeAnsweringParticipantId = 1;
  current.titles = [{ id: 1, text: '第1回戦' }];

  const res = resetExceptTopicsAndParticipants(current);

  // Topics and participant identities are preserved
  assert.equal(res.topics[0].text, 'カスタムお題');
  assert.equal(res.participants[0].name, '鈴木');
  assert.equal(res.participants[0].teamName, 'チームA');
  assert.equal(res.titles?.[0]?.text, '第1回戦');

  // Scores are reset to 0
  assert.equal(res.participants[0].score, 0);

  // Control and display states are reset to default
  assert.equal(res.colorPalette, 'yellow');
  assert.equal(res.selectedTopicNumber, 1);
  assert.equal(res.isScoringModeEnabled, true);
  assert.equal(res.activeAnsweringParticipantId, null);
});

