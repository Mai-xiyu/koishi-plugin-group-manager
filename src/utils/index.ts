/**
 * QQ群管插件 - 工具函数
 */

import crypto from 'crypto';
import { networkInterfaces } from 'os';

/**
 * 生成随机 Token
 */
export const genToken = () => crypto.randomBytes(16).toString('hex');

/**
 * 生成随机密码
 */
export const genPassword = () => crypto.randomBytes(4).toString('hex');

/**
 * 获取本机公网 IPv6 地址
 */
export const getPublicIPv6 = (): string | null => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // 跳过内部地址和非 IPv6
      if (net.internal || net.family !== 'IPv6') continue;
      // 跳过链路本地地址 (fe80::)
      if (net.address.startsWith('fe80:')) continue;
      // 跳过本地回环
      if (net.address === '::1') continue;
      // 跳过 ULA 地址 (fd00::/8, fc00::/7)
      if (net.address.startsWith('fd') || net.address.startsWith('fc')) continue;
      // 返回全局单播地址
      return net.address;
    }
  }
  return null;
};

/**
 * 获取本机公网 IPv4 地址（非内网）
 */
export const getPublicIPv4 = (): string | null => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.internal || net.family !== 'IPv4') continue;
      // 跳过内网地址
      if (net.address.startsWith('10.')) continue;
      if (net.address.startsWith('172.') && parseInt(net.address.split('.')[1]) >= 16 && parseInt(net.address.split('.')[1]) <= 31) continue;
      if (net.address.startsWith('192.168.')) continue;
      if (net.address.startsWith('127.')) continue;
      return net.address;
    }
  }
  return null;
};

/**
 * 获取本机内网 IPv4 地址（用于本地访问）
 */
export const getLocalIPv4 = (): string | null => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.internal || net.family !== 'IPv4') continue;
      // 返回第一个内网地址
      if (net.address.startsWith('192.168.') || net.address.startsWith('10.') || 
          (net.address.startsWith('172.') && parseInt(net.address.split('.')[1]) >= 16 && parseInt(net.address.split('.')[1]) <= 31)) {
        return net.address;
      }
    }
  }
  return null;
};

/**
 * 自动检测最佳公网地址
 * @param preferIPv6 优先使用 IPv6
 * @returns { address: string, type: 'ipv6' | 'ipv4' | 'local' | null }
 */
export const detectPublicAddress = (preferIPv6: boolean = true): { address: string | null, type: 'ipv6' | 'ipv4' | 'local' | null } => {
  if (preferIPv6) {
    const ipv6 = getPublicIPv6();
    if (ipv6) return { address: `[${ipv6}]`, type: 'ipv6' };
  }
  
  const ipv4 = getPublicIPv4();
  if (ipv4) return { address: ipv4, type: 'ipv4' };
  
  if (!preferIPv6) {
    const ipv6 = getPublicIPv6();
    if (ipv6) return { address: `[${ipv6}]`, type: 'ipv6' };
  }
  
  // 没有公网 IP，返回本地地址
  const local = getLocalIPv4();
  if (local) return { address: local, type: 'local' };
  
  return { address: null, type: null };
};

/**
 * 解析时间字符串，支持 秒/分/时/天 格式
 * @param timeStr 时间字符串，如 "10分", "1小时", "30s"
 * @returns 秒数，解析失败返回 null
 */
export const parseTimeString = (timeStr: string): number | null => {
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

/**
 * 格式化秒数为可读时间
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60 ? (seconds % 60) + '秒' : ''}`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}小时${m ? m + '分' : ''}`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}天${h ? h + '小时' : ''}`;
};

/**
 * 模板字符串替换
 */
export const formatTemplate = (tpl: string, vars: Record<string, string>): string => {
  let out = String(tpl || '');
  Object.keys(vars).forEach(k => {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
  });
  return out;
};

/**
 * 检查用户是否在列表中
 */
export const inList = (list: any[], userId: string): boolean => {
  return Array.isArray(list) && list.map(String).includes(String(userId));
};

/**
 * 提取纯文本内容（排除图片、表情等）
 */
export const extractTextContent = (raw: string): string => {
  return raw
    .replace(/<image[^>]*\/?>/gi, '')
    .replace(/<img[^>]*\/?>/gi, '')
    .replace(/<face[^>]*\/?>/gi, '')
    .replace(/<mface[^>]*\/?>/gi, '')
    .replace(/<at[^>]*\/?>/gi, '')
    .replace(/<audio[^>]*\/?>/gi, '')
    .replace(/<video[^>]*\/?>/gi, '')
    .replace(/<file[^>]*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

/**
 * 从 user 字符串解析 QQ 号
 * @param user 格式如 "onebot:123456" 或纯数字
 */
export const parseUserId = (user: string): string | null => {
  if (!user) return null;
  
  // 处理 at 格式 <at id="123456"/>
  const atMatch = user.match(/<at\s+id="(\d+)"/);
  if (atMatch) return atMatch[1];
  
  // 处理 platform:id 格式
  if (user.includes(':')) {
    const parts = user.split(':');
    return parts[parts.length - 1];
  }
  
  // 纯数字
  if (/^\d+$/.test(user)) return user;
  
  return null;
};

/**
 * 最大禁言时间：29天23时59分59秒
 */
export const MAX_MUTE_SECONDS = 29 * 86400 + 23 * 3600 + 59 * 60 + 59;

/**
 * 默认违禁词列表
 */
export const DEFAULT_FORBIDDEN_WORDS = [
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
