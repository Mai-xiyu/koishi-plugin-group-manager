import { Context, Schema, h } from 'koishi';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { registerAdminCommands } from './commands/admin';
import { registerWebRoutes } from './web';
import { detectPublicAddress } from './utils';

export const name = 'group-manager';

export const inject = {
  required: [],
  optional: ['database', 'server', 'console', 'puppeteer']
};

// ================= Schema 定义 =================

// 默认违禁词列表（中文脏话、拼音、首字母等）
const DEFAULT_FORBIDDEN_WORDS = [
  // 中文脏话
  '傻逼', '傻屄', '沙比', '煞笔', '傻比',
  '操你妈', '草你妈', '艹你妈', '日你妈',
  '妈的', '他妈的', '你妈的', 'tmd', 'cnm',
  '操你', '草你', '艹你', '日你',
  '去死', '滚蛋', '狗逼', '狗屄', 'sb',
  // 拼音脏话
  'shabi', 'caonima', 'nima', 'nimade',
  'fuck', 'shit', 'bitch',
  // 拼音首字母
  'nmsl', 'wsnd', 'rnm', 'wcnm', 'gnm',
  // 其他常见脏话
  '贱人', '婊子', '王八蛋', '混蛋', '废物',
];

const ForbiddenSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用违禁词检测'),
  words: Schema.array(String).default(DEFAULT_FORBIDDEN_WORDS).description('违禁词列表'),
  action: Schema.union(['warn', 'mute', 'kick']).default('mute').description('处理方式'),
  muteSeconds: Schema.number().default(600).description('禁言时长（秒）'),
  profanityApi: Schema.object({
    enabled: Schema.boolean().default(false).description('启用在线违禁词 API 检测'),
    endpoint: Schema.string().default('https://uapis.cn/api/v1/text/profanitycheck').description('违禁词检测 API 地址'),
  }).description('在线违禁词 API（使用 uapis.cn 敏感词检测服务）'),
}).description('违禁词检测');

const PenaltyLevelSchema = Schema.object({
  count: Schema.number().default(1).description('触发次数'),
  action: Schema.union(['warn', 'mute', 'kick']).default('mute').description('处罚方式'),
  muteSeconds: Schema.number().default(600).description('禁言时长（秒）'),
});

const PenaltySchema = Schema.object({
  enabled: Schema.boolean().default(true).description('启用多级处罚'),
  windowSeconds: Schema.number().default(3600).description('计数窗口（秒）'),
  levels: Schema.array(PenaltyLevelSchema).default([
    { count: 1, action: 'warn', muteSeconds: 0 },
    { count: 2, action: 'mute', muteSeconds: 600 },
    { count: 3, action: 'kick', muteSeconds: 0 },
  ]).description('处罚规则'),
}).description('多级处罚系统');

const SpamSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用刷屏检测'),
  windowSeconds: Schema.number().default(10).description('统计窗口（秒）'),
  maxMessages: Schema.number().default(6).description('窗口内最大消息数'),
  muteSeconds: Schema.number().default(600).description('禁言时长（秒）'),
}).description('刷屏检测');

// 题库问题Schema - 支持多答案
const QuestionSchema = Schema.object({
  q: Schema.string().required().description('问题'),
  a: Schema.array(String).required().description('答案列表（多个答案均可通过）'),
});

const JoinVerifySchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用进群验证'),
  questionPool: Schema.array(QuestionSchema).default([
    { q: '请回答：1+1=?', a: ['2', '二', '贰'] },
  ]).description('题库（随机抽题，每题支持多个正确答案）'),
  timeoutSeconds: Schema.number().default(120).description('超时秒数'),
  kickOnFail: Schema.boolean().default(true).description('验证失败踢出群'),
}).description('进群验证');

const JoinNoticeSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用入群通知'),
  template: Schema.string().default('欢迎 {user} 加入 {group}').description('消息模板 ({user}=用户ID, {group}=群名)'),
}).description('入群通知');

const LeaveNoticeSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用退群通知'),
  template: Schema.string().default('{user} 已退出 {group}').description('消息模板 ({user}=用户ID, {group}=群名)'),
}).description('退群通知');

const AnnouncementSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用群公告'),
  text: Schema.string().default('').description('公告内容'),
}).description('群公告');

const AtAllSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用艾特全体'),
  cooldownSeconds: Schema.number().default(3600).description('冷却时间（秒）'),
}).description('艾特全体');

const FileManageSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用群文件管理'),
  allowExtensions: Schema.array(String).default([]).description('允许的文件扩展名（空=全部允许）'),
}).description('群文件管理');

const KeywordAnnounceSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用此规则'),
  keywords: Schema.array(String).default([]).description('触发关键词列表'),
  message: Schema.string().default('').description('触发后发送的公告内容'),
  cooldownSeconds: Schema.number().default(300).description('触发冷却（秒）'),
});

const ScheduleAnnounceSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用此规则'),
  intervalMinutes: Schema.number().default(60).description('间隔分钟'),
  message: Schema.string().default('').description('公告内容'),
});

const WelcomeGuideSchema = Schema.object({
  enabled: Schema.boolean().default(false).description('启用欢迎引导'),
  text: Schema.string().default('欢迎加入！请先阅读群公告并遵守规则。').description('欢迎文字'),
  image: Schema.string().default('').description('欢迎图片 URL（可选）'),
}).description('欢迎引导');

const AutoRecallSchema = Schema.object({
  enabled: Schema.boolean().default(true).description('自动撤回违规消息'),
}).description('自动撤回');

const AppealSchema = Schema.object({
  enabled: Schema.boolean().default(true).description('启用申诉功能'),
  notifyManagers: Schema.boolean().default(true).description('通知群管理员'),
}).description('申诉功能');

const WebSchema = Schema.object({
  enabled: Schema.boolean().default(true).description('启用管理网站'),
  host: Schema.string().default('').description('公网地址（留空自动检测）支持：域名、域名:端口、IP:端口。如：example.com、example.com:8080、[2409:xxxx::1]:5140'),
  autoDetectIP: Schema.boolean().default(true).description('自动检测公网 IP（仅在 host 留空时生效）'),
  preferIPv6: Schema.boolean().default(true).description('优先使用 IPv6（仅自动检测时生效）'),
  tokenExpireSeconds: Schema.number().default(3600).description('登录有效期（秒）'),
}).description('网站控制（端口由 @koishijs/plugin-server 控制，手动指定 host 时可在地址中包含端口）');

// 群配置 Schema - 使用 collapse 让其以树形结构展示
const GroupSchema = Schema.intersect([
  Schema.object({
    groupId: Schema.string().required().description('群号/频道 ID'),
    enabled: Schema.boolean().default(true).description('启用本群管理'),
    autoApprove: Schema.boolean().default(false).description('自动同意入群申请'),
  }).description('基本设置'),
  
  Schema.object({
    whitelist: Schema.array(String).default([]).description('免检白名单（不受规则限制）'),
    blacklist: Schema.array(String).default([]).description('黑名单（自动踢出）'),
    graylist: Schema.array(String).default([]).description('灰名单（重点监控，违禁词检测更严格）'),
  }).description('成员名单（群管理员通过API自动判断）'),
  
  Schema.object({
    forbidden: ForbiddenSchema,
    spam: SpamSchema,
    penalty: PenaltySchema,
    autoRecall: AutoRecallSchema,
  }).description('违规检测'),
  
  Schema.object({
    joinVerify: JoinVerifySchema,
    joinNotice: JoinNoticeSchema,
    leaveNotice: LeaveNoticeSchema,
    welcomeGuide: WelcomeGuideSchema,
  }).description('进退群管理'),
  
  Schema.object({
    announcement: AnnouncementSchema,
    atAll: AtAllSchema,
    keywordAnnounce: Schema.array(KeywordAnnounceSchema).default([]).description('关键词触发公告'),
    scheduleAnnounce: Schema.array(ScheduleAnnounceSchema).default([]).description('定时公告'),
  }).description('公告设置'),
  
  Schema.object({
    fileManage: FileManageSchema,
    appeal: AppealSchema,
  }).description('其他功能'),
]);

