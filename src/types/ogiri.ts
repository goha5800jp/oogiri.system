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

export type BgPattern = 'none' | 'grid' | 'dots';

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

export interface TeamItem {
  id: number;
  name: string;
}

export interface OgiriState {
  topics: Topic[];
  selectedTopicNumber: number;
  isTopicVisible: boolean;
  topicFontSizeOffset?: number; // Manual monitor topic font size adjustment (-5..+6, default 0)
  topicFontFamily?: TopicFontFamily; // Selected topic font family ('gothic'|'mincho'|'round'|'handwriting'|'display', default: 'gothic')
  isTopicBold?: boolean; // Topic font weight bold ON/OFF (default: true)
  isTopicOutline?: boolean; // お題フォントの縁取り文字 ON/OFF (default: false)
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
  isImpressionModeEnabled?: boolean; // 印象モード (default: false)
  isTeamModeEnabled?: boolean; // タッグ・チーム戦を行う (default: false)
  teams?: TeamItem[]; // 1..4 teams
  customBgUrl?: string; // 背景画像 DataURL
  bgScale?: number; // 20..300, default 100
  bgOpacity?: number; // 0..100, default 100
  bgBrightness?: number; // 20..200, default 100
  bgPattern?: BgPattern; // 背景の模様: 'none' (模様なし) | 'grid' (格子) | 'dots' (ドット)
  bgPatternScale?: number; // 模様サイズ倍率 (50..200%, default 100)
  bgPatternSpeed?: number; // 模様アニメーション速度 (20..300%, default 100)
  bgPatternOpacity?: number; // 模様の色の濃さ (10..100%, default 60)
  bgPatternCount?: number; // 模様の出現する数 (20..200%, default 100)
  titles?: TitleItem[]; // 1..20 titles in Subconsole Prep
  gameLogs?: GameLogItem[]; // Recorded match logs
  answerLogs?: AnswerLogEntry[]; // 1..N answer logs in control panel
  resultAnnouncement?: ResultAnnouncementState; // 結果発表進行状態
  presets?: PresetItem[]; // サブコンソール２：プリセット
  selectedPresetId?: string | null; // 選択中のプリセットID
  isPresetModeEnabled?: boolean; // メインコンソール「プリセットを使用する」ON/OFF
  audienceVoting?: AudienceVotingConfig; // 観覧者投票システム設定
  isVotingFeatureEnabled?: boolean; // 印象モード内の「投票機能」ON/OFF（デフォルト: true。OFF時は手動/挙手入力）
  isGayaModeEnabled?: boolean; // ガヤモード ON/OFF (default: false)
  audienceVotes?: Record<number, number>; // 各参加者の得票数 { [participantId]: votes }
  audienceVoters?: AudienceVoter[]; // 待機中/投票済みの観覧者リスト
  version?: number;
}

export interface GayaSubmission {
  id: string;
  voterId?: string;
  nickname: string;
  text: string;
  createdAt: number;
  approved?: boolean;
}

export interface GayaStreamEvent {
  id: string;
  text: string;
  isTengu?: boolean;
  createdAt: number;
  nickname?: string;
}

export interface AudienceVotingConfig {
  isQrVisible: boolean; // モニターにQRコードを表示
  isVotingActive: boolean; // 投票受付中 (true: 受付中, false: 締切/待機中)
  maxVotesPerPerson: number; // 1人あたりの投票可能票数 (default: 1)
  customVotesPerPerson?: number | null; // 任意の整数入力値（1,2,3以外の任意指定用）
  allowMultipleVotesPerParticipant: boolean; // 同じ人への複数投票許可 (default: false)
  maxDuplicateVotesPerParticipant?: number; // 1人あたり最大何票までの重複を認めるか (default: 1)
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

