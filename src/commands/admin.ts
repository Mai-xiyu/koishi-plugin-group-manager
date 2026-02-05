/**
 * QQ群管插件 - 群管理命令模块
 * 包含：全员禁言、修改名片、设置管理员、查看禁言列表、发送公告、修改群名
 */

import { Context } from 'koishi';
import { parseTimeString, formatDuration, parseUserId, MAX_MUTE_SECONDS } from '../utils';

export function registerAdminCommands(
  ctx: Context,
  config: any,
  logger: any,
  requireManage: (session: any) => Promise<boolean>,
  ensureGroup: (groupId: string) => any
) {
  
  // ================= 全员禁言/解禁 =================
  ctx.command('qqgm.全员禁言', '开启全员禁言')
    .alias('qqgm.全体禁言')
    .alias('qqgm.shutup-all')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      const bot = session.bot as any;
      try {
        if (bot?.internal?.setGroupWholeBan) {
          await bot.internal.setGroupWholeBan(session.guildId, true);
          return '✅ 已开启全员禁言';
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`全员禁言失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  ctx.command('qqgm.解除全员禁言', '关闭全员禁言')
    .alias('qqgm.取消全员禁言')
    .alias('qqgm.unshutup-all')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      const bot = session.bot as any;
      try {
        if (bot?.internal?.setGroupWholeBan) {
          await bot.internal.setGroupWholeBan(session.guildId, false);
          return '✅ 已解除全员禁言';
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`解除全员禁言失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 修改群名片 =================
  ctx.command('qqgm.改名片 <user:string> <card:text>', '修改群成员名片')
    .alias('qqgm.setcard')
    .usage('qqgm.改名片 @用户 新名片\nqqgm.改名片 123456 新名片')
    .action(async ({ session }, user, card) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      if (!user) return '请指定目标用户';
      const userId = parseUserId(user);
      if (!userId) return '无法识别目标用户';

      const bot = session.bot as any;
      try {
        if (bot?.internal?.setGroupCard) {
          await bot.internal.setGroupCard(session.guildId, userId, card || '');
          return card ? `✅ 已将 ${userId} 的名片修改为：${card}` : `✅ 已清空 ${userId} 的名片`;
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`修改名片失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 设置/取消管理员 =================
  ctx.command('qqgm.设管理 <user:string>', '设置群管理员（需群主权限）')
    .alias('qqgm.setadmin')
    .action(async ({ session }, user) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      // 需要群主权限
      const bot = session.bot as any;
      const userId = String(session.userId);
      
      // 检查是否是机器人管理员或群主
      const isBotAdmin = Array.isArray(config.admins) && config.admins.includes(userId);
      let isOwner = false;
      
      if (bot?.internal?.getGroupMemberInfo) {
        try {
          const info = await bot.internal.getGroupMemberInfo(session.guildId, userId, false);
          isOwner = info?.role === 'owner';
        } catch {}
      }
      
      if (!isBotAdmin && !isOwner) {
        return '❌ 权限不足，仅群主可设置管理员';
      }

      if (!user) return '请指定目标用户';
      const targetId = parseUserId(user);
      if (!targetId) return '无法识别目标用户';

      try {
        if (bot?.internal?.setGroupAdmin) {
          await bot.internal.setGroupAdmin(session.guildId, targetId, true);
          return `✅ 已将 ${targetId} 设为管理员`;
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`设置管理员失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  ctx.command('qqgm.取消管理 <user:string>', '取消群管理员（需群主权限）')
    .alias('qqgm.unsetadmin')
    .action(async ({ session }, user) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      const bot = session.bot as any;
      const userId = String(session.userId);
      
      const isBotAdmin = Array.isArray(config.admins) && config.admins.includes(userId);
      let isOwner = false;
      
      if (bot?.internal?.getGroupMemberInfo) {
        try {
          const info = await bot.internal.getGroupMemberInfo(session.guildId, userId, false);
          isOwner = info?.role === 'owner';
        } catch {}
      }
      
      if (!isBotAdmin && !isOwner) {
        return '❌ 权限不足，仅群主可取消管理员';
      }

      if (!user) return '请指定目标用户';
      const targetId = parseUserId(user);
      if (!targetId) return '无法识别目标用户';

      try {
        if (bot?.internal?.setGroupAdmin) {
          await bot.internal.setGroupAdmin(session.guildId, targetId, false);
          return `✅ 已取消 ${targetId} 的管理员`;
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`取消管理员失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 查看禁言列表 =================
  ctx.command('qqgm.禁言列表', '查看当前群被禁言的成员')
    .alias('qqgm.mutelist')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      const bot = session.bot as any;
      try {
        if (bot?.internal?.getGroupShutList) {
          const list = await bot.internal.getGroupShutList(session.guildId);
          if (!Array.isArray(list) || list.length === 0) {
            return '📋 当前没有被禁言的成员';
          }
          
          const lines = ['📋 禁言列表：'];
          const now = Math.floor(Date.now() / 1000);
          
          for (const item of list) {
            const remaining = (item.shut_up_timestamp || 0) - now;
            if (remaining > 0) {
              lines.push(`• ${item.nickname || item.user_id} (${item.user_id}) - 剩余 ${formatDuration(remaining)}`);
            }
          }
          
          return lines.length > 1 ? lines.join('\n') : '📋 当前没有被禁言的成员';
        }
        
        // 备用方案：遍历成员列表
        if (bot?.internal?.getGroupMemberList) {
          const members = await bot.internal.getGroupMemberList(session.guildId);
          const now = Math.floor(Date.now() / 1000);
          const muted = members.filter((m: any) => m.shut_up_timestamp && m.shut_up_timestamp > now);
          
          if (muted.length === 0) {
            return '📋 当前没有被禁言的成员';
          }
          
          const lines = ['📋 禁言列表：'];
          for (const m of muted.slice(0, 20)) {
            const remaining = m.shut_up_timestamp - now;
            lines.push(`• ${m.nickname || m.card || m.user_id} (${m.user_id}) - 剩余 ${formatDuration(remaining)}`);
          }
          if (muted.length > 20) lines.push(`...等 ${muted.length} 人`);
          
          return lines.join('\n');
        }
        
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`获取禁言列表失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 发送群公告 (真正的QQ公告) =================
  ctx.command('qqgm.发公告 <content:text>', '发送群公告（置顶在群公告栏）')
    .alias('qqgm.sendnotice')
    .option('pinned', '-p 是否置顶', { fallback: true })
    .option('confirm', '-c 是否需要确认', { fallback: false })
    .action(async ({ session, options }, content) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      if (!content) return '请输入公告内容';

      const bot = session.bot as any;
      try {
        // 尝试使用 _send_group_notice API
        if (bot?.internal?._send_group_notice) {
          await bot.internal._send_group_notice(session.guildId, content, {
            is_show_edit_card: options.confirm ? 1 : 0,
            tip_window_type: options.pinned ? 1 : 0,
          });
          return '✅ 群公告已发送';
        }
        
        // 备用方案
        if (bot?.internal?.sendGroupNotice) {
          await bot.internal.sendGroupNotice(session.guildId, content);
          return '✅ 群公告已发送';
        }
        
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`发送群公告失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 查看群公告 =================
  ctx.command('qqgm.查公告', '查看群公告列表')
    .alias('qqgm.getnotice')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';

      const bot = session.bot as any;
      try {
        if (bot?.internal?._get_group_notice) {
          const notices = await bot.internal._get_group_notice(session.guildId);
          if (!Array.isArray(notices) || notices.length === 0) {
            return '📋 暂无群公告';
          }
          
          const lines = ['📋 群公告列表：'];
          for (const n of notices.slice(0, 5)) {
            const date = new Date((n.publish_time || 0) * 1000).toLocaleDateString();
            const text = (n.message?.text || '').slice(0, 50);
            lines.push(`[${date}] ${text}${text.length >= 50 ? '...' : ''}`);
          }
          
          return lines.join('\n');
        }
        
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`获取群公告失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 修改群名称 =================
  ctx.command('qqgm.改群名 <name:text>', '修改群名称')
    .alias('qqgm.setgroupname')
    .action(async ({ session }, name) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      if (!name) return '请输入新的群名称';

      const bot = session.bot as any;
      try {
        if (bot?.internal?.setGroupName) {
          await bot.internal.setGroupName(session.guildId, name);
          return `✅ 群名称已修改为：${name}`;
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`修改群名称失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 批量踢人 =================
  ctx.command('qqgm.批量踢人 <users:text>', '批量踢出群成员')
    .alias('qqgm.kickmany')
    .option('reject', '-r 是否拒绝再次加群', { fallback: false })
    .usage('qqgm.批量踢人 123456 234567 345678\nqqgm.批量踢人 -r @用户1 @用户2')
    .action(async ({ session, options }, users) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      if (!users) return '请指定要踢出的用户（空格分隔）';

      // 解析用户列表
      const userList: string[] = [];
      const parts = users.split(/\s+/);
      for (const part of parts) {
        const uid = parseUserId(part);
        if (uid) userList.push(uid);
      }

      if (userList.length === 0) return '未识别到有效用户';

      const bot = session.bot as any;
      const results: string[] = [];
      let success = 0;
      let failed = 0;

      // 尝试使用批量踢人 API
      if (bot?.internal?.setGroupKickMembers) {
        try {
          await bot.internal.setGroupKickMembers(session.guildId, userList, options.reject);
          return `✅ 已批量踢出 ${userList.length} 人`;
        } catch (e: any) {
          logger.warn(`批量踢人API失败，尝试逐个踢出: ${e.message}`);
        }
      }

      // 逐个踢出
      for (const uid of userList) {
        try {
          if (bot?.internal?.setGroupKick) {
            await bot.internal.setGroupKick(session.guildId, uid, options.reject);
            success++;
          }
        } catch (e: any) {
          failed++;
          logger.warn(`踢出 ${uid} 失败: ${e.message}`);
        }
      }

      return `✅ 批量踢人完成\n成功: ${success} 人\n失败: ${failed} 人`;
    });

  // ================= 群荣誉信息 =================
  ctx.command('qqgm.群荣誉', '查看群荣誉信息（龙王等）')
    .alias('qqgm.honor')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';

      const bot = session.bot as any;
      try {
        if (bot?.internal?.getGroupHonorInfo) {
          const honor = await bot.internal.getGroupHonorInfo(session.guildId, 'all');
          
          const lines = ['🏆 群荣誉信息：'];
          
          if (honor?.talkative_list?.length) {
            const dragon = honor.current_talkative || honor.talkative_list[0];
            if (dragon) {
              lines.push(`🐉 龙王: ${dragon.nickname || dragon.user_id} (${dragon.day_count || 0}天)`);
            }
          }
          
          if (honor?.performer_list?.length) {
            lines.push(`🎭 群聊之火: ${honor.performer_list.slice(0, 3).map((p: any) => p.nickname).join(', ')}`);
          }
          
          if (honor?.legend_list?.length) {
            lines.push(`⭐ 群聊炽焰: ${honor.legend_list.slice(0, 3).map((p: any) => p.nickname).join(', ')}`);
          }
          
          if (honor?.emotion_list?.length) {
            lines.push(`😄 快乐源泉: ${honor.emotion_list.slice(0, 3).map((p: any) => p.nickname).join(', ')}`);
          }
          
          return lines.length > 1 ? lines.join('\n') : '暂无荣誉信息';
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`获取群荣誉失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= 精华消息 =================
  ctx.command('qqgm.设精华', '将回复的消息设为精华')
    .alias('qqgm.essence')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      // 获取回复的消息ID
      const quote = (session as any).quote;
      if (!quote?.id) return '请回复要设为精华的消息';

      const bot = session.bot as any;
      try {
        if (bot?.internal?.setEssenceMsg) {
          await bot.internal.setEssenceMsg(quote.id);
          return '✅ 已设为精华消息';
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`设置精华消息失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  ctx.command('qqgm.取消精华', '取消回复消息的精华')
    .alias('qqgm.unessence')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';
      
      if (!await requireManage(session)) {
        return '❌ 权限不足，需要群管理员或以上权限';
      }

      const quote = (session as any).quote;
      if (!quote?.id) return '请回复要取消精华的消息';

      const bot = session.bot as any;
      try {
        if (bot?.internal?.deleteEssenceMsg) {
          await bot.internal.deleteEssenceMsg(quote.id);
          return '✅ 已取消精华消息';
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`取消精华消息失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  // ================= @全体剩余次数 =================
  ctx.command('qqgm.艾特全体次数', '查看@全体成员剩余次数')
    .alias('qqgm.atallremain')
    .action(async ({ session }) => {
      if (session.platform !== 'onebot' || !session.guildId) return '仅限群聊使用。';

      const bot = session.bot as any;
      try {
        if (bot?.internal?.getGroupAtAllRemain) {
          const info = await bot.internal.getGroupAtAllRemain(session.guildId);
          const lines = ['📊 @全体成员剩余次数：'];
          lines.push(`群内剩余: ${info?.remain_at_all_count_for_group ?? '未知'} 次`);
          lines.push(`个人剩余: ${info?.remain_at_all_count_for_uin ?? '未知'} 次`);
          return lines.join('\n');
        }
        return '当前适配器不支持此功能';
      } catch (e: any) {
        logger.error(`获取@全体次数失败: ${e.message}`);
        return `❌ 操作失败: ${e.message}`;
      }
    });

  logger.info('群管理命令模块已加载');
}