export interface Config {
  groups: any[];
  admins?: string[];
  adminAuthority?: number;
  configFile?: string;
  web?: any;
  recordsFile?: string;
  imageModeration?: {
    enabled: boolean;
    endpoint: string;
    apiKey?: string;
    threshold?: number;
  };
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    admins: Schema.array(String).default([]).description('机器人管理员QQ号列表（可多个，拥有最高权限）'),
    adminAuthority: Schema.union([1, 2, 3]).default(2).description('命令权限等级：1=所有人, 2=管理员及以上, 3=仅群主'),
    configFile: Schema.string().default('data/qq-group-manager.json').description('群配置存储 JSON 路径'),
    recordsFile: Schema.string().default('data/qq-group-manager-records.json').description('处罚/申诉记录存储路径'),
  }).description('基本设置'),
  
  Schema.object({
    groups: Schema.array(GroupSchema).default([]).description('点击添加群配置'),
  }).description('群管理配置'),
  
  Schema.object({
    web: WebSchema,
  }).description('Web 控制台'),
  
  Schema.object({
    imageModeration: Schema.object({
      enabled: Schema.boolean().default(false).description('启用敏感图检测'),
      endpoint: Schema.string().default('').description('图片检测 API 地址'),
      apiKey: Schema.string().default('').description('API Key（可选）'),
      threshold: Schema.number().default(0.7).description('命中阈值（0-1）'),
    }).description('敏感图检测配置'),
  }).description('敏感图检测'),
]);

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('qq-group-manager');
  const server = (ctx as any).server;

  // ================= 权限检查系统 =================
  // 快速获取角色等级（从session中读取，可能不准确）
  const getRoleLevel = (session: any): number => {
    const userId = String(session.userId || '');
    
    // 检查是否是机器人管理员（最高权限）
    if (Array.isArray(config.admins) && config.admins.includes(userId)) {
      return 4;
    }
    
    // 检查群内角色（可能不准确，仅作为快速判断）
    const role = session?.member?.role || session?.event?.sender?.role || '';
    
    if (role === 'owner') return 3;  // 群主
    if (role === 'admin') return 2;  // 管理员
    return 0;  // 未知，需要异步查询
  };

  // 异步获取用户角色等级：1=普通成员, 2=管理员, 3=群主, 4=机器人管理员
  const getRoleLevelAsync = async (session: any) => {
    const userId = String(session.userId || '');
    
    // 检查是否是机器人管理员（最高权限）
    if (Array.isArray(config.admins) && config.admins.includes(userId)) {
      return 4;
    }
    
    // 优先使用 OneBot API 获取准确的角色信息
    const bot = session?.bot as any;
    const groupId = String(session?.guildId || '');
    
    if (bot?.internal?.getGroupMemberInfo && groupId && userId) {
      try {
        const info = await bot.internal.getGroupMemberInfo(groupId, userId, false);
        const role = info?.role || '';
        logger.debug(`获取用户 ${userId} 在群 ${groupId} 的角色: ${role}`);
        if (role === 'owner') return 3;
        if (role === 'admin') return 2;
        if (role === 'member') return 1;
      } catch (e: any) {
        logger.debug(`获取用户角色失败，尝试其他方式: ${e.message}`);
      }
    }
    
    // 备用：使用 getGuildMember
    if (bot?.getGuildMember && session?.guildId && session?.userId) {
      try {
        const member = await bot.getGuildMember(session.guildId, session.userId);
        const roles = new Set<string>();
        if (member?.role && typeof member.role === 'string') roles.add(member.role);
        if (Array.isArray(member?.roles)) {
          member.roles.forEach((r: any) => {
            if (typeof r === 'string') roles.add(r);
            else if (r && typeof r === 'object') {
              if (typeof r.id === 'string') roles.add(r.id);
              if (typeof r.name === 'string') roles.add(r.name);
            }
          });
        }
        if (roles.has('owner')) return 3;
        if (roles.has('admin')) return 2;
        if (roles.has('member')) return 1;
      } catch {}
    }
    
    // 最后使用 session 中的信息
    const sessionRole = session?.member?.role || session?.event?.sender?.role || 'member';
    if (sessionRole === 'owner') return 3;
    if (sessionRole === 'admin') return 2;
    return 1;  // 默认普通成员
  };

  // 权限检查函数
  const requireManage = async (session: any, channelId?: string) => {
    const level = Number(config.adminAuthority ?? 2);
    if (level <= 1) return true;
    if (channelId && channelId !== session.channelId) return false;
    const roleLevel = await getRoleLevelAsync(session);
    if (level <= 2) return roleLevel >= 2;
    const ok = roleLevel >= 3;
    if (!ok) {
      logger.info(`权限不足调试：level=${level}, role=${session?.member?.role}, roles=${JSON.stringify(session?.member?.roles)}, onebotRole=${session?.event?.sender?.role}`);
    }
    return ok;
  };

  const resolveConfigFile = () => {
    const p = String(config.configFile || 'data/qq-group-manager.json');
    return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  };

  const resolveRecordsFile = () => {
    const p = String(config.recordsFile || 'data/qq-group-manager-records.json');
    return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  };

  // 配置直接使用 config 对象（来自 Koishi 控制台），不再从文件加载

  const records = {
    punishments: [] as any[],
    appeals: [] as any[],
  };

  // === 入群邀请管理 ===
  const pendingRequests = new Map<string, any>();
  const approvedGroups = new Set<string>();
  let requestCounter = 1;

  const isAdmin = (session: any) => {
    const list = Array.isArray(config.admins) ? config.admins.map(String) : [];
    return list.includes(String(session.userId));
  };

  const cleanupRequests = () => {
    const now = Date.now();
    for (const [id, req] of pendingRequests) {
      if (now - (req.timestamp || now) > 24 * 60 * 60 * 1000) pendingRequests.delete(id);
    }
  };

  const loadRecords = async () => {
    try {
      const fp = resolveRecordsFile();
      const content = await fs.readFile(fp, 'utf8');
      const json = JSON.parse(content);
      if (json && typeof json === 'object') {
        records.punishments = Array.isArray(json.punishments) ? json.punishments : [];
        records.appeals = Array.isArray(json.appeals) ? json.appeals : [];
      }
    } catch {
      await saveRecords();
    }
  };

  const saveRecords = async () => {
    try {
      const fp = resolveRecordsFile();
      await fs.mkdir(path.dirname(fp), { recursive: true });
      await fs.writeFile(fp, JSON.stringify(records, null, 2), 'utf8');
    } catch (e: any) {
      logger.warn(`记录文件写入失败：${e.message}`);
    }
  };

  const getGroup = (groupId: string) => {
    if (!Array.isArray(config.groups)) config.groups = [] as any;
    return config.groups.find((g: any) => String(g?.groupId) === String(groupId));
  };

  const ensureGroup = (groupId: string) => {
    if (!Array.isArray(config.groups)) config.groups = [] as any;
    let group = config.groups.find((g: any) => String(g?.groupId) === String(groupId));
    if (!group) {
      group = {
        groupId: String(groupId),
        enabled: true,
        autoApprove: false,
        managers: [],
        whitelist: [],
        blacklist: [],
        graylist: [],
        forbidden: { enabled: false, words: [...DEFAULT_FORBIDDEN_WORDS], action: 'mute', muteSeconds: 600, profanityApi: { enabled: false, endpoint: 'https://uapis.cn/api/v1/text/profanitycheck' } },
        spam: { enabled: false, windowSeconds: 10, maxMessages: 6, muteSeconds: 600 },
        penalty: { enabled: true, windowSeconds: 3600, levels: [
          { count: 1, action: 'warn', muteSeconds: 0 },
          { count: 2, action: 'mute', muteSeconds: 600 },
          { count: 3, action: 'kick', muteSeconds: 0 },
        ] },
        autoRecall: { enabled: true },
        joinVerify: { enabled: false, questionPool: [{ q: '请回答：1+1=?', a: ['2', '二', '贰'] }], timeoutSeconds: 120, kickOnFail: true },
        joinNotice: { enabled: false, template: '欢迎 {user} 加入 {group}' },
        leaveNotice: { enabled: false, template: '{user} 已退出 {group}' },
        announcement: { enabled: false, text: '' },
        atAll: { enabled: false, cooldownSeconds: 3600 },
        fileManage: { enabled: false, allowExtensions: [] },
        keywordAnnounce: [],
        scheduleAnnounce: [],
        welcomeGuide: { enabled: false, text: '欢迎加入！请先阅读群公告并遵守规则。', image: '' },
        appeal: { enabled: true, notifyManagers: true },
      };
      config.groups.push(group as any);
    }
    return group as any;
  };

  const formatTemplate = (tpl: string, vars: Record<string, string>) => {
    let out = String(tpl || '');
    Object.keys(vars).forEach(k => {
      out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
    });
    return out;
  };

  const onebotCall = async (bot: any, action: string, params: any) => {
    if (!bot) return false;
    try {
      if (bot.internal && typeof bot.internal[action] === 'function') {
        await bot.internal[action](params);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const isManager = (group: any, userId: string) => {
    const list = Array.isArray(group?.managers) ? group.managers.map(String) : [];
    return list.includes(String(userId));
  };

  const inList = (list: any[], userId: string) => Array.isArray(list) && list.map(String).includes(String(userId));

  const recordPunish = async (data: any) => {
    records.punishments.push({ ...data, ts: Date.now() });
    await saveRecords();
  };

  const recordAppeal = async (data: any) => {
    records.appeals.push({ ...data, ts: Date.now() });
    await saveRecords();
  };

  const checkImage = async (url: string) => {
    if (!config.imageModeration?.enabled || !config.imageModeration.endpoint) return false;
    try {
      const res = await fetch(config.imageModeration.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.imageModeration.apiKey ? { 'authorization': config.imageModeration.apiKey } : {}),
        },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json?.nsfw === true) return true;
      const score = Number(json?.score ?? json?.nsfw_score ?? json?.prob ?? 0);
      const threshold = Number(config.imageModeration.threshold ?? 0.7);
      return score >= threshold;
    } catch {
      return false;
    }
  };

  // 在线违禁词 API 检测（uapis.cn）- 使用群独立配置
  const checkProfanityApi = async (text: string, groupForbidden: any): Promise<{ hit: boolean; words: string[] }> => {
    const apiConfig = groupForbidden?.profanityApi;
    if (!apiConfig?.enabled || !apiConfig.endpoint) {
      return { hit: false, words: [] };
    }
    try {
      const res = await fetch(apiConfig.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return { hit: false, words: [] };
      const json = await res.json() as any;
      // status: "forbidden" 表示有违禁词
      if (json?.status === 'forbidden' && Array.isArray(json?.forbidden_words) && json.forbidden_words.length > 0) {
        return { hit: true, words: json.forbidden_words };
      }
      return { hit: false, words: [] };
    } catch (e: any) {
      logger.warn(`违禁词 API 调用失败: ${e.message}`);
      return { hit: false, words: [] };
    }
  };

  // === 违禁词 & 刷屏 ===
  const spamMap = new Map<string, number[]>();
  const offenseMap = new Map<string, { count: number; lastAt: number }>();
  const keywordCooldown = new Map<string, number>();
  const scheduleTimers = new Map<string, NodeJS.Timeout[]>();

  // === 消息统计 ===
  // 结构: Map<groupId, Map<userId, { total: number, today: number, lastTime: number, todayDate: string }>>
  const messageStats = new Map<string, Map<string, { total: number; today: number; lastTime: number; todayDate: string }>>();
  
  // 暴露给 Web 模块使用
  (ctx as any).qqgmMessageStats = messageStats;

  // 消息统计文件路径
  const resolveStatsFile = () => {
    const p = String(config.configFile || 'data/qq-group-manager.json').replace('.json', '-stats.json');
    return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  };

  // 加载消息统计
  const loadMessageStats = async () => {
    try {
      const fp = resolveStatsFile();
      const content = await fs.readFile(fp, 'utf8');
      const json = JSON.parse(content);
      if (json && typeof json === 'object') {
        for (const [groupId, users] of Object.entries(json)) {
          const groupMap = new Map<string, { total: number; today: number; lastTime: number; todayDate: string }>();
          for (const [userId, stats] of Object.entries(users as any)) {
            groupMap.set(userId, stats as any);
          }
          messageStats.set(groupId, groupMap);
        }
        logger.info(`已加载消息统计数据`);
      }
    } catch {
      // 文件不存在，忽略
    }
  };

  // 保存消息统计（防抖）
  let statsSaveTimer: NodeJS.Timeout | null = null;
  const saveMessageStats = async () => {
    if (statsSaveTimer) clearTimeout(statsSaveTimer);
    statsSaveTimer = setTimeout(async () => {
      try {
        const fp = resolveStatsFile();
        await fs.mkdir(path.dirname(fp), { recursive: true });
        const obj: Record<string, Record<string, any>> = {};
        for (const [groupId, users] of messageStats) {
          obj[groupId] = {};
          for (const [userId, stats] of users) {
            obj[groupId][userId] = stats;
          }
        }
        await fs.writeFile(fp, JSON.stringify(obj, null, 2), 'utf8');
      } catch (e: any) {
        logger.warn(`消息统计保存失败: ${e.message}`);
      }
    }, 30000); // 30秒防抖，避免频繁写入
  };

  // 更新消息统计
  const updateMessageStats = (groupId: string, userId: string) => {
    if (!messageStats.has(groupId)) {
      messageStats.set(groupId, new Map());
    }
    const groupStats = messageStats.get(groupId)!;
    const today = new Date().toDateString();
    
    if (!groupStats.has(userId)) {
      groupStats.set(userId, { total: 0, today: 0, lastTime: 0, todayDate: today });
    }
    
    const userStats = groupStats.get(userId)!;
    
    // 如果日期变了，重置今日计数
    if (userStats.todayDate !== today) {
      userStats.today = 0;
      userStats.todayDate = today;
    }
    
    userStats.total++;
    userStats.today++;
    userStats.lastTime = Date.now();
    
    // 触发保存（防抖）
    saveMessageStats();
  };

  // 主中间件：违禁词、刷屏检测等
  ctx.middleware(async (session, next) => {
    // 只处理 OneBot 群消息
    if (session.platform !== 'onebot' || !session.guildId) return next();
    
    // 更新消息统计
    if (session.userId) {
      updateMessageStats(session.guildId, String(session.userId));
    }
    
    const group = getGroup(session.guildId);
    if (!group || group.enabled === false) {
      logger.debug(`群 ${session.guildId} 未配置或已禁用`);
      return next();
    }

    const userId = String(session.userId || '');
    
    // 白名单和管理员跳过检测
    if (inList(group.whitelist || [], userId) || isManager(group, userId)) {
      return next();
    }

    // 黑名单直接踢出
    if (inList(group.blacklist || [], userId)) {
      logger.info(`踢出黑名单用户 ${userId} 从群 ${session.guildId}`);
      await onebotCall(session.bot, 'set_group_kick', {
        group_id: String(session.guildId),
        user_id: String(userId),
        reject_add_request: false,
      });
      return;
    }

    const content = String(session.content || '').trim();
    
    // 提取纯文本内容用于违禁词检测（排除图片、表情等）
    const extractTextContent = (raw: string): string => {
      // 移除所有koishi元素标签（如 <image>, <face>, <at> 等）
      return raw
        .replace(/<image[^>]*\/?>/gi, '')
        .replace(/<img[^>]*\/?>/gi, '')
        .replace(/<face[^>]*\/?>/gi, '')
        .replace(/<mface[^>]*\/?>/gi, '')
        .replace(/<at[^>]*\/?>/gi, '')
        .replace(/<audio[^>]*\/?>/gi, '')
        .replace(/<video[^>]*\/?>/gi, '')
        .replace(/<file[^>]*\/?>/gi, '')
        .replace(/<[^>]+>/g, '') // 移除其他标签
        .trim();
    };
    const textContent = extractTextContent(content);

    const applyPenalty = async (reason: string) => {
      const key = `${session.guildId}:${userId}`;
      const now = Date.now();
      
      let action = group.forbidden?.action || 'warn';
      let muteSeconds = Number(group.forbidden?.muteSeconds || 600);
      let count = 1;
      
      // 多级处罚逻辑
      if (group.penalty?.enabled) {
        const windowMs = Number(group.penalty.windowSeconds || 3600) * 1000;
        const prev = offenseMap.get(key);
        count = !prev || now - prev.lastAt > windowMs ? 1 : prev.count + 1;
        offenseMap.set(key, { count, lastAt: now });
        
        logger.debug(`多级处罚计算 - 用户:${userId} 当前次数:${count} 上次:${prev ? new Date(prev.lastAt).toISOString() : '无'}`);
        
        const levels = Array.isArray(group.penalty.levels) ? group.penalty.levels : [];
        // 按 count 降序排列，找到第一个 count <= 当前次数的规则
        const sortedLevels = levels.slice().sort((a: any, b: any) => Number(b.count || 1) - Number(a.count || 1));
        const level = sortedLevels.find((l: any) => count >= Number(l.count || 1));
        
        if (level) {
          action = level.action;
          muteSeconds = Number(level.muteSeconds || 600);
          logger.debug(`匹配处罚级别 - 触发次数:${level.count} 动作:${action} 禁言:${muteSeconds}秒`);
        } else {
          logger.debug(`未匹配到处罚级别，使用默认动作:${action}`);
        }
      } else {
        logger.debug(`多级处罚未启用，使用违禁词配置的动作:${action}`);
      }

      // 自动撤回
      if (group.autoRecall?.enabled && session.messageId) {
        try { 
          await session.bot.deleteMessage(session.channelId, session.messageId);
          logger.debug(`已撤回消息 ${session.messageId}`);
        } catch (e: any) {
          logger.warn(`撤回消息失败: ${e.message}`);
        }
      }

      // 执行处罚
      logger.info(`执行处罚 - 群:${session.guildId} 用户:${userId} 动作:${action} 原因:${reason} 次数:${count}`);
      
      if (action === 'warn') {
        await session.send(`⚠️ 警告（第${count}次）：${reason}`);
      } else if (action === 'mute') {
        const success = await onebotCall(session.bot, 'set_group_ban', {
          group_id: String(session.guildId),
          user_id: String(userId),
          duration: muteSeconds,
        });
        if (success) {
          await session.send(`🔇 已禁言（第${count}次违规，${muteSeconds}秒）：${reason}`);
        } else {
          logger.warn(`禁言 API 调用失败`);
        }
      } else if (action === 'kick') {
        const success = await onebotCall(session.bot, 'set_group_kick', {
          group_id: String(session.guildId),
          user_id: String(userId),
          reject_add_request: false,
        });
        if (success) {
          logger.info(`已踢出用户 ${userId}`);
        } else {
          logger.warn(`踢人 API 调用失败`);
        }
      }

      await recordPunish({ groupId: session.guildId, userId, reason, action, muteSeconds, count });
      logger.info(`处罚记录已保存 - 群:${session.guildId} 用户:${userId} 动作:${action} 原因:${reason} 次数:${count}`);
    };

    // 违禁词检测（本地 + API）- 只检测纯文本内容
    if (group.forbidden?.enabled && textContent) {
      logger.debug(`检测违禁词 - 群:${session.guildId} 用户:${userId} 内容:${textContent.substring(0, 50)}`);
      
      // 1. 本地违禁词检测
      const words = Array.isArray(group.forbidden.words) ? group.forbidden.words : [];
      const contentLower = textContent.toLowerCase();
      const localHit = words.find(w => w && contentLower.includes(String(w).toLowerCase()));
      if (localHit) {
        logger.info(`触发本地违禁词 "${localHit}" - 群:${session.guildId} 用户:${userId}`);
        await applyPenalty(`违禁词:${localHit}`);
        return;
      }
      
      // 2. 在线 API 违禁词检测（使用群独立配置）
      if (group.forbidden?.profanityApi?.enabled) {
        const apiResult = await checkProfanityApi(textContent, group.forbidden);
        if (apiResult.hit && apiResult.words.length > 0) {
          const hitWord = apiResult.words[0];
          logger.info(`触发API违禁词 "${hitWord}" - 群:${session.guildId} 用户:${userId}`);
          await applyPenalty(`API违禁词:${hitWord}`);
          return;
        }
      }
    }

    // 刷屏检测
    if (group.spam?.enabled && session.userId) {
      const key = `${session.guildId}:${session.userId}`;
      const now = Date.now();
      const windowMs = Number(group.spam.windowSeconds || 10) * 1000;
      const maxMessages = Number(group.spam.maxMessages || 6);
      const list = (spamMap.get(key) || []).filter(t => now - t < windowMs);
      list.push(now);
      spamMap.set(key, list);
      logger.debug(`刷屏检测 - 群:${session.guildId} 用户:${userId} 消息数:${list.length}/${maxMessages}`);
      if (list.length > maxMessages) {
        logger.info(`触发刷屏 - 群:${session.guildId} 用户:${userId} 消息数:${list.length}`);
        await applyPenalty('刷屏');
        spamMap.set(key, []);
        return;
      }
    }

    // 灰名单用户：对其进行更严格的违禁词检测（即使违禁词功能未启用也检测）
    if (inList(group.graylist || [], userId) && content) {
      const words = Array.isArray(group.forbidden?.words) ? group.forbidden.words : DEFAULT_FORBIDDEN_WORDS;
      const contentLower = content.toLowerCase();
      const hit = words.find(w => w && contentLower.includes(String(w).toLowerCase()));
      if (hit) {
        logger.info(`灰名单用户触发违禁词 "${hit}" - 群:${session.guildId} 用户:${userId}`);
        await applyPenalty(`灰名单违禁词:${hit}`);
        return;
      }
    }

    // 敏感图检测
    if (config.imageModeration?.enabled && Array.isArray((session as any).elements)) {
      const imgs = (session as any).elements.filter((el: any) => el?.type === 'image');
      for (const img of imgs) {
        const url = String(img?.attrs?.url || img?.attrs?.src || '');
        if (!url) continue;
        const hit = await checkImage(url);
        if (hit) {
          logger.info(`触发敏感图检测 - 群:${session.guildId} 用户:${userId}`);
          await applyPenalty('敏感图');
          return;
        }
      }
    }

    // 群文件管理（粗略检测 file 元素）
    if (group.fileManage?.enabled && Array.isArray((session as any).elements)) {
      const allow = new Set((group.fileManage.allowExtensions || []).map((s: string) => s.toLowerCase()));
      const hasFile = (session as any).elements.find((el: any) => el?.type === 'file');
      if (hasFile) {
        const name = String(hasFile?.attrs?.name || '');
        const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
        if (allow.size && (!ext || !allow.has(ext))) {
          await session.send('该群禁止发送此类型文件。');
          if (group.autoRecall?.enabled && session.messageId) {
            try { await session.bot.deleteMessage(session.channelId, session.messageId); } catch {}
          }
          return;
        }
      }
    }

    // 关键词触发公告
    if (Array.isArray(group.keywordAnnounce) && content) {
      for (let idx = 0; idx < group.keywordAnnounce.length; idx++) {
        const rule = group.keywordAnnounce[idx];
        if (!rule?.enabled) continue;
        const kws = Array.isArray(rule.keywords) ? rule.keywords : [];
        if (!kws.length) continue;
        const hit = kws.find((k: string) => k && content.includes(k));
        if (!hit) continue;
        const key = `${session.guildId}:${idx}`;
        const cooldown = Number(rule.cooldownSeconds || 300) * 1000;
        const last = keywordCooldown.get(key) || 0;
        if (Date.now() - last < cooldown) continue;
        keywordCooldown.set(key, Date.now());
        if (rule.message) {
          // 异步发送，避免阻塞
          session.send(rule.message).catch(e => logger.warn(`关键词公告发送失败: ${e.message}`));
        }
      }
    }

    return next();
  }, true);

  // ================= 邀请入群申请 =================
  ctx.command('邀请入群 <groupId:string>', '申请邀请机器人加入指定群聊')
    .action(async ({ session }, groupId) => {
      if (!groupId || !/^\d+$/.test(groupId)) return '请输入正确的群号（纯数字）';
      cleanupRequests();
      const userId = String(session.userId);
      const userName = session.username || userId;
      const inviteId = requestCounter++;
      pendingRequests.set(String(inviteId), {
        type: 'user-request',
        groupId: String(groupId),
        userId,
        userName,
        timestamp: Date.now(),
        platform: session.platform,
      });
      const admins = Array.isArray(config.admins) ? config.admins : [];
      for (const adminId of admins) {
        try {
          await session.bot.sendPrivateMessage(adminId, `📨 收到入群申请\n━━━━━━━━━━━━━━━\n请求ID: ${inviteId}\n申请人: ${userName} (${userId})\n目标群: ${groupId}\n━━━━━━━━━━━━━━━\n回复「同意 ${inviteId}」或「拒绝 ${inviteId}」`);
        } catch (e: any) {
          logger.warn(`无法通知管理员 ${adminId}: ${e.message}`);
        }
      }
      return `✅ 已向管理员发送入群申请，请等待审核。\n目标群号: ${groupId}`;
    });

  // ================= 监听入群邀请事件 =================
  ctx.on('guild-request', async (session) => {
    if (session.platform !== 'onebot') return;
    cleanupRequests();
    const groupId = String(session.guildId || '');
    const flag = String(session.messageId || (session as any).event?._data?.flag || '');
    const subType = String((session as any).event?._data?.sub_type || 'invite');
    
    logger.info(`收到 guild-request 事件 - 群:${groupId} 类型:${subType} 用户:${session.userId} flag:${flag}`);

    // 自动同意入群申请逻辑（用户主动申请加群）
    if (subType === 'add') {
      const groupConfig = getGroup(groupId);
      logger.debug(`群 ${groupId} autoApprove 配置: ${groupConfig?.autoApprove}`);
      if (groupConfig && groupConfig.autoApprove === true) {
        try {
          // OneBot v11 API: set_group_add_request
          const bot = session.bot as any;
          if (bot?.internal?.setGroupAddRequest) {
            await bot.internal.setGroupAddRequest(flag, subType, true, '');
            logger.info(`已自动同意用户 ${session.userId} 加入群 ${groupId}`);
            return;
          } else if (bot?.internal?.set_group_add_request) {
            await bot.internal.set_group_add_request({ flag, sub_type: subType, approve: true, reason: '' });
            logger.info(`已自动同意用户 ${session.userId} 加入群 ${groupId} (snake_case API)`);
            return;
          } else {
            logger.warn(`无法找到 setGroupAddRequest API`);
          }
        } catch (e: any) {
          logger.error(`自动同意入群失败: ${e.message}`);
        }
        return;
      }
    }

    if (approvedGroups.has(groupId)) {
      try {
        if ((session as any).bot?.internal?.setGroupAddRequest) {
          await (session as any).bot.internal.setGroupAddRequest(flag, subType, true, '');
          approvedGroups.delete(groupId);
          const admins = Array.isArray(config.admins) ? config.admins : [];
          for (const adminId of admins) {
            try {
              await session.bot.sendPrivateMessage(adminId, `✅ 机器人已自动加入群: ${groupId}\n邀请人: ${session.userId}`);
            } catch {}
          }
        }
      } catch (e: any) {
        logger.error(`自动同意入群失败: ${e.message}`);
      }
      return;
    }

    const requestId = requestCounter++;
    pendingRequests.set(String(requestId), {
      type: 'guild-request',
      flag,
      groupId,
      userId: session.userId,
      subType,
      timestamp: Date.now(),
      session,
    });

    const admins = Array.isArray(config.admins) ? config.admins : [];
    for (const adminId of admins) {
      try {
        await session.bot.sendPrivateMessage(adminId, `📨 收到入群邀请\n━━━━━━━━━━━━━━━\n请求ID: ${requestId}\n邀请人: ${session.userId}\n目标群: ${groupId}\n━━━━━━━━━━━━━━━\n回复「同意 ${requestId}」或「拒绝 ${requestId}」`);
      } catch (e: any) {
        logger.warn(`无法通知管理员 ${adminId}: ${e.message}`);
      }
    }
  });

  // ================= 监听好友请求事件 =================
  ctx.on('friend-request', async (session) => {
    if (session.platform !== 'onebot') return;
    cleanupRequests();
    
    const userId = String(session.userId || '');
    const flag = String(session.messageId || (session as any).event?._data?.flag || '');
    const comment = String((session as any).event?._data?.comment || '无');
    
    logger.info(`收到 friend-request 事件 - 用户:${userId} 验证消息:${comment} flag:${flag}`);

    // 存储好友请求
    const requestId = requestCounter++;
    pendingRequests.set(String(requestId), {
      type: 'friend-request',
      flag,
      userId,
      comment,
      timestamp: Date.now(),
      session,
    });

    // 通知所有机器人管理员
    const admins = Array.isArray(config.admins) ? config.admins : [];
    for (const adminId of admins) {
      try {
        await session.bot.sendPrivateMessage(adminId, 
          `👤 收到加好友请求\n━━━━━━━━━━━━━━━\n请求ID: ${requestId}\n申请人: ${userId}\n验证消息: ${comment}\n━━━━━━━━━━━━━━━\n回复「同意 ${requestId}」或「拒绝 ${requestId}」`
        );
      } catch (e: any) {
        logger.warn(`无法通知管理员 ${adminId}: ${e.message}`);
      }
    }
  });

  // ================= 同意/拒绝/查看邀请（仅私聊） =================
  ctx.command('同意 <requestId:string> [remark:text]', '同意入群/加好友请求（仅管理员私聊）')
    .usage('同意 <请求ID> [备注]，备注仅对好友请求有效')
    .action(async ({ session }, requestId, remark) => {
      // 只在私聊中生效
      if (session.guildId) return;
      if (!isAdmin(session)) return '您没有权限执行此操作';
      cleanupRequests();
      const request = pendingRequests.get(requestId);
      if (!request) return `未找到请求ID: ${requestId}\n使用「查看邀请」查看所有待处理的请求`;

      // 处理好友请求
      if (request.type === 'friend-request') {
        try {
          const bot = session.bot as any;
          if (bot?.internal?.setFriendAddRequest) {
            await bot.internal.setFriendAddRequest(request.flag, true, remark || '');
          } else if (bot?.internal?.set_friend_add_request) {
            await bot.internal.set_friend_add_request({ 
              flag: request.flag, 
              approve: true, 
              remark: remark || '' 
            });
          } else {
            return '当前适配器不支持好友请求处理';
          }
          pendingRequests.delete(requestId);
          return `✅ 已同意好友请求\n用户: ${request.userId}${remark ? `\n备注: ${remark}` : ''}`;
        } catch (e: any) {
          logger.error(`同意好友请求失败: ${e.message}`);
          return `操作失败: ${e.message}`;
        }
      }

      // 处理用户申请加群（非邀请）
      if (request.type === 'user-request') {
        approvedGroups.add(String(request.groupId));
        pendingRequests.delete(requestId);
        try {
          await session.bot.sendPrivateMessage(request.userId, `✅ 您的入群申请已被同意！\n目标群: ${request.groupId}\n━━━━━━━━━━━━━━━\n请现在在群内邀请机器人加入，机器人将自动同意入群。`);
        } catch (e: any) {
          logger.warn(`无法通知申请人: ${e.message}`);
        }
        return `✅ 已同意入群申请\n群号: ${request.groupId}\n申请人: ${request.userName}\n\n已通知用户去群内邀请机器人，机器人收到邀请后将自动加入。`;
      }

      // 处理群邀请
      try {
        if (session.bot.internal?.setGroupAddRequest) {
          await session.bot.internal.setGroupAddRequest(request.flag, request.subType, true, '');
        } else if (request.session?.bot?.internal?.setGroupAddRequest) {
          await request.session.bot.internal.setGroupAddRequest(request.flag, request.subType, true, '');
        } else {
          return '当前适配器不支持此操作';
        }
        pendingRequests.delete(requestId);
        return `✅ 已同意加入群: ${request.groupId}`;
      } catch (e: any) {
        logger.error(`同意入群失败: ${e.message}`);
        return `操作失败: ${e.message}`;
      }
    });

  ctx.command('拒绝 <requestId:string> [reason:text]', '拒绝入群/加好友请求（仅管理员私聊）')
    .usage('拒绝 <请求ID> [原因]，原因仅对入群请求有效')
    .action(async ({ session }, requestId, reason) => {
      // 只在私聊中生效
      if (session.guildId) return;
      if (!isAdmin(session)) return '您没有权限执行此操作';
      cleanupRequests();
      const request = pendingRequests.get(requestId);
      if (!request) return `未找到请求ID: ${requestId}\n使用「查看邀请」查看所有待处理的请求`;

      // 处理好友请求
      if (request.type === 'friend-request') {
        try {
          const bot = session.bot as any;
          if (bot?.internal?.setFriendAddRequest) {
            await bot.internal.setFriendAddRequest(request.flag, false, '');
          } else if (bot?.internal?.set_friend_add_request) {
            await bot.internal.set_friend_add_request({ 
              flag: request.flag, 
              approve: false,
              remark: '' 
            });
          } else {
            return '当前适配器不支持好友请求处理';
          }
          pendingRequests.delete(requestId);
          return `✅ 已拒绝好友请求\n用户: ${request.userId}`;
        } catch (e: any) {
          logger.error(`拒绝好友请求失败: ${e.message}`);
          return `操作失败: ${e.message}`;
        }
      }

      // 处理用户申请加群
      if (request.type === 'user-request') {
        pendingRequests.delete(requestId);
        try {
          await session.bot.sendPrivateMessage(request.userId, `❌ 您的入群申请被拒绝。\n目标群: ${request.groupId}${reason ? `\n原因: ${reason}` : ''}`);
        } catch {}
        return `✅ 已拒绝入群申请\n群号: ${request.groupId}\n申请人: ${request.userName}`;
      }

      // 处理群邀请
      try {
        if (session.bot.internal?.setGroupAddRequest) {
          await session.bot.internal.setGroupAddRequest(request.flag, request.subType, false, reason || '');
        } else if (request.session?.bot?.internal?.setGroupAddRequest) {
          await request.session.bot.internal.setGroupAddRequest(request.flag, request.subType, false, reason || '');
        } else {
          return '当前适配器不支持此操作';
        }
        pendingRequests.delete(requestId);
        return `✅ 已拒绝加入群: ${request.groupId}`;
      } catch (e: any) {
        logger.error(`拒绝入群失败: ${e.message}`);
        return `操作失败: ${e.message}`;
      }
    });

  ctx.command('查看邀请', '查看待处理的入群/加好友请求（仅管理员私聊）')
    .action(({ session }) => {
      // 只在私聊中生效
      if (session.guildId) return;
      if (!isAdmin(session)) return '您没有权限执行此操作';
      cleanupRequests();
      if (!pendingRequests.size) return '暂无待处理的请求。';
      const lines: string[] = ['📋 待处理请求列表：'];
      for (const [id, r] of pendingRequests.entries()) {
        if (r.type === 'friend-request') {
          lines.push(`${id}. 【好友请求】用户:${r.userId} 消息:${r.comment || '无'}`);
        } else if (r.type === 'user-request') {
          lines.push(`${id}. 【申请加群】群:${r.groupId} 用户:${r.userId}`);
        } else {
          lines.push(`${id}. 【邀请入群】群:${r.groupId} 邀请人:${r.userId}`);
        }
      }
      lines.push('\n回复「同意 <ID>」或「拒绝 <ID>」进行处理');
      return lines.join('\n');
    });

  ctx.command('退群 <groupId:string>', '让机器人退出指定群聊（仅管理员）')
    .action(async ({ session }, groupId) => {
      if (!isAdmin(session)) return '您没有权限执行此操作';
      if (!groupId || !/^\d+$/.test(groupId)) return '请输入正确的群号（纯数字）';
      try {
        if (session.bot.internal?.setGroupLeave) {
          await session.bot.internal.setGroupLeave(String(groupId), true);
          return `✅ 已退出群: ${groupId}`;
        }
        return '当前适配器不支持此操作';
      } catch (e: any) {
        logger.error(`退群失败: ${e.message}`);
        return `操作失败: ${e.message}`;
      }
    });

  // ================= 头衔管理 =================
  // 检查是否为群主
  const isGroupOwner = async (bot: any, groupId: string, userId: string): Promise<boolean> => {
    try {
      if (bot?.internal?.getGroupMemberInfo) {
        const info = await bot.internal.getGroupMemberInfo(groupId, userId, false);
        return info?.role === 'owner';
      }
    } catch {}
    return false;
  };

  // 检查用户是否是群管理员或群主
  const isGroupAdmin = async (bot: any, groupId: string, userId: string): Promise<boolean> => {
    try {
      if (bot?.internal?.getGroupMemberInfo) {
        const info = await bot.internal.getGroupMemberInfo(groupId, userId, false);
        return info?.role === 'owner' || info?.role === 'admin';
      }
    } catch {}
    return false;
  };

  // ================= 头衔管理功能 =================
  // 申请头衔（用户给自己设置）
  ctx.command('qqgm.申请头衔 <text:string>', '申请专属头衔')
    .alias('qqgm.sqtx')
    .usage('如：qqgm 申请头衔 恋恋')
    .action(async ({ session }, text) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      if (!text) return '请输入头衔内容';
      
      // 检查字节长度（最多18字节）
      if (new TextEncoder().encode(text).length > 18) {
        return '头衔太长啦！最多18字节（约6个汉字）';
      }
      
      const onebot = (session as any).onebot;
      if (!onebot || !onebot.setGroupSpecialTitle) {
        return '当前适配器不支持头衔功能';
      }
      
      try {
        await onebot.setGroupSpecialTitle(
          session.guildId,
          session.userId,
          text
        );
        return '✅ 已经改好啦~';
      } catch (e: any) {
        logger.error(`申请头衔失败: ${e.message}`, e);
        return `❌ 设置失败: ${e.message}`;
      }
    });

  // 修改头衔（管理员给他人设置）
  ctx.command('qqgm.修改头衔 <user:user> <text:string>', '修改他人头衔（需权限）')
    .alias('qqgm.xgtx')
    .usage('如：qqgm 修改头衔 @user 恋恋')
    .action(async ({ session }, user, text) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      // 权限检查
      if (!await requireManage(session)) {
        return '❌ 权限不足，此命令需要群管理员或以上权限';
      }
      
      if (!text) return '请输入头衔内容';
      if (!user) return '请指定目标用户';
      
      // 检查字节长度（最多18字节）
      if (new TextEncoder().encode(text).length > 18) {
        return '头衔太长啦！最多18字节（约6个汉字）';
      }
      
      // 解析用户ID
      const [platform, qqnum] = String(user).split(':');
      if (!qqnum) return '无法识别目标用户';
      
      const onebot = (session as any).onebot;
      if (!onebot || !onebot.setGroupSpecialTitle) {
        return '当前适配器不支持头衔功能';
      }
      
      try {
        await onebot.setGroupSpecialTitle(
          session.guildId,
          qqnum,
          text
        );
        return '✅ 已经改好啦~';
      } catch (e: any) {
        logger.error(`修改头衔失败: ${e.message}`, e);
        return `❌ 设置失败: ${e.message}`;
      }
    });

  // ================= 禁言/解禁功能 =================
  // 解析时间字符串，支持 秒/分/时/天 格式
  const parseTimeString = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const str = timeStr.trim().toLowerCase();
    
    // 匹配数字+单位格式
    const match = str.match(/^(\d+(?:\.\d+)?)\s*(秒|s|sec|seconds?|分|分钟|m|min|minutes?|时|小时|h|hour|hours?|天|日|d|day|days?)$/i);
    if (match) {
      const num = parseFloat(match[1]);
      const unit = match[2];
      if (unit.match(/秒|s|sec/i)) return Math.floor(num);
      if (unit.match(/分|m|min/i)) return Math.floor(num * 60);
      if (unit.match(/时|小时|h|hour/i)) return Math.floor(num * 3600);
      if (unit.match(/天|日|d|day/i)) return Math.floor(num * 86400);
    }
    
    // 纯数字默认为秒
    if (/^\d+$/.test(str)) return parseInt(str);
    
    return null;
  };

  // 最大禁言时间：29天23时59分59秒 = 2591999秒
  const MAX_MUTE_SECONDS = 29 * 86400 + 23 * 3600 + 59 * 60 + 59;

  ctx.command('qqgm.禁言 [user:string] [time:text]', '禁言群成员')
    .alias('qqgm.mute')
    .alias('qqgm.ban')
    .usage('管理员：qqgm.禁言 @用户 10分\n普通成员：qqgm.禁言 10分（自我禁言）')
    .action(async ({ session }, user, time) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      const groupId = String(session.guildId);
      const operatorId = String(session.userId || '');
      
      // 检查是否有管理员权限
      const hasAdminPerm = await requireManage(session);
      
      let targetUserId: string;
      let timeStr: string;
      
      if (hasAdminPerm && user) {
        // 管理员可以禁言他人
        targetUserId = user.replace(/^<at id="(\d+)".*\/>$/, '$1')
                          .replace(/^@/, '')
                          .replace(/[^\d]/g, '');
        timeStr = time || '';
      } else {
        // 普通成员只能禁言自己
        targetUserId = operatorId;
        timeStr = user || time || '';
      }
      
      if (!targetUserId || !/^\d+$/.test(targetUserId)) {
        return '无法识别目标用户';
      }
      
      if (!timeStr) return '请指定禁言时长，如：10秒、5分、1时、1天';
      
      const seconds = parseTimeString(timeStr);
      if (seconds === null || seconds <= 0) {
        return '无法解析时长，请使用格式如：10秒、5分、1时、1天';
      }
      
      if (seconds > MAX_MUTE_SECONDS) {
        return `禁言时长不能超过 29天23时59分59秒（${MAX_MUTE_SECONDS}秒）`;
      }
      
      const bot = session.bot as any;
      try {
        if (bot?.internal?.setGroupBan) {
          await bot.internal.setGroupBan(groupId, targetUserId, seconds);
        } else if (bot?.internal?.set_group_ban) {
          await bot.internal.set_group_ban({
            group_id: Number(groupId),
            user_id: Number(targetUserId),
            duration: seconds
          });
        } else {
          return '当前适配器不支持禁言操作';
        }
        
        // 格式化时长显示
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        const parts = [];
        if (days) parts.push(`${days}天`);
        if (hours) parts.push(`${hours}时`);
        if (mins) parts.push(`${mins}分`);
        if (secs) parts.push(`${secs}秒`);
        
        const isSelf = targetUserId === operatorId;
        return `🔇 已${isSelf ? '自我' : ''}禁言用户 ${targetUserId}，时长：${parts.join('')}`;
      } catch (e: any) {
        logger.error(`禁言失败: ${e.message}`);
        return `禁言失败: ${e.message}`;
      }
    });

  ctx.command('qqgm.解禁 <user:string>', '解除禁言')
    .alias('qqgm.unmute')
    .alias('qqgm.unban')
    .action(async ({ session }, user) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      // 权限检查
      if (!await requireManage(session)) {
        return '❌ 权限不足，此命令需要群管理员或以上权限';
      }
      
      const groupId = String(session.guildId);
      const operatorId = String(session.userId || '');
      
      if (!user) return '请指定要解禁的用户';
      
      const targetUserId = user.replace(/^<at id="(\d+)".*\/>$/, '$1')
                               .replace(/^@/, '')
                               .replace(/[^\d]/g, '');
      if (!targetUserId || !/^\d+$/.test(targetUserId)) {
        return '无法识别目标用户，请使用 @用户 或输入QQ号';
      }
      
      const bot = session.bot as any;
      try {
        // 禁言时长设为0即为解禁
        if (bot?.internal?.setGroupBan) {
          await bot.internal.setGroupBan(groupId, targetUserId, 0);
        } else if (bot?.internal?.set_group_ban) {
          await bot.internal.set_group_ban({
            group_id: Number(groupId),
            user_id: Number(targetUserId),
            duration: 0
          });
        } else {
          return '当前适配器不支持解禁操作';
        }
        return `✅ 已解除用户 ${targetUserId} 的禁言`;
      } catch (e: any) {
        logger.error(`解禁失败: ${e.message}`);
        return `解禁失败: ${e.message}`;
      }
    });

  // ================= 批量撤回功能 =================
  // 智能解析时间，支持省略年月日
  const parseSmartDateTime = (str: string): Date | null => {
    if (!str) return null;
    const now = new Date();
    
    // 完整格式：2024年1月1日12时30分 或 2024-01-01 12:30
    let match = str.match(/(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日号]?\s*(\d{1,2})[时点:](\d{1,2})分?/);
    if (match) {
      return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]);
    }
    
    // 省略年：1月1日12时30分
    match = str.match(/(\d{1,2})[月\-\/](\d{1,2})[日号]?\s*(\d{1,2})[时点:](\d{1,2})分?/);
    if (match) {
      return new Date(now.getFullYear(), +match[1] - 1, +match[2], +match[3], +match[4]);
    }
    
    // 省略年月：1日12时30分
    match = str.match(/(\d{1,2})[日号]\s*(\d{1,2})[时点:](\d{1,2})分?/);
    if (match) {
      return new Date(now.getFullYear(), now.getMonth(), +match[1], +match[2], +match[3]);
    }
    
    // 省略年月日：12时30分 或 12:30
    match = str.match(/(\d{1,2})[时点:](\d{1,2})分?/);
    if (match) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), +match[1], +match[2]);
    }
    
    // 只有时：12时
    match = str.match(/(\d{1,2})[时点]$/);
    if (match) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), +match[1], 0);
    }
    
    return null;
  };

  ctx.command('qqgm.撤回 [user:string] [startTime:string] [endTime:string]', '批量撤回消息')
    .alias('qqgm.recall')
    .usage(`管理员：qqgm.撤回 @用户 12时30分 13时30分
普通成员：qqgm.撤回 12时30分 13时30分（撤回自己的消息）
时间格式支持省略：
  - 12时30分（今天）
  - 1日12时30分（本月1日）
  - 1月1日12时30分（今年）
  - 2024年1月1日12时30分（完整格式）`)
    .action(async ({ session }, user, startTime, endTime) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      const groupId = String(session.guildId);
      const operatorId = String(session.userId || '');
      
      // 检查是否有管理员权限
      const hasAdminPerm = await requireManage(session);
      
      let targetUserId: string;
      let startStr: string;
      let endStr: string;
      
      if (hasAdminPerm && user) {
        // 尝试判断第一个参数是否是用户
        const possibleUserId = user.replace(/^<at id="(\d+)".*\/>$/, '$1')
                                   .replace(/^@/, '')
                                   .replace(/[^\d]/g, '');
        if (/^\d{5,}$/.test(possibleUserId)) {
          // 是QQ号
          targetUserId = possibleUserId;
          startStr = startTime || '';
          endStr = endTime || '';
        } else {
          // 第一个参数不是用户，是时间
          targetUserId = operatorId;
          startStr = user || '';
          endStr = startTime || '';
        }
      } else {
        // 普通成员只能撤回自己的
        targetUserId = operatorId;
        startStr = user || '';
        endStr = startTime || '';
      }
      
      if (!targetUserId || !/^\d+$/.test(targetUserId)) {
        return '无法识别目标用户';
      }
      
      // 如果不是管理员且目标不是自己，拒绝
      if (!hasAdminPerm && targetUserId !== operatorId) {
        return '您只能撤回自己的消息';
      }
      
      const startDate = parseSmartDateTime(startStr);
      const endDate = parseSmartDateTime(endStr);
      
      if (!startDate) return '无法解析开始时间，请使用格式如：12时30分、1日12时、1月1日12时30分';
      if (!endDate) return '无法解析结束时间，请使用格式如：12时30分、1日12时、1月1日12时30分';
      
      if (startDate >= endDate) {
        return '开始时间必须早于结束时间';
      }
      
      // 时间范围不能超过7天
      const maxRange = 7 * 24 * 60 * 60 * 1000;
      if (endDate.getTime() - startDate.getTime() > maxRange) {
        return '时间范围不能超过7天';
      }
      
      const bot = session.bot as any;
      
      try {
        // 获取群消息历史
        let messages: any[] = [];
        
        if (bot?.internal?.getGroupMsgHistory) {
          // 尝试获取消息历史（部分 OneBot 实现支持）
          const history = await bot.internal.getGroupMsgHistory(groupId, 0);
          messages = history?.messages || [];
        } else if (bot?.internal?.get_group_msg_history) {
          const history = await bot.internal.get_group_msg_history({ group_id: Number(groupId), message_seq: 0 });
          messages = history?.messages || [];
        } else {
          return '当前适配器不支持获取消息历史，无法批量撤回';
        }
        
        // 筛选目标用户在时间范围内的消息
        const startTs = startDate.getTime() / 1000;
        const endTs = endDate.getTime() / 1000;
        
        const toRecall = messages.filter((msg: any) => {
          const senderId = String(msg?.sender?.user_id || msg?.user_id || '');
          const msgTime = Number(msg?.time || 0);
          return senderId === targetUserId && msgTime >= startTs && msgTime <= endTs;
        });
        
        if (!toRecall.length) {
          return `未找到用户 ${targetUserId} 在 ${startStr} 至 ${endStr} 期间的消息`;
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (const msg of toRecall) {
          const msgId = msg?.message_id;
          if (!msgId) continue;
          
          try {
            if (bot?.internal?.deleteMsg) {
              await bot.internal.deleteMsg(msgId);
              successCount++;
            } else if (bot?.internal?.delete_msg) {
              await bot.internal.delete_msg({ message_id: msgId });
              successCount++;
            }
          } catch {
            failCount++;
          }
          
          // 避免请求过快
          await new Promise(r => setTimeout(r, 100));
        }
        
        return `✅ 批量撤回完成\n目标用户：${targetUserId}\n时间范围：${startDate.toLocaleString()} ~ ${endDate.toLocaleString()}\n成功：${successCount} 条，失败：${failCount} 条`;
      } catch (e: any) {
        logger.error(`批量撤回失败: ${e.message}`);
        return `批量撤回失败: ${e.message}`;
      }
    });

  // === 入群验证/进退群通知 ===
  const pendingVerify = new Map<string, { answers: string[]; expire: number; kickOnFail: boolean }>();

  ctx.on('guild-member-added', async (session) => {
    logger.debug(`收到 guild-member-added 事件 - 平台:${session.platform} 群:${session.guildId} 用户:${session.userId}`);
    
    if (session.platform !== 'onebot' || !session.guildId) {
      logger.debug('非 OneBot 平台或无群ID，跳过');
      return;
    }
    
    const group = getGroup(session.guildId);
    logger.debug(`群配置: ${group ? JSON.stringify({ enabled: group.enabled, joinNotice: group.joinNotice, joinVerify: group.joinVerify, welcomeGuide: group.welcomeGuide }) : '未找到'}`);
    
    if (!group || group.enabled === false) {
      logger.debug(`群 ${session.guildId} 未配置或已禁用`);
      return;
    }

    const userId = String(session.userId || '');
    const groupName = String((session as any).guildName || session.guildId);

    // 黑名单用户直接踢
    if (inList(group.blacklist || [], userId)) {
      logger.info(`踢出黑名单新成员 ${userId} 从群 ${session.guildId}`);
      await onebotCall(session.bot, 'set_group_kick', {
        group_id: String(session.guildId),
        user_id: String(userId),
        reject_add_request: false,
      });
      return;
    }

    // 入群通知
    if (group.joinNotice?.enabled) {
      logger.info(`发送入群通知 - 群:${session.guildId} 用户:${userId}`);
      const text = formatTemplate(group.joinNotice.template || '欢迎 {user} 加入 {group}', { user: userId, group: groupName });
      try {
        await session.send(text);
      } catch (e: any) {
        logger.warn(`入群通知发送失败: ${e.message}`);
      }
    }

    // 入群验证
    if (group.joinVerify?.enabled) {
      logger.info(`启动入群验证 - 群:${session.guildId} 用户:${userId}`);
      const pool = Array.isArray(group.joinVerify.questionPool) ? group.joinVerify.questionPool : [];
      if (pool.length === 0) {
        logger.warn(`群 ${session.guildId} 入群验证已启用但题库为空`);
      } else {
        const qa = pool[Math.floor(Math.random() * pool.length)];
        const q = qa.q;
        // 答案数组，支持多个正确答案
        const answers = Array.isArray(qa.a) ? qa.a.map(x => String(x).trim().toLowerCase()) : [String(qa.a).trim().toLowerCase()];
        const timeout = Number(group.joinVerify.timeoutSeconds || 120) * 1000;
        const kickOnFail = group.joinVerify.kickOnFail !== false;
        
        pendingVerify.set(`${session.guildId}:${userId}`, { 
          answers, 
          expire: Date.now() + timeout,
          kickOnFail 
        });
        try {
          await session.send(`${h.at(userId)} ${q}`);
        } catch (e: any) {
          logger.warn(`验证问题发送失败: ${e.message}`);
        }
        setTimeout(() => {
          const key = `${session.guildId}:${userId}`;
          const data = pendingVerify.get(key);
          if (data && Date.now() > data.expire) {
            logger.info(`验证超时 - 用户 ${userId} 群 ${session.guildId}`);
            pendingVerify.delete(key);
            if (data.kickOnFail) {
              onebotCall(session.bot, 'set_group_kick', {
                group_id: String(session.guildId),
                user_id: String(userId),
                reject_add_request: false,
              });
            }
          }
        }, timeout + 2000);
      }
    }

    // 欢迎引导
    if (group.welcomeGuide?.enabled) {
      logger.info(`发送欢迎引导 - 群:${session.guildId} 用户:${userId}`);
      try {
        if (group.welcomeGuide.image) {
          await session.send(h.image(group.welcomeGuide.image));
        }
        if (group.welcomeGuide.text) {
          await session.send(group.welcomeGuide.text);
        }
      } catch (e: any) {
        logger.warn(`欢迎引导发送失败: ${e.message}`);
      }
    }
  });

  ctx.on('guild-member-removed', async (session) => {
    logger.debug(`收到 guild-member-removed 事件 - 平台:${session.platform} 群:${session.guildId} 用户:${session.userId}`);
    
    if (session.platform !== 'onebot' || !session.guildId) return;
    
    const group = getGroup(session.guildId);
    if (!group || group.enabled === false) {
      logger.debug(`群 ${session.guildId} 未配置或已禁用`);
      return;
    }
    
    if (group.leaveNotice?.enabled) {
      logger.info(`发送退群通知 - 群:${session.guildId} 用户:${session.userId}`);
      const userId = String(session.userId || '');
      const groupName = String((session as any).guildName || session.guildId);
      const text = formatTemplate(group.leaveNotice.template || '{user} 已退出 {group}', { user: userId, group: groupName });
      try {
        await session.send(text);
      } catch (e: any) {
        logger.warn(`退群通知发送失败: ${e.message}`);
      }
    }
  });

  // 入群验证中间件 - 需要在主中间件之前执行
  ctx.middleware(async (session, next) => {
    if (session.platform !== 'onebot' || !session.guildId || !session.userId) return next();
    const key = `${session.guildId}:${session.userId}`;
    const pending = pendingVerify.get(key);
    if (!pending) return next();
    
    const content = String(session.content || '').trim();
    if (!content) return next();
    
    logger.debug(`验证回答检测 - 群:${session.guildId} 用户:${session.userId} 回答:${content}`);
    
    if (Date.now() > pending.expire) {
      pendingVerify.delete(key);
      await session.send('验证超时，请重新验证。');
      return;
    }
    
    // 答案匹配（忽略大小写和首尾空格，支持多个正确答案）
    const userAnswer = content.toLowerCase();
    if (pending.answers.some(ans => ans === userAnswer)) {
      logger.info(`验证通过 - 群:${session.guildId} 用户:${session.userId}`);
      pendingVerify.delete(key);
      await session.send('验证通过，欢迎加入！');
      return;
    } else {
      logger.debug(`验证失败 - 群:${session.guildId} 用户:${session.userId} 期望:${pending.answers.join('/')} 实际:${content}`);
      await session.send('验证失败，请重新回答。');
      return;
    }
  }, true);

  // === 指令：helpme 帮助菜单（图片版） ===
  ctx.command('qqgm.helpme', '显示所有命令和详细说明（图片）')
    .alias('qqgm.help')
    .alias('qqgm.?')
    .action(async ({ session }) => {
      const helpHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 900px;
      margin: 0 auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      text-align: center;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 3px solid #667eea;
    }
    .header h1 {
      font-size: 32px;
      color: #667eea;
      margin-bottom: 8px;
      font-weight: bold;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      margin-bottom: 12px;
      padding-left: 12px;
      border-left: 4px solid #667eea;
    }
    .command {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 12px;
      border-left: 3px solid #667eea;
    }
    .command-name {
      font-size: 16px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 6px;
    }
    .command-desc {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 6px;
    }
    .command-detail {
      font-size: 12px;
      color: #888;
      line-height: 1.7;
      margin-left: 8px;
    }
    .command-example {
      background: #e9ecef;
      border-radius: 4px;
      padding: 6px 10px;
      margin-top: 6px;
      font-size: 12px;
      color: #495057;
      font-family: 'Consolas', monospace;
    }
    .config-item {
      font-size: 12px;
      color: #495057;
      line-height: 1.8;
      margin-left: 16px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid #e9ecef;
      text-align: center;
      color: #888;
      font-size: 13px;
    }
    .tip {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      border-radius: 6px;
      color: #856404;
      font-size: 13px;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 QQ群管插件指令大全</h1>
      <p>完整功能说明 | 支持热重载配置</p>
    </div>

    <div class="section">
      <div class="section-title">📖 帮助信息</div>
      <div class="command">
        <div class="command-name">qqgm helpme / qqgm help / qqgm ?</div>
        <div class="command-desc">显示本帮助菜单（图片格式）</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">👥 成员管理</div>
      <div class="command">
        <div class="command-name">qqgm 禁言 [@用户] &lt;时长&gt;</div>
        <div class="command-desc">禁言群成员（支持自我禁言）</div>
        <div class="command-detail">
          <b>别名:</b> mute, ban<br>
          <b>参数:</b> 时长格式如 10秒、5分、1时、1天<br>
          <b>权限:</b> 管理员可禁言他人，普通用户可自我禁言
        </div>
        <div class="command-example">qqgm 禁言 @张三 10分 | qqgm 禁言 30分</div>
      </div>
      <div class="command">
        <div class="command-name">qqgm 解禁 &lt;@用户&gt;</div>
        <div class="command-desc">解除禁言</div>
        <div class="command-detail">
          <b>别名:</b> unmute, unban<br>
          <b>权限:</b> 需要群管理员权限
        </div>
        <div class="command-example">qqgm 解禁 @张三</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">💬 消息管理</div>
      <div class="command">
        <div class="command-name">qqgm 撤回 &lt;时间&gt;</div>
        <div class="command-desc">批量撤回指定时间后的消息</div>
        <div class="command-detail">
          <b>别名:</b> recall, delete<br>
          <b>参数:</b> 支持多种时间格式<br>
          • 完整: 2024年1月1日12时30分<br>
          • 简写: 1月1日12时30分、1日12时30分<br>
          • 时间: 12时30分、12点30分、12:30
        </div>
        <div class="command-example">qqgm 撤回 今天12点 | qqgm 撤回 1小时前</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🏆 头衔管理</div>
      <div class="command">
        <div class="command-name">qqgm 申请头衔 &lt;头衔内容&gt;</div>
        <div class="command-desc">为自己设置专属头衔</div>
        <div class="command-detail">
          <b>别名:</b> sqtx<br>
          <b>限制:</b> 最多18字节（约6个汉字）<br>
          <b>权限:</b> 所有成员可用
        </div>
        <div class="command-example">qqgm 申请头衔 活跃成员 | qqgm sqtx 恋恋</div>
      </div>
      <div class="command">
        <div class="command-name">qqgm 修改头衔 &lt;@用户&gt; &lt;头衔内容&gt;</div>
        <div class="command-desc">修改他人头衔（管理员）</div>
        <div class="command-detail">
          <b>别名:</b> xgtx<br>
          <b>限制:</b> 最多18字节（约6个汉字）<br>
          <b>权限:</b> 需要群管理员权限
        </div>
        <div class="command-example">qqgm 修改头衔 @张三 优秀成员</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">⚙️ 配置管理</div>
      <div class="command">
        <div class="command-name">qqgm config &lt;配置项&gt; &lt;操作&gt; [值]</div>
        <div class="command-desc">动态修改群组配置（热重载）</div>
        <div class="command-detail">
          <b>操作类型:</b> get, enable, disable, set, add, remove<br>
          <b>配置项:</b>
          <div class="config-item">
            • <b>forbidden</b> - 违禁词检测（仅文字，图片用imageModeration）<br>
            • <b>spam</b> - 刷屏检测 (enabled, windowSeconds, maxMessages)<br>
            • <b>penalty</b> - 多级处罚 (enabled, windowSeconds)<br>
            • <b>joinVerify</b> - 进群验证 (enabled, questionPool, timeoutSeconds, kickOnFail)<br>
            • <b>joinNotice</b> - 入群通知 (enabled, template)<br>
            • <b>leaveNotice</b> - 退群通知 (enabled, template)<br>
            • <b>autoRecall</b> - 自动撤回 (enabled)<br>
            • <b>atAll</b> - 艾特全体 (enabled, cooldownSeconds)<br>
            • <b>成员名单</b> - whitelist, blacklist, graylist（管理员通过API自动判断）
          </div>
        </div>
        <div class="command-example">
          qqgm config forbidden enable<br>
          qqgm config forbidden.muteSeconds set 300<br>
          qqgm config forbidden.words add 脏话<br>
          qqgm config whitelist add 123456789
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🔧 其他功能</div>
      <div class="command">
        <div class="command-name">qqgm announce &lt;内容&gt;</div>
        <div class="command-desc">设置并发送群公告</div>
        <div class="command-detail">
          <b>权限:</b> 需要群管理员权限
        </div>
        <div class="command-example">qqgm announce 今晚8点群活动，请大家准时参加！</div>
      </div>
      <div class="command">
        <div class="command-name">qqgm atall &lt;内容&gt;</div>
        <div class="command-desc">艾特全体（需启用并冷却结束）</div>
        <div class="command-detail">
          <b>权限:</b> 需要群管理员权限<br>
          <b>冷却:</b> 默认1小时（可配置）
        </div>
        <div class="command-example">qqgm atall 紧急通知：今晚服务器维护</div>
      </div>
      <div class="command">
        <div class="command-name">qqgm appeal &lt;内容&gt;</div>
        <div class="command-desc">提交申诉</div>
        <div class="command-example">qqgm appeal 我刚才发的不是违规内容，请求解除禁言</div>
      </div>
      <div class="command">
        <div class="command-name">qqgm records</div>
        <div class="command-desc">查看本群处罚记录</div>
        <div class="command-example">qqgm records</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🤖 机器人管理员命令（私聊）</div>
      <div class="command">
        <div class="command-name">申请加群 &lt;群号&gt;</div>
        <div class="command-desc">向管理员申请让机器人加入指定群</div>
        <div class="command-example">申请加群 123456789</div>
      </div>
      <div class="command">
        <div class="command-name">同意 &lt;请求ID&gt; [备注]</div>
        <div class="command-desc">同意入群/加好友请求</div>
        <div class="command-detail">
          <b>使用场景:</b> 仅限私聊使用<br>
          <b>说明:</b> 备注参数仅对好友请求有效
        </div>
        <div class="command-example">同意 1 | 同意 2 好友备注</div>
      </div>
      <div class="command">
        <div class="command-name">拒绝 &lt;请求ID&gt; [原因]</div>
        <div class="command-desc">拒绝入群/加好友请求</div>
        <div class="command-detail">
          <b>使用场景:</b> 仅限私聊使用<br>
          <b>说明:</b> 原因参数仅对入群请求有效
        </div>
        <div class="command-example">拒绝 1 | 拒绝 2 群已满</div>
      </div>
      <div class="command">
        <div class="command-name">查看邀请</div>
        <div class="command-desc">查看待处理的所有请求</div>
        <div class="command-detail">
          <b>使用场景:</b> 仅限私聊使用
        </div>
        <div class="command-example">查看邀请</div>
      </div>
      <div class="command">
        <div class="command-name">qqgm login</div>
        <div class="command-desc">生成管理面板登录密码（私聊发送）</div>
        <div class="command-example">qqgm login</div>
      </div>
    </div>

    <div class="tip">
      💡 <b>提示：</b>使用 qqgm config 可动态修改配置，修改后立即生效，无需重启插件！<br>
      💡 <b>注意：</b>命令中的 qqgm 后方使用空格而非点号，例如：qqgm 禁言 而不是 qqgm.禁言<br>
      💡 <b>私聊命令：</b>「同意」「拒绝」「查看邀请」仅限机器人管理员在私聊中使用
    </div>

    <div class="footer">
      QQ群管插件 v0.1.0 | 模板变量: {user}=用户ID, {group}=群名
    </div>
  </div>
</body>
</html>`;

      try {
        // 尝试使用 puppeteer 渲染为图片
        const puppeteer = (ctx as any).puppeteer;
        if (puppeteer) {
          const page = await puppeteer.page();
          await page.setContent(helpHtml);
          await page.setViewport({ width: 950, height: 100 });
          
          // 等待内容加载完成
          await page.waitForSelector('.container');
          
          // 获取实际内容高度
          const bodyHeight = await page.evaluate(() => {
            return document.body.scrollHeight;
          });
          
          // 调整视口高度
          await page.setViewport({ width: 950, height: bodyHeight });
          
          // 截图
          const screenshot = await page.screenshot({ type: 'png', fullPage: true });
          await page.close();
          
          return h.image(screenshot, 'image/png');
        } else {
          // 如果没有 puppeteer，返回提示信息
          return '❌ 未检测到 puppeteer 服务，无法生成帮助图片。\n请安装 @koishijs/plugin-puppeteer 插件后重试。\n\n或访问在线文档查看完整帮助。';
        }
      } catch (e: any) {
        logger.error(`生成帮助图片失败: ${e.message}`);
        return `生成帮助图片失败: ${e.message}\n\n建议：\n1. 确保已安装 @koishijs/plugin-puppeteer\n2. 检查 puppeteer 服务是否正常运行\n3. 查看控制台日志了解详细错误`;
      }
    });

  // === 指令：动态配置管理 ===
  ctx.command('qqgm.config <path:string> <operation:string> [value:text]', '动态修改群组配置')
    .usage('格式: qqgm config <配置项> <操作> [值]\n操作: get/enable/disable/set/add/remove')
    .action(async ({ session }, path, operation, value) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      // 权限检查
      if (!await requireManage(session)) {
        return '❌ 权限不足，此命令需要群管理员或以上权限';
      }

      const groupId = String(session.guildId);

      if (!path || !operation) {
        return '参数不足。\n格式：qqgm config <配置项> <操作> [值]\n操作：get/enable/disable/set/add/remove\n\n示例：\n  qqgm config forbidden enable\n  qqgm config forbidden.muteSeconds set 300\n  qqgm config whitelist add 123456789';
      }

      const targetGroup = ensureGroup(groupId);
      const pathParts = path.split('.');
      
      // 解析配置路径，支持嵌套属性
      const getValue = (obj: any, parts: string[]): any => {
        let current = obj;
        for (const part of parts) {
          if (current == null) return undefined;
          current = current[part];
        }
        return current;
      };
      
      const setValue = (obj: any, parts: string[], value: any): void => {
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (current[part] == null) current[part] = {};
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
      };

      try {
        const op = operation.toLowerCase();
        
        // GET 操作：查看配置
        if (op === 'get' || op === 'show' || op === 'view') {
          const value = getValue(targetGroup, pathParts);
          if (value === undefined) {
            return `配置项 "${path}" 不存在`;
          }
          const formatted = typeof value === 'object' 
            ? JSON.stringify(value, null, 2) 
            : String(value);
          return `配置项 "${path}" 的值：\n${formatted}`;
        }
        
        // ENABLE 操作：启用功能
        if (op === 'enable' || op === 'on') {
          const enablePath = pathParts[pathParts.length - 1] === 'enabled' 
            ? pathParts 
            : [...pathParts, 'enabled'];
          setValue(targetGroup, enablePath, true);
          await doSaveConfig();
          ctx.scope.update(config, true);  // 热重载配置
          return `✅ 已启用 "${path}"`;
        }
        
        // DISABLE 操作：禁用功能
        if (op === 'disable' || op === 'off') {
          const enablePath = pathParts[pathParts.length - 1] === 'enabled' 
            ? pathParts 
            : [...pathParts, 'enabled'];
          setValue(targetGroup, enablePath, false);
          await doSaveConfig();
          ctx.scope.update(config, true);  // 热重载配置
          return `✅ 已禁用 "${path}"`;
        }
        
        // SET 操作：设置值
        if (op === 'set') {
          if (!value) {
            return '请提供要设置的值';
          }
          const valueStr = value;
          
          // 智能类型转换
          let newValue: any = valueStr;
          if (valueStr === 'true') newValue = true;
          else if (valueStr === 'false') newValue = false;
          else if (/^\d+$/.test(valueStr)) newValue = parseInt(valueStr);
          else if (/^\d+\.\d+$/.test(valueStr)) newValue = parseFloat(valueStr);
          
          setValue(targetGroup, pathParts, newValue);
          await doSaveConfig();
          ctx.scope.update(config, true);  // 热重载配置
          return `✅ 已将 "${path}" 设置为：${newValue}`;
        }
        
        // ADD 操作：添加到数组
        if (op === 'add' || op === 'append') {
          if (!value) {
            return '请提供要添加的项';
          }
          const currentValue = getValue(targetGroup, pathParts);
          if (!Array.isArray(currentValue)) {
            return `配置项 "${path}" 不是数组类型，无法添加项`;
          }
          
          const itemsToAdd = value.split(/[\s,]+/).filter(x => x);
          const addedItems: string[] = [];
          
          for (const item of itemsToAdd) {
            if (!currentValue.includes(item)) {
              currentValue.push(item);
              addedItems.push(item);
            }
          }
          
          if (addedItems.length === 0) {
            return '所有项都已存在，无需添加';
          }
          
          setValue(targetGroup, pathParts, currentValue);
          await doSaveConfig();
          ctx.scope.update(config, true);  // 热重载配置
          return `✅ 已添加到 "${path}"：${addedItems.join(', ')}`;
        }
        
        // REMOVE 操作：从数组删除
        if (op === 'remove' || op === 'rm' || op === 'delete' || op === 'del') {
          if (!value) {
            return '请提供要删除的项';
          }
          const currentValue = getValue(targetGroup, pathParts);
          if (!Array.isArray(currentValue)) {
            return `配置项 "${path}" 不是数组类型，无法删除项`;
          }
          
          const itemsToRemove = value.split(/[\s,]+/).filter(x => x);
          const removedItems: string[] = [];
          
          for (const item of itemsToRemove) {
            const index = currentValue.indexOf(item);
            if (index !== -1) {
              currentValue.splice(index, 1);
              removedItems.push(item);
            }
          }
          
          if (removedItems.length === 0) {
            return '未找到要删除的项';
          }
          
          setValue(targetGroup, pathParts, currentValue);
          await doSaveConfig();
          ctx.scope.update(config, true);  // 热重载配置
          return `✅ 已从 "${path}" 删除：${removedItems.join(', ')}`;
        }
        
        return `未知操作：${operation}\n支持的操作：get, enable, disable, set, add, remove`;
        
      } catch (e: any) {
        logger.error(`配置操作失败: ${e.message}`, e);
        return `配置操作失败: ${e.message}`;
      }
    });

  // === 指令：公告、@全体、登录 ===
  const atAllCooldown = new Map<string, number>();

  ctx.command('qqgm.announce <text:text>', '设置并发送群公告')
    .action(async ({ session }, text) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊。';
      
      // 权限检查
      if (!await requireManage(session)) {
        return '❌ 权限不足，此命令需要群管理员或以上权限';
      }
      const group = ensureGroup(session.guildId);
      if (!text) return '请输入公告内容。';
      group.announcement.enabled = true;
      group.announcement.text = text;
      await doSaveConfig();
      await session.send(`群公告：${text}`);
      return '已更新公告。';
    });

  ctx.command('qqgm.atall <text:text>', '群艾特全体')
    .action(async ({ session }, text) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊。';
      
      // 权限检查
      if (!await requireManage(session)) {
        return '❌ 权限不足，此命令需要群管理员或以上权限';
      }
      const group = ensureGroup(session.guildId);
      if (!group.atAll?.enabled) return '本群未启用艾特全体功能。';
      const cooldown = Number(group.atAll.cooldownSeconds || 3600) * 1000;
      const last = atAllCooldown.get(session.guildId) || 0;
      if (Date.now() - last < cooldown) return '艾特全体冷却中。';
      atAllCooldown.set(session.guildId, Date.now());
      await session.send(h.at('all') + (text ? ` ${text}` : ''));
      return;
    });

  // === Web 控制：简单登录与配置接口 ===
  const webPasswords = new Map<string, { password: string; createdAt: number }>();

  const genWebPassword = () => crypto.randomBytes(4).toString('hex');

  // 暴露给 Web 模块
  (ctx as any).qqgmWebPasswords = webPasswords;
  
  // 获取永久密码（从配置中）
  const getAdminPassword = (groupId: string, userId: string): string | null => {
    const list = (config as any).adminPasswords || [];
    const item = list.find((p: any) => p.groupId === groupId && p.userId === userId);
    return item?.password || null;
  };
  
  // 设置永久密码
  const setAdminPassword = async (groupId: string, userId: string, password: string) => {
    if (!(config as any).adminPasswords) {
      (config as any).adminPasswords = [];
    }
    const list = (config as any).adminPasswords;
    const existingIdx = list.findIndex((p: any) => p.groupId === groupId && p.userId === userId);
    
    // 使用 sha256 加密存储
    const hashedPwd = crypto.createHash('sha256').update(password).digest('hex');
    
    if (existingIdx >= 0) {
      list[existingIdx] = { groupId, userId, password: hashedPwd, createdAt: Date.now() };
    } else {
      list.push({ groupId, userId, password: hashedPwd, createdAt: Date.now() });
    }
    await doSaveConfig();
  };
  
  // 删除永久密码
  const removeAdminPassword = async (groupId: string, userId: string) => {
    if (!(config as any).adminPasswords) return;
    const list = (config as any).adminPasswords;
    const idx = list.findIndex((p: any) => p.groupId === groupId && p.userId === userId);
    if (idx >= 0) {
      list.splice(idx, 1);
      await doSaveConfig();
    }
  };
  
  // 验证永久密码
  const verifyAdminPassword = (groupId: string, userId: string, password: string): boolean => {
    const stored = getAdminPassword(groupId, userId);
    if (!stored) return false;
    const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
    return stored === hashedInput;
  };
  
  // 暴露永久密码相关函数给 Web 模块
  (ctx as any).qqgmAdminPassword = {
    get: getAdminPassword,
    set: setAdminPassword,
    remove: removeAdminPassword,
    verify: verifyAdminPassword,
  };

  // 获取 Web 管理地址
  const getWebUrl = (): { url: string | null, warning: string | null } => {
    const webConfig = config.web || {};
    let warning: string | null = null;
    
    // 如果配置了 host（域名或 IP:端口），直接使用
    if (webConfig.host) {
      let host = webConfig.host.trim();
      // 移除末尾的斜杠
      host = host.replace(/\/+$/, '');
      // 如果没有协议头，添加 http://
      if (!host.startsWith('http://') && !host.startsWith('https://')) {
        host = 'http://' + host;
      }
      // 直接返回 {配置的地址}/qqgm
      return { url: `${host}/qqgm`, warning: null };
    }
    
    // 没有配置 host，尝试自动检测 IP
    if (webConfig.autoDetectIP !== false) {
      const detected = detectPublicAddress(webConfig.preferIPv6 !== false);
      if (detected.address) {
        let host = detected.address;
        if (detected.type === 'local') {
          warning = '⚠️ 未检测到公网 IP，使用内网地址（仅限局域网访问）';
        }
        
        // 自动检测的 IP 需要拼接端口
        let port = 5140;
        try {
          if ((ctx as any).server?.config?.port) {
            port = (ctx as any).server.config.port;
          }
        } catch {}
        
        return { url: `http://${host}:${port}/qqgm`, warning };
      }
    }
    
    return { url: null, warning: '❌ 无法检测公网地址，请在配置中手动设置 host' };
  };

  ctx.command('qqgm.login', '生成群管理登录链接')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId || !session.userId) return '仅限群聊。';
      
      // 权限检查 - 只有管理员以上才能登录
      const roleLevel = await getRoleLevelAsync(session);
      if (roleLevel < 2) {
        return '❌ 权限不足，仅群管理员或以上可使用 Web 管理';
      }
      
      // 检查 Web 是否可用
      const { url: webUrl, warning } = getWebUrl();
      if (!webUrl) {
        return warning || '❌ Web 管理功能不可用';
      }
      
      // 检查是否已设置永久密码
      const hasPermanent = getAdminPassword(session.guildId, String(session.userId)) !== null;
      
      const pwd = genWebPassword();
      const key = `${session.guildId}:${session.userId}`;
      webPasswords.set(key, { password: pwd, createdAt: Date.now() });
      
      // 5分钟后过期
      setTimeout(() => {
        const stored = webPasswords.get(key);
        if (stored && Date.now() - stored.createdAt >= 5 * 60 * 1000) {
          webPasswords.delete(key);
        }
      }, 5 * 60 * 1000);
      
      try {
        const msgLines = [
          '🔐 群管理 Web 登录信息',
          '━━━━━━━━━━━━━━━',
          `群号: ${session.guildId}`,
          `QQ号: ${session.userId}`,
          `临时密码: ${pwd}`,
          '━━━━━━━━━━━━━━━',
          `管理页面: ${webUrl}`,
          '',
          '⏰ 临时密码 5 分钟内有效，登录后保持 2 小时',
        ];
        
        if (hasPermanent) {
          msgLines.push('💡 您已设置永久密码，可直接使用永久密码登录');
        } else {
          msgLines.push('💡 使用 qqgm.setpwd <密码> 设置永久密码');
        }
        
        if (warning) {
          msgLines.push('', warning);
        }
        
        await session.bot.sendPrivateMessage(session.userId, msgLines.join('\n'));
        return '✅ 已私聊发送登录信息，请查收。';
      } catch {
        const lines = [`临时密码: ${pwd}`, `地址: ${webUrl}`, '（私聊发送失败，请手动记录）'];
        if (warning) lines.push(warning);
        return lines.join('\n');
      }
    });

  ctx.command('qqgm.setpwd <groupId:string> <password:string>', '设置 Web 管理永久密码（私聊使用）')
    .action(async ({ session }, groupId, password) => {
      if (session.platform !== 'onebot' || !session.userId) return '仅限 OneBot 平台。';
      
      // 必须在私聊中使用
      if (session.guildId) {
        return '⚠️ 为保护密码安全，请在私聊中使用此命令\n格式：qqgm.setpwd <群号> <密码>';
      }
      
      if (!groupId || !password) {
        return '用法：qqgm.setpwd <群号> <密码>\n例如：qqgm.setpwd 123456789 mypassword';
      }
      
      if (!/^\d+$/.test(groupId)) {
        return '❌ 群号格式错误';
      }
      
      // 验证用户是否是该群的管理员
      const bot = session.bot as any;
      if (!bot?.internal?.getGroupMemberInfo) {
        return '❌ 无法验证身份';
      }
      
      try {
        const info = await bot.internal.getGroupMemberInfo(groupId, session.userId, false);
        if (!info || (info.role !== 'owner' && info.role !== 'admin')) {
          // 也检查是否是机器人管理员
          if (!Array.isArray(config.admins) || !config.admins.includes(String(session.userId))) {
            return '❌ 您不是该群的管理员';
          }
        }
      } catch (e: any) {
        return `❌ 验证身份失败: ${e.message}`;
      }
      
      if (password.length < 6) {
        return '❌ 密码长度至少 6 位';
      }
      
      if (password.length > 32) {
        return '❌ 密码长度不能超过 32 位';
      }
      
      try {
        await setAdminPassword(groupId, String(session.userId), password);
        return `✅ 永久密码已设置\n群号: ${groupId}\n\n使用此密码登录后无时间限制\n如需修改，再次使用此命令`;
      } catch (e: any) {
        return `❌ 设置失败: ${e.message}`;
      }
    });

  ctx.command('qqgm.delpwd <groupId:string>', '删除 Web 管理永久密码（私聊使用）')
    .action(async ({ session }, groupId) => {
      if (session.platform !== 'onebot' || !session.userId) return '仅限 OneBot 平台。';
      
      // 必须在私聊中使用
      if (session.guildId) {
        return '⚠️ 请在私聊中使用此命令\n格式：qqgm.delpwd <群号>';
      }
      
      if (!groupId || !/^\d+$/.test(groupId)) {
        return '用法：qqgm.delpwd <群号>';
      }
      
      const hasPwd = getAdminPassword(groupId, String(session.userId)) !== null;
      if (!hasPwd) {
        return '❌ 您在该群未设置永久密码';
      }
      
      try {
        await removeAdminPassword(groupId, String(session.userId));
        return `✅ 群 ${groupId} 的永久密码已删除`;
      } catch (e: any) {
        return `❌ 删除失败: ${e.message}`;
      }
    });

  ctx.command('qqgm.appeal <text:text>', '提交申诉')
    .action(async ({ session }, text) => {
      if (!text) return '请填写申诉内容。';
      if (!session.guildId || session.platform !== 'onebot') return '仅限群聊。';
      const group = getGroup(session.guildId);
      if (!group || group.appeal?.enabled === false) return '本群未启用申诉。';
      const item = { groupId: session.guildId, userId: String(session.userId || ''), text };
      await recordAppeal(item);
      if (group.appeal?.notifyManagers && Array.isArray(group.managers)) {
        for (const mid of group.managers) {
          try { await session.bot.sendPrivateMessage(mid, `申诉来自 ${item.userId}：${text}`); } catch {}
        }
      }
      return '申诉已提交。';
    });

  ctx.command('qqgm.records', '查看本群处罚记录')
    .action(async ({ session }) => {
      if (!session.guildId || session.platform !== 'onebot') return '仅限群聊。';
      await loadRecords();
      const list = records.punishments.filter(p => String(p.groupId) === String(session.guildId)).slice(-10);
      if (!list.length) return '暂无记录。';
      return list.map(p => `- ${new Date(p.ts).toLocaleString()} ${p.userId} ${p.action} ${p.reason}`).join('\n');
    });

  const resetSchedules = () => {
    scheduleTimers.forEach(timers => timers.forEach(t => clearInterval(t)));
    scheduleTimers.clear();
    if (!Array.isArray(config.groups)) return;
    config.groups.forEach((g: any) => {
      const timers: NodeJS.Timeout[] = [];
      const rules = Array.isArray(g.scheduleAnnounce) ? g.scheduleAnnounce : [];
      rules.forEach((r: any) => {
        if (!r?.enabled || !r.message) return;
        const mins = Math.max(1, Number(r.intervalMinutes || 60));
        const t = setInterval(async () => {
          const bot = ctx.bots.find(b => b.platform === 'onebot');
          if (!bot) {
            logger.warn(`定时公告: 未找到 OneBot 适配器`);
            return;
          }
          try { 
            await bot.sendMessage(String(g.groupId), r.message);
            logger.debug(`定时公告已发送至群 ${g.groupId}`);
          } catch (e: any) {
            logger.warn(`定时公告发送失败: ${e.message}`);
          }
        }, mins * 60 * 1000);
        timers.push(t);
      });
      if (timers.length) scheduleTimers.set(String(g.groupId), timers);
    });
  };

  ctx.on('ready', async () => {
    // 确保 groups 数组已初始化
    if (!Array.isArray(config.groups)) config.groups = [];
    
    // 从配置文件加载 adminPasswords（如果存在）
    try {
      const filePath = resolveConfigFile();
      const content = await fs.readFile(filePath, 'utf8');
      const json = JSON.parse(content);
      if (json?.adminPasswords && Array.isArray(json.adminPasswords)) {
        (config as any).adminPasswords = json.adminPasswords;
        logger.info(`已加载 ${json.adminPasswords.length} 个永久密码配置`);
      }
    } catch {
      // 文件不存在或解析失败，忽略
    }
    
    // 加载消息统计
    await loadMessageStats();
    
    logger.info(`已加载 ${config.groups.length} 个群配置`);
    resetSchedules();
  });

  // 包装 saveConfigToFile 以在保存后重置定时器
  const doSaveConfig = async () => {
    try {
      const filePath = resolveConfigFile();
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const obj = { 
        groups: Array.isArray(config.groups) ? config.groups : [],
        adminPasswords: Array.isArray((config as any).adminPasswords) ? (config as any).adminPasswords : []
      };
      await fs.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e: any) {
      logger.warn(`配置文件写入失败：${e.message}`);
    }
    resetSchedules();
  };

  // ================= 注册新模块 =================
  
  // 注册群管理命令模块（全员禁言、改名片、设管理员等）
  registerAdminCommands(ctx, config, logger, requireManage, ensureGroup);
  
  // Web Token 存储 - 在主模块创建，避免配置更新时被清空
  const webTokens = new Map<string, any>();
  
  // 注册 Web 管理系统
  if (config.web?.enabled !== false) {
    registerWebRoutes(
      ctx, 
      config, 
      logger, 
      getGroup, 
      ensureGroup, 
      records, 
      doSaveConfig,
      getRoleLevelAsync,
      webTokens,
      webPasswords
    );
  }
  
  if (!server && config.web?.enabled !== false) {
    logger.warn('检测到 "server" 服务未加载，Web 控制台将不可用。请安装 @koishijs/plugin-server 插件。');
  }

  logger.info('QQ群管插件已加载');
}