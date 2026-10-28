export interface Topic {
  id: number;
  text: string;
  imageUrl?: string;
  isUsed?: boolean;
}

export interface Participant {
  id: number;
  name: string;
  avatarUrl?: string;
  isParticipating: boolean;
  score: number;
  teamName?: string;
}

export interface TimerState {
  isEnabled: boolean;
  totalMinutes: number;
  totalSeconds: number;
  alertMinutes: number;
  alertSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  lastUpdatedAt?: number;
  targetEndTime?: number; // Target timestamp in ms when running
}

export type ColorPalette =
  | 'yellow'
  | 'white'
  | 'gray'
  | 'blue'
  | 'pink'
  | 'green'
  | 'black';

export interface TitleItem {
  id: number;
  text: string;
}

export interface AnswerLogEntry {
  id: number; // 1, 2, 3...
  respondentName: string; // 回答者名
  answerText: string; // 回答テキスト
}

export interface GameParticipantLog {
  id: number;
  name: string;
  teamName?: string;
  score: number;
  rank?: number; // 順位 (結果発表実施時の記録用: 1, 2, 3...)
}

export interface GameLogItem {
  id: number; // 1, 2, 3...
  timestamp: string;
  titleText?: string; // タイトル（表示時のみ保存）
  topicNumber: number;
  topicText: string;
  isScoringMode: boolean;
  isWhaleMode: boolean;
  totalScore?: number;
  participants: GameParticipantLog[];
  answerLogs?: AnswerLogEntry[]; // その時点での回答ログ
  colorPalette?: ColorPalette;
}

export interface ResultAnnouncementState {
  isActive: boolean;
  startedAt: number; // Date.now() timestamp
  isCompleted?: boolean;
}

export type TopicFontFamily =
  | 'gothic' // ゴシック (サンセリフ)
  | 'mincho' // 明朝 (セリフ)
  | 'round' // 丸ゴシック
  | 'handwriting' // 手書き風
  | 'display'; // 極太・デザイン

export interface TopicFontOption {
  id: TopicFontFamily;
  label: string;
  category: string;
  fontFamily: string;
}

export interface PresetCustomTimer {
  totalMinutes: number;
  totalSeconds: number;
  alertMinutes: number;
  alertSeconds: number;
}

export interface PresetItem {
  id: string; // unique ID
  isTitleEnabled: boolean; // default: false
  selectedTitleNumber?: number; // 1..20
  isTopicEnabled: boolean; // default: false
  selectedTopicNumber?: number; // 1..N
  isParticipantsEnabled: boolean; // default: false
  activeParticipantIds?: number[]; // list of active contestant IDs (max 14, default: [])
  isCustomTimerEnabled: boolean; // default: false (独自の時間を設定する)
  customTimer?: PresetCustomTimer;
}

export interface OgiriState {
  topics: Topic[];
  selectedTopicNumber: number;
  isTopicVisible: boolean;
  topicFontSizeOffset?: number; // Manual monitor topic font size adjustment (-5..+6, default 0)
  topicFontFamily?: TopicFontFamily; // Selected topic font family ('gothic'|'mincho'|'round'|'handwriting'|'display', default: 'gothic')
  isTopicBold?: boolean; // Topic font weight bold ON/OFF (default: true)
  selectedTitleNumber?: number; // 1..20, default 1
  isTitleVisible?: boolean; // default false (タイトルを表示する)
  participants: Participant[];
  isParticipantsVisible: boolean;
  activeParticipantOrder: number[]; // Array of participant IDs ordered
  timer: TimerState;
  scoreButtons: string[]; // e.g. ['+1', '+2', '+3', '-1']
  isScoreHiddenOnMonitor?: boolean; // When true, scores on monitor display as ???
  isWhaleMode?: boolean; // When true, display total sum of all participants' scores
  colorPalette?: ColorPalette; // Background palette selection (default: 'yellow')
  activeAnsweringParticipantId?: number | null; // ID of participant currently answering (max 1 person)
  isScoringModeEnabled?: boolean; // When true, scoring features are active (default: true). When false, hides score buttons, current score, and whale mode.
  titles?: TitleItem[]; // 1..20 titles in Subconsole Prep
  gameLogs?: GameLogItem[]; // Recorded match logs
  answerLogs?: AnswerLogEntry[]; // 1..N answer logs in control panel
  resultAnnouncement?: ResultAnnouncementState; // 結果発表進行状態
  presets?: PresetItem[]; // サブコンソール２：プリセット
  selectedPresetId?: string | null; // 選択中のプリセットID
  isPresetModeEnabled?: boolean; // メインコンソール「プリセットを使用する」ON/OFF
  audienceVoting?: AudienceVotingConfig; // 観覧者投票システム設定
  audienceVotes?: Record<number, number>; // 各参加者の得票数 { [participantId]: votes }
  audienceVoters?: AudienceVoter[]; // 待機中/投票済みの観覧者リスト
  version?: number;
}

export interface AudienceVotingConfig {
  isQrVisible: boolean; // モニターにQRコードを表示
  isVotingActive: boolean; // 投票受付中 (true: 受付中, false: 締切/待機中)
  maxVotesPerPerson: number; // 1人あたりの投票可能票数 (default: 1)
  allowMultipleVotesPerParticipant: boolean; // 同じ人への複数投票許可 (default: false)
  sessionCode?: string; // セッションID
}

export interface AudienceVoter {
  id: string;
  nickname: string;
  joinedAt: number;
  hasVoted?: boolean;
}

export interface AudienceVoteRecord {
  voterId: string;
  nickname: string;
  participantId: number;
  votes: number;
  timestamp: number;
}

export const STORAGE_KEY = 'flip_ogiri_app_state_v2';
export const CHANNEL_NAME = 'flip_ogiri_sync_channel';

