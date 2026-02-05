/**
 * QQ群管插件 - 类型定义
 */

// ================= 群配置相关类型 =================

export interface ProfanityApiConfig {
  enabled: boolean;
  endpoint: string;
}

export interface ForbiddenConfig {
  enabled: boolean;
  words: string[];
  action: 'warn' | 'mute' | 'kick';
  muteSeconds: number;
  profanityApi: ProfanityApiConfig;
}

export interface SpamConfig {
  enabled: boolean;
  windowSeconds: number;
  maxMessages: number;
  muteSeconds: number;
}

export interface PenaltyLevel {
  count: number;
  action: 'warn' | 'mute' | 'kick';
  muteSeconds: number;
}

export interface PenaltyConfig {
  enabled: boolean;
  windowSeconds: number;
  levels: PenaltyLevel[];
}

export interface Question {
  q: string;
  a: string[];
}

export interface JoinVerifyConfig {
  enabled: boolean;
  questionPool: Question[];
  timeoutSeconds: number;
  kickOnFail: boolean;
}

export interface JoinNoticeConfig {
  enabled: boolean;
  template: string;
}

export interface LeaveNoticeConfig {
  enabled: boolean;
  template: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
}

export interface AtAllConfig {
  enabled: boolean;
  cooldownSeconds: number;
}

export interface FileManageConfig {
  enabled: boolean;
  allowExtensions: string[];
}

export interface KeywordAnnounce {
  enabled: boolean;
  keywords: string[];
  message: string;
  cooldownSeconds: number;
}

export interface ScheduleAnnounce {
  enabled: boolean;
  intervalMinutes: number;
  message: string;
}

export interface WelcomeGuideConfig {
  enabled: boolean;
  text: string;
  image: string;
}

export interface AutoRecallConfig {
  enabled: boolean;
}

export interface AppealConfig {
  enabled: boolean;
  notifyManagers: boolean;
}

export interface GroupConfig {
  groupId: string;
  enabled: boolean;
  autoApprove: boolean;
  whitelist: string[];
  blacklist: string[];
  graylist: string[];
  forbidden: ForbiddenConfig;
  spam: SpamConfig;
  penalty: PenaltyConfig;
  autoRecall: AutoRecallConfig;
  joinVerify: JoinVerifyConfig;
  joinNotice: JoinNoticeConfig;
  leaveNotice: LeaveNoticeConfig;
  announcement: AnnouncementConfig;
  atAll: AtAllConfig;
  fileManage: FileManageConfig;
  keywordAnnounce: KeywordAnnounce[];
  scheduleAnnounce: ScheduleAnnounce[];
  welcomeGuide: WelcomeGuideConfig;
  appeal: AppealConfig;
}

// ================= 插件配置类型 =================

export interface WebConfig {
  enabled: boolean;
  host?: string;
  autoDetectIP?: boolean;
  preferIPv6?: boolean;
  tokenExpireSeconds: number;
}

export interface ImageModerationConfig {
  enabled: boolean;
  endpoint: string;
  apiKey?: string;
  threshold?: number;
}

// 管理员永久密码
export interface AdminPassword {
  groupId: string;
  userId: string;
  password: string;  // 加密存储
  createdAt: number;
}

export interface Config {
  groups: GroupConfig[];
  admins?: string[];
  adminAuthority?: number;
  configFile?: string;
  recordsFile?: string;
  web?: WebConfig;
  imageModeration?: ImageModerationConfig;
  adminPasswords?: AdminPassword[];  // 管理员永久密码列表
}

// ================= 运行时数据类型 =================

export interface PendingRequest {
  type: 'invite' | 'friend-request' | 'user-request';
  groupId?: string;
  userId: string;
  userName?: string;
  flag?: string;
  subType?: string;
  comment?: string;
  session?: any;
  timestamp: number;
}

export interface TokenData {
  userId: string;
  groupId: string;
  expire: number;  // 0 表示永不过期（永久密码登录）
  role: 'admin' | 'owner' | 'bot-admin';
  permanent?: boolean;  // 是否永久登录
}

export interface PunishmentRecord {
  groupId: string;
  userId: string;
  reason: string;
  action: string;
  muteSeconds?: number;
  count?: number;
  ts: number;
}

export interface AppealRecord {
  groupId: string;
  userId: string;
  text: string;
  ts: number;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface Records {
  punishments: PunishmentRecord[];
  appeals: AppealRecord[];
}

// ================= API 响应类型 =================

export interface GroupMemberInfo {
  group_id: number;
  user_id: number;
  nickname: string;
  card: string;
  sex: string;
  age: number;
  area: string;
  join_time: number;
  last_sent_time: number;
  level: string;
  role: 'owner' | 'admin' | 'member';
  unfriendly: boolean;
  title: string;
  title_expire_time: number;
  card_changeable: boolean;
  shut_up_timestamp?: number;
}

export interface GroupInfo {
  group_id: number;
  group_name: string;
  member_count: number;
  max_member_count: number;
}

export interface MutedMember {
  user_id: number;
  nickname: string;
  shut_up_timestamp: number;
}
