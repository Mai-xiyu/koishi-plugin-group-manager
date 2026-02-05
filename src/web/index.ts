/**
 * QQ群管插件 - Web 管理系统
 * 提供群管理员通过网页配置群管理功能
 * * Update: 增加多主题支持 (简约/科幻/二次元) 及深色模式适配 + 动画增强
 */

import { Context } from 'koishi';
import crypto from 'crypto';
import { TokenData, Config } from '../types';

// 生成 Token
const genToken = () => crypto.randomBytes(24).toString('hex');

// 前端 HTML 页面 - 极致美化版
const getAdminPageHtml = () => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>控制台 | 群管理系统</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Quicksand:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    /* ================= 核心变量定义 ================= */
    :root {
      /* 默认: 简约风 (Light) */
      --font-main: 'Inter', 'Noto Sans SC', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      
      --bg-body: #f9fafb;
      --bg-sidebar: #ffffff;
      --bg-surface: #ffffff;
      --bg-hover: #f3f4f6;
      --bg-active: #eff6ff;
      
      --border-color: #e5e7eb;
      --border-hover: #d1d5db;
      
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --primary-fg: #ffffff;
      
      --text-main: #111827;
      --text-secondary: #6b7280;
      --text-muted: #9ca3af;
      
      --danger: #ef4444;
      --danger-bg: #fee2e2;
      --success: #10b981;
      --success-bg: #ecfdf5;
      --warning: #f59e0b;
      
      --radius: 8px;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-glow: none;
      
      --glass-opacity: 1;
      --glass-blur: 0px;
      
      --transition-speed: 0.25s;
      --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* 简约风 - 深色模式适配 (Dark Mode) */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="scifi"]):not([data-theme="anime"]) {
        --bg-body: #0f172a;
        --bg-sidebar: #1e293b;
        --bg-surface: #1e293b;
        --bg-hover: #334155;
        --bg-active: rgba(59, 130, 246, 0.15);
        
        --border-color: #334155;
        --border-hover: #475569;
        
        --primary: #60a5fa;
        --primary-hover: #93c5fd;
        --primary-fg: #0f172a;
        
        --text-main: #f8fafc;
        --text-secondary: #94a3b8;
        --text-muted: #64748b;
        
        --danger-bg: rgba(239, 68, 68, 0.2);
        --success-bg: rgba(16, 185, 129, 0.2);
        
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
      }
    }

    /* === 主题：科幻风 (Cyberpunk) === */
    [data-theme="scifi"] {
      --font-main: 'JetBrains Mono', 'Noto Sans SC', monospace;
      
      --bg-body: #050505;
      --bg-sidebar: #0a0a0a;
      --bg-surface: #0a0a0a;
      --bg-hover: #1a1a1a;
      --bg-active: rgba(0, 255, 255, 0.1);
      
      --border-color: #333;
      --border-hover: #00ffff; 
      
      --primary: #00ffff;
      --primary-hover: #00cccc;
      --primary-fg: #000000;
      
      --text-main: #e0e0e0;
      --text-secondary: #888;
      --text-muted: #555;
      
      --danger: #ff0055;
      --danger-bg: rgba(255, 0, 85, 0.1);
      --success: #00ff66;
      --success-bg: rgba(0, 255, 102, 0.1);
      
      --radius: 0px; /* 硬朗切角 */
      --shadow-sm: 0 0 0 1px #222;
      --shadow-md: 0 0 15px rgba(0, 255, 255, 0.15);
      --shadow-glow: 0 0 10px var(--primary);
    }
    
    [data-theme="scifi"] body {
      background-image: 
        linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 30px 30px;
    }
    
    [data-theme="scifi"] .btn-primary, 
    [data-theme="scifi"] .nav-item.active {
      box-shadow: 0 0 12px var(--primary);
      text-shadow: 0 0 5px rgba(0,0,0,0.5);
    }

    /* === 主题：二次元 (Anime) === */
    [data-theme="anime"] {
      --font-main: 'Quicksand', 'Noto Sans SC', sans-serif;
      
      --bg-body: #fff0f5; /* Lavender Blush */
      --bg-sidebar: rgba(255, 255, 255, 0.6);
      --bg-surface: rgba(255, 255, 255, 0.6);
      --bg-hover: rgba(255, 255, 255, 0.8);
      --bg-active: rgba(255, 182, 193, 0.3);
      
      --border-color: #ffd1dc;
      --border-hover: #ffb7b2;
      
      --primary: #ff8fab; /* Soft Pink */
      --primary-hover: #fb6f92;
      --primary-fg: #ffffff;
      
      --text-main: #6d4c41;
      --text-secondary: #a1887f;
      --text-muted: #d7ccc8;
      
      --radius: 20px; /* 大圆角 */
      --shadow-sm: 0 4px 12px rgba(255, 182, 193, 0.2);
      --shadow-md: 0 8px 24px rgba(255, 105, 180, 0.15);
      
      --glass-blur: 16px;
    }
    
    [data-theme="anime"] body {
      background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
      background-image: radial-gradient(circle at 10% 20%, rgb(255, 240, 245) 0%, rgb(255, 255, 255) 90%);
    }
    
    [data-theme="anime"] .sidebar, 
    [data-theme="anime"] .section-card,
    [data-theme="anime"] .login-box {
      backdrop-filter: blur(var(--glass-blur));
      -webkit-backdrop-filter: blur(var(--glass-blur));
      border: 1px solid rgba(255, 255, 255, 0.8);
    }
    
    [data-theme="anime"] .btn {
      transition: transform 0.4s var(--ease-bounce), background 0.2s;
    }
    [data-theme="anime"] .btn:hover {
      transform: scale(1.05) translateY(-2px);
    }

    /* ================= 基础样式重置 ================= */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: var(--font-main);
      background-color: var(--bg-body);
      color: var(--text-main);
      height: 100vh;
      overflow: hidden;
      font-size: 14px;
      line-height: 1.6;
      transition: background-color 0.3s, color 0.3s;
    }

    /* 滚动条美化 */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

    /* 动画定义 */
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulseGlow {
      0% { box-shadow: 0 0 5px var(--primary); }
      50% { box-shadow: 0 0 15px var(--primary); }
      100% { box-shadow: 0 0 5px var(--primary); }
    }

    /* 布局框架 */
    .app-layout { display: flex; height: 100vh; animation: fadeIn 0.4s ease-out; }

    /* 侧边栏 */
    .sidebar {
      width: 260px;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      flex-shrink: 0;
      z-index: 10;
      transition: all 0.3s ease;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
      padding: 0 12px;
    }
    
    .brand-icon {
      width: 36px;
      height: 36px;
      background: var(--primary);
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-fg);
      box-shadow: var(--shadow-sm);
      transition: transform 0.3s var(--ease-bounce);
    }
    .brand:hover .brand-icon { transform: rotate(10deg) scale(1.1); }

    .brand-text { font-weight: 700; font-size: 18px; letter-spacing: -0.02em; }

    .nav-menu { display: flex; flex-direction: column; gap: 6px; flex: 1; overflow-y: auto; }

    .nav-item {
      padding: 10px 14px;
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--text-secondary);
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
      border: 1px solid transparent;
      position: relative;
      overflow: hidden;
    }

    .nav-item:hover { background: var(--bg-hover); color: var(--text-main); transform: translateX(3px); }
    
    .nav-item.active {
      background: var(--bg-active);
      color: var(--primary);
      border-color: transparent;
      font-weight: 600;
    }
    .nav-item.active svg { stroke-width: 2.5; }

    .nav-item svg { width: 18px; height: 18px; stroke-width: 2; transition: transform 0.2s; }
    .nav-item:hover svg { transform: scale(1.1); }

    /* 底部区域：主题切换 + 用户信息 */
    .sidebar-footer {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }
    
    .theme-switcher {
      display: flex;
      background: var(--bg-hover);
      padding: 4px;
      border-radius: var(--radius);
      gap: 2px;
    }
    
    .theme-btn {
      flex: 1;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      padding: 6px;
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .theme-btn:hover { color: var(--text-main); background: rgba(0,0,0,0.05); }
    .theme-btn.active {
      background: var(--bg-surface);
      color: var(--primary);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .user-profile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px;
      background: var(--bg-hover);
      border-radius: var(--radius);
      border: 1px solid var(--border-color);
    }

    .user-info { font-size: 12px; display: flex; flex-direction: column; }
    .user-name { font-weight: 600; color: var(--text-main); }
    .user-role { font-size: 11px; color: var(--primary); margin-top: 2px; }

    /* 主内容区 */
    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 32px 48px;
      position: relative;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      animation: slideUpFade 0.4s ease-out;
    }

    .page-title {
      font-size: 28px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    
    .group-subtitle {
      color: var(--text-secondary);
      font-size: 13px;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      opacity: 0.8;
    }

    /* 卡片与容器 */
    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      margin-bottom: 24px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .section-card:hover {
      box-shadow: var(--shadow-md);
      border-color: var(--border-hover);
    }
    
    .card-header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(to bottom, var(--bg-surface), var(--bg-hover));
    }

    .card-title { font-weight: 600; font-size: 16px; color: var(--text-main); display: flex; align-items: center; gap: 8px; }
    .card-title::before {
      content: ''; display: block; width: 4px; height: 16px; 
      background: var(--primary); border-radius: 2px;
    }

    .card-body { padding: 24px; }

    /* 表单元素 */
    .form-group { margin-bottom: 24px; }
    
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-main);
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      font-size: 14px;
      color: var(--text-main);
      background: var(--bg-surface);
      transition: all 0.2s;
      font-family: var(--font-main);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--bg-active);
    }
    
    .input-group { display: flex; gap: 8px; }
    .input-group .form-control { flex: 1; }

    textarea.form-control { resize: vertical; min-height: 80px; }

    /* 开关组件 */
    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid var(--border-color);
      transition: background 0.2s;
    }
    .switch-row:last-child { border-bottom: none; }
    .switch-row:hover { background: linear-gradient(90deg, transparent, var(--bg-hover)); }

    .switch-info h4 { font-size: 14px; font-weight: 600; color: var(--text-main); }
    .switch-info p { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

    .switch { position: relative; width: 48px; height: 26px; cursor: pointer; }
    .switch input { opacity: 0; width: 0; height: 0; }
    
    .slider {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--border-color);
      transition: .3s var(--ease-bounce);
      border-radius: 24px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s var(--ease-bounce);
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    input:checked + .slider { background-color: var(--primary); }
    [data-theme="scifi"] input:checked + .slider { box-shadow: 0 0 10px var(--primary); }
    input:checked + .slider:before { transform: translateX(22px); }

    /* 按钮 */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--radius);
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      gap: 6px;
      position: relative;
      overflow: hidden;
    }
    .btn:active { transform: scale(0.98); }
    
    .btn-primary {
      background: var(--primary);
      color: var(--primary-fg);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    
    .btn-secondary {
      background: var(--bg-surface);
      border-color: var(--border-color);
      color: var(--text-main);
    }
    .btn-secondary:hover { background: var(--bg-hover); border-color: var(--border-hover); }

    .btn-danger {
      background: var(--danger-bg);
      color: var(--danger);
      border: 1px solid transparent;
    }
    .btn-danger:hover { background: var(--danger); color: white; }

    /* 列表 & 表格 */
    .list-group {
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      transition: background 0.1s;
    }
    .list-item:last-child { border-bottom: none; }
    .list-item:hover { background: var(--bg-hover); }
    
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 12px; color: var(--text-secondary); font-weight: 500; border-bottom: 1px solid var(--border-color); }
    td { padding: 12px; border-bottom: 1px solid var(--border-color); color: var(--text-main); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-hover); }

    /* 统计卡片 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: var(--bg-surface);
      padding: 24px;
      border-radius: var(--radius);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
    
    .stat-card::after {
      content: ''; position: absolute; top: -50%; right: -50%; width: 100px; height: 100px;
      background: var(--primary); opacity: 0.05; border-radius: 50%; pointer-events: none;
    }
    
    .stat-value { font-size: 32px; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; line-height: 1; margin-bottom: 8px; }
    .stat-label { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

    /* 登录页 */
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-body);
      background-image: radial-gradient(var(--border-color) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .login-box {
      width: 100%;
      max-width: 420px;
      background: var(--bg-surface);
      padding: 48px;
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
      border: 1px solid var(--border-color);
      animation: slideUpFade 0.5s var(--ease-bounce);
    }
    .login-header { text-align: center; margin-bottom: 32px; }
    .login-header h2 { font-size: 24px; font-weight: 800; color: var(--text-main); margin-bottom: 8px; }
    
    /* 动画类 */
    .hidden { display: none !important; }
    .tab-content { display: none; }
    .tab-content.active { display: block; animation: slideUpFade 0.3s ease-out; }
    
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid transparent;
    }
    .badge-admin { background: rgba(37, 99, 235, 0.1); color: var(--primary); border-color: rgba(37, 99, 235, 0.2); }
    .badge-owner { background: rgba(245, 158, 11, 0.1); color: var(--warning); border-color: rgba(245, 158, 11, 0.2); }

    @media (max-width: 768px) {
      .app-layout { flex-direction: column; }
      .sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border-color); padding: 12px; }
      .nav-menu { flex-direction: row; overflow-x: auto; padding-bottom: 8px; }
      .nav-item { white-space: nowrap; }
      .brand { margin-bottom: 12px; }
      .main-content { padding: 20px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .sidebar-footer { display: none; } /* Mobile hide footer for space */
    }
  </style>
</head>
<body>

  <div id="login-page" class="login-container">
    <div class="login-box">
      <div class="login-header">
        <div class="brand-icon" style="margin: 0 auto 24px; width: 56px; height: 56px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h2>管理后台登录</h2>
        <p style="color:var(--text-secondary)">请输入群号和验证密码以继续</p>
      </div>
      <div id="login-alert" class="alert hidden" style="padding:10px;margin-bottom:15px;border-radius:6px;background:var(--danger-bg);color:var(--danger);text-align:center;"></div>
      <form id="login-form">
        <div class="form-group">
          <label class="form-label">群号</label>
          <input type="text" id="login-group" class="form-control" placeholder="例如: 12345678" required>
        </div>
        <div class="form-group">
          <label class="form-label">您的 QQ 号</label>
          <input type="text" id="login-user" class="form-control" placeholder="例如: 10001" required>
        </div>
        <div class="form-group">
          <label class="form-label">验证密码</label>
          <input type="password" id="login-pass" class="form-control" placeholder="在群内发送 qqgm.login 获取" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%; padding: 14px; font-size: 15px;">登 录</button>
      </form>
    </div>
  </div>

  <div id="admin-page" class="app-layout hidden">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <span class="brand-text">群管助手</span>
      </div>
      
      <nav class="nav-menu">
        <div class="nav-item active" data-tab="dashboard">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          仪表盘
        </div>
        <div class="nav-item" data-tab="basic">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          基本设置
        </div>
        <div class="nav-item" data-tab="forbidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          违禁词库
        </div>
        <div class="nav-item" data-tab="members">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          成员管理
        </div>
        <div class="nav-item" data-tab="verify">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          入群验证
        </div>
        <div class="nav-item" data-tab="notice">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          通知公告
        </div>
        <div class="nav-item" data-tab="records">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          处罚记录
        </div>
        <div class="nav-item" data-tab="groupmgr">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          群员操作
        </div>
        <div class="nav-item" data-tab="stats">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          发言统计
        </div>
        <div class="nav-item" data-tab="settings">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          账户设置
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="theme-switcher">
          <button class="theme-btn active" onclick="setTheme('default')" title="简约 / 自动深色">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </button>
          <button class="theme-btn" onclick="setTheme('scifi')" title="科幻 / 赛博朋克">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>
          <button class="theme-btn" onclick="setTheme('anime')" title="二次元 / 可爱">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
        </div>

        <div class="user-profile">
          <div class="user-info">
            <div style="font-weight: 600;" id="current-user-id">User</div>
            <div id="role-badge" class="user-role">管理员</div>
          </div>
          <button class="btn btn-secondary" onclick="logout()" style="padding: 6px; border:none; background:transparent;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <div class="header-bar">
        <div>
          <h1 class="page-title" id="page-title">仪表盘</h1>
          <div class="group-subtitle">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span id="group-name">...</span>
            <span style="color:var(--border-color); margin:0 4px;">|</span>
            <span id="group-id">...</span>
          </div>
        </div>
        <div id="save-status" class="alert hidden" style="margin:0; padding: 8px 16px; background:var(--success-bg); color:var(--success); border-radius:30px; font-weight:600;"></div>
      </div>

      <div id="tab-dashboard" class="tab-content active">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" id="dash-total-msg" style="color: var(--primary);">-</div>
            <div class="stat-label">总消息数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="dash-today-msg" style="color: var(--success);">-</div>
            <div class="stat-label">今日消息</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="dash-active-users" style="color: var(--warning);">-</div>
            <div class="stat-label">活跃成员</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="dash-punish-count" style="color: var(--danger);">-</div>
            <div class="stat-label">处罚次数</div>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px;">
          <div class="section-card">
            <div class="card-header">
              <span class="card-title">功能状态</span>
            </div>
            <div class="card-body" id="dash-features">
              <div style="padding:20px;text-align:center;color:var(--text-muted);">加载中...</div>
            </div>
          </div>
          
          <div class="section-card">
            <div class="card-header">
              <span class="card-title">今日发言 Top 5</span>
            </div>
            <div class="card-body" id="dash-top-users">
              <div style="padding:20px;text-align:center;color:var(--text-muted);">加载中...</div>
            </div>
          </div>
        </div>
        
        <div class="section-card" style="margin-top:24px;">
          <div class="card-header">
            <span class="card-title">最近处罚</span>
          </div>
          <div class="card-body" id="dash-recent-punish">
            <div style="padding:20px;text-align:center;color:var(--text-muted);">暂无记录</div>
          </div>
        </div>
      </div>

      <div id="tab-basic" class="tab-content">
        <div class="section-card">
          <div class="card-header">
            <span class="card-title">核心功能开关</span>
          </div>
          <div class="card-body">
            <div class="switch-row">
              <div class="switch-info">
                <h4>启用群管功能</h4>
                <p>总开关，关闭后插件将停止在该群的所有工作</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="switch-row">
              <div class="switch-info">
                <h4>自动同意入群</h4>
                <p>有人申请加群时自动通过</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-autoApprove" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>

            <div class="switch-row">
              <div class="switch-info">
                <h4>违禁词检测</h4>
                <p>自动撤回包含敏感词的消息并进行处罚</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-forbidden-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>

            <div class="switch-row">
              <div class="switch-info">
                <h4>刷屏检测</h4>
                <p>检测短时间内发送大量消息的行为</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-spam-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>

             <div class="switch-row">
              <div class="switch-info">
                <h4>自动撤回违规消息</h4>
                <p>触发违禁词或刷屏时自动撤回</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-autoRecall-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>

            <div class="switch-row">
              <div class="switch-info">
                <h4>在线违禁词 API</h4>
                <p>使用云端 API 增强检测能力（需联网）</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-profanityApi-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header">
            <span class="card-title">处罚策略</span>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
              <div class="form-group">
                <label class="form-label">违规处理方式</label>
                <select id="cfg-forbidden-action" class="form-control" onchange="saveConfig()">
                  <option value="warn">仅警告</option>
                  <option value="mute">禁言</option>
                  <option value="kick">踢出群聊</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">默认禁言时长（秒）</label>
                <input type="number" id="cfg-forbidden-muteSeconds" class="form-control" value="600" onchange="saveConfig()">
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="tab-forbidden" class="tab-content">
        <div class="section-card">
           <div class="card-header">
            <span class="card-title">自定义敏感词库</span>
          </div>
          <div class="card-body">
            <div class="input-group" style="margin-bottom:20px;">
              <input type="text" id="new-word" class="form-control" placeholder="输入关键词，支持正则">
              <button class="btn btn-primary" onclick="addWord()">添加</button>
            </div>
            <div id="word-list" class="list-group"></div>
          </div>
        </div>
      </div>

      <div id="tab-members" class="tab-content">
        <div class="section-card">
          <div class="card-header">
            <span class="card-title">白名单 (免检用户)</span>
          </div>
          <div class="card-body">
            <div class="input-group" style="margin-bottom:16px;">
              <input type="text" id="new-whitelist" class="form-control" placeholder="输入QQ号">
              <button class="btn btn-primary" onclick="addToList('whitelist')">添加</button>
            </div>
            <div id="whitelist-list" class="list-group"></div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header">
            <span class="card-title">黑名单 (自动踢出)</span>
          </div>
          <div class="card-body">
            <div class="input-group" style="margin-bottom:16px;">
              <input type="text" id="new-blacklist" class="form-control" placeholder="输入QQ号">
              <button class="btn btn-primary" onclick="addToList('blacklist')">添加</button>
            </div>
            <div id="blacklist-list" class="list-group"></div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header">
            <span class="card-title">灰名单 (重点监控)</span>
          </div>
          <div class="card-body">
            <div class="input-group" style="margin-bottom:16px;">
              <input type="text" id="new-graylist" class="form-control" placeholder="输入QQ号">
              <button class="btn btn-primary" onclick="addToList('graylist')">添加</button>
            </div>
            <div id="graylist-list" class="list-group"></div>
          </div>
        </div>
      </div>

      <div id="tab-verify" class="tab-content">
        <div class="section-card">
          <div class="card-header">
            <span class="card-title">验证设置</span>
          </div>
          <div class="card-body">
            <div class="switch-row">
              <div class="switch-info">
                <h4>启用入群验证</h4>
                <p>新成员进群需回答问题，否则禁言</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-joinVerify-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>
             <div class="switch-row">
              <div class="switch-info">
                <h4>验证失败踢出</h4>
                <p>超时或回答错误踢出群聊</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-joinVerify-kickOnFail" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>
            <div style="margin-top:24px;">
              <label class="form-label">验证超时时间（秒）</label>
              <input type="number" id="cfg-joinVerify-timeoutSeconds" class="form-control" value="120" onchange="saveConfig()">
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header" style="justify-content: space-between;">
            <span class="card-title">问题库</span>
            <button class="btn btn-primary" onclick="addQuestion()">+ 新增问题</button>
          </div>
          <div class="card-body">
            <div id="question-list"></div>
          </div>
        </div>
      </div>

      <div id="tab-notice" class="tab-content">
        <div class="section-card">
          <div class="card-header">
            <span class="card-title">进退群通知</span>
          </div>
          <div class="card-body">
             <div class="switch-row">
              <div class="switch-info">
                <h4>入群欢迎</h4>
                <p>在群内发送欢迎语</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-joinNotice-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>
            <div class="form-group" style="margin-top:16px;">
              <input type="text" id="cfg-joinNotice-template" class="form-control" placeholder="欢迎 {user} 加入本群" onchange="saveConfig()">
              <p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">变量: {user}=用户ID, {group}=群名</p>
            </div>

            <div class="switch-row" style="margin-top:24px;">
              <div class="switch-info">
                <h4>退群提醒</h4>
                <p>成员退出时发送提醒</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-leaveNotice-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>
            <div class="form-group" style="margin-top:16px;">
              <input type="text" id="cfg-leaveNotice-template" class="form-control" placeholder="{user} 离开了群聊" onchange="saveConfig()">
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header">
            <span class="card-title">私聊引导</span>
          </div>
          <div class="card-body">
             <div class="switch-row">
              <div class="switch-info">
                <h4>启用私聊引导</h4>
                <p>新成员入群后，Bot 私聊发送引导信息</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="cfg-welcomeGuide-enabled" onchange="saveConfig()">
                <span class="slider"></span>
              </label>
            </div>
            <div class="form-group" style="margin-top:16px;">
              <label class="form-label">引导内容</label>
              <textarea id="cfg-welcomeGuide-text" class="form-control" rows="4" onchange="saveConfig()"></textarea>
            </div>
          </div>
        </div>
      </div>

      <div id="tab-records" class="tab-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" id="stat-total">0</div>
            <div class="stat-label">总处罚</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="stat-today">0</div>
            <div class="stat-label">今日新增</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="stat-mute" style="color: #f59e0b;">0</div>
            <div class="stat-label">禁言次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="stat-kick" style="color: #ef4444;">0</div>
            <div class="stat-label">踢出次数</div>
          </div>
        </div>

        <div class="section-card">
           <div class="card-header">
            <span class="card-title">最近记录</span>
          </div>
          <div id="record-list"></div>
        </div>
      </div>

       <div id="tab-groupmgr" class="tab-content">
        <div class="section-card">
          <div class="card-header">
            <span class="card-title">群成员列表</span>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-secondary" onclick="loadGroupMembers()">刷新</button>
              <button class="btn btn-primary" onclick="toggleMuteAll()">全员禁言</button>
            </div>
          </div>
          <div class="card-body">
            <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
              <input type="text" id="member-search" class="form-control" placeholder="搜索 QQ/昵称..." style="max-width:200px;" oninput="filterMembers()">
              <select id="member-filter-role" class="form-control" style="max-width:140px;" onchange="filterMembers()">
                <option value="">全部身份</option>
                <option value="owner">群主</option>
                <option value="admin">管理员</option>
                <option value="member">普通成员</option>
              </select>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="member-select-all" onchange="toggleSelectAll()"> 全选
              </label>
            </div>
            <div style="margin-bottom:16px;padding:12px;background:var(--bg-hover);border-radius:var(--radius);display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
              <span style="font-size:13px;color:var(--text-secondary);">批量操作：</span>
              <button class="btn btn-secondary" onclick="batchMute()">禁言</button>
              <button class="btn btn-secondary" onclick="batchUnmute()">解禁</button>
              <button class="btn btn-secondary" id="btn-set-title" onclick="batchSetTitle()">设头衔</button>
              <button class="btn btn-danger" onclick="batchKick()">踢出</button>
              <span id="selected-count" style="margin-left:auto;font-size:12px;color:var(--text-muted);">已选 0 人</span>
            </div>
            <div id="member-list-container" style="max-height:500px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius);">
              <table style="width:100%;">
                <thead style="background:var(--bg-hover);position:sticky;top:0;">
                  <tr>
                    <th style="width:40px;"></th>
                    <th>QQ号</th>
                    <th>昵称/名片</th>
                    <th>身份</th>
                    <th>头衔</th>
                    <th>最后发言</th>
                    <th style="text-align:center;">操作</th>
                  </tr>
                </thead>
                <tbody id="member-list-body"></tbody>
              </table>
            </div>
            <div id="member-loading" style="padding:40px;text-align:center;color:var(--text-muted);">点击 "刷新列表" 加载成员</div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header">
            <span class="card-title">当前禁言中</span>
            <button class="btn btn-secondary" onclick="loadMutedList()">刷新</button>
          </div>
          <div class="card-body">
            <div id="muted-list-container"></div>
          </div>
        </div>
      </div>

      <div id="tab-stats" class="tab-content">
        <div class="section-card">
          <div class="card-header">
            <span class="card-title">发言统计</span>
            <button class="btn btn-secondary" onclick="loadMessageStats()">刷新数据</button>
          </div>
          <div class="card-body">
            <div id="stats-summary" class="stats-grid" style="margin-bottom:24px;">
              <div class="stat-card">
                <div class="stat-value" id="stats-total-users">-</div>
                <div class="stat-label">活跃成员</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="stats-total-messages">-</div>
                <div class="stat-label">总消息数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="stats-today-messages">-</div>
                <div class="stat-label">今日消息</div>
              </div>
              <div class="stat-card">
                <div class="stat-value" id="stats-avg">-</div>
                <div class="stat-label">人均消息</div>
              </div>
            </div>
            <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-weight:600;color:var(--text-main);">排行榜</span>
              <select id="stats-sort" class="form-control" style="width:auto;" onchange="renderStats()">
                <option value="total">按总消息</option>
                <option value="today">按今日消息</option>
                <option value="last">按最近发言</option>
              </select>
            </div>
            <div id="stats-ranking" style="max-height:400px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius);">
              <div style="padding:40px;text-align:center;color:var(--text-muted);">点击 "刷新数据" 加载统计</div>
            </div>
          </div>
        </div>
      </div>

      <div id="tab-settings" class="tab-content">
        <div class="section-card">
          <div class="card-header">
            <span class="card-title">登录状态</span>
          </div>
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
              <div style="width:48px;height:48px;background:var(--bg-hover);border-radius:50%;display:flex;align-items:center;justify-content:center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <div>
                <div style="font-weight:600;" id="settings-userid">-</div>
                <div style="font-size:12px;color:var(--text-secondary);" id="settings-login-type">临时登录</div>
              </div>
            </div>
            <div id="login-expire-info" style="padding:12px;background:var(--warning);opacity:0.8;border-radius:6px;font-size:13px;color:#fff;margin-bottom:16px;">
              临时密码登录，会话将在 2 小时后过期
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header">
            <span class="card-title">永久密码</span>
          </div>
          <div class="card-body">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">设置永久密码后，无需每次通过指令获取临时密码，且登录不会自动过期。</p>
            <div id="permanent-pwd-status" style="margin-bottom:16px;"></div>
            <div class="form-group">
              <label class="form-label">设置新密码 (6-32位)</label>
              <div class="input-group">
                <input type="password" id="new-permanent-pwd" class="form-control" placeholder="输入新密码">
                <button class="btn btn-primary" onclick="setPermanentPassword()">保存</button>
              </div>
            </div>
            <button class="btn btn-danger" id="del-pwd-btn" onclick="deletePermanentPassword()" style="display:none;">删除永久密码</button>
          </div>
        </div>
      </div>
      
    </main>
  </div>

  <script>
    let token = localStorage.getItem('qqgm_token');
    let groupConfig = null;
    let records = [];
    let groupMembers = [];
    let messageStats = [];
    let isPermanentLogin = false;

    // 主题切换逻辑
    function initTheme() {
      const savedTheme = localStorage.getItem('qqgm_theme') || 'default';
      setTheme(savedTheme);
    }

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('qqgm_theme', theme);
      
      // 更新按钮状态
      document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick.toString().includes(theme)) {
          btn.classList.add('active');
        }
      });
    }

    // 初始化
    async function init() {
      initTheme();
      if (token) {
        try {
          await loadConfig();
          showAdminPage();
        } catch (e) {
          localStorage.removeItem('qqgm_token');
          token = null;
          showLoginPage();
        }
      } else {
        showLoginPage();
      }
    }

    function showLoginPage() {
      document.getElementById('login-page').classList.remove('hidden');
      document.getElementById('admin-page').classList.add('hidden');
    }

    function showAdminPage() {
      document.getElementById('login-page').classList.add('hidden');
      document.getElementById('admin-page').classList.remove('hidden');
      renderConfig();
      loadDashboard();
    }

    // 加载仪表盘数据
    async function loadDashboard() {
      // 加载统计数据
      try {
        const res = await fetch('/qqgm/api/stats/messages', { headers: { 'X-QQGM-Token': token } });
        const data = await res.json();
        if (data.ok) {
          const stats = data.stats || [];
          const totalMsg = stats.reduce((s, m) => s + m.totalMessages, 0);
          const todayMsg = stats.reduce((s, m) => s + m.todayMessages, 0);
          document.getElementById('dash-total-msg').textContent = totalMsg;
          document.getElementById('dash-today-msg').textContent = todayMsg;
          document.getElementById('dash-active-users').textContent = stats.length;
          
          // 今日 Top 5
          const topUsers = [...stats].sort((a,b) => b.todayMessages - a.todayMessages).slice(0, 5);
          document.getElementById('dash-top-users').innerHTML = topUsers.length ? topUsers.map((u, i) => \`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
              <span><span style="color:\${i<3?'var(--warning)':'var(--text-muted)'};font-weight:600;">#\${i+1}</span> \${escapeHtml(u.nickname || u.userId)}</span>
              <span style="font-weight:600;color:var(--success);">\${u.todayMessages}</span>
            </div>
          \`).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted);">暂无数据</div>';
        }
      } catch {}
      
      // 更新处罚次数和最近处罚
      document.getElementById('dash-punish-count').textContent = records.length;
      const recent = records.slice(-5).reverse();
      document.getElementById('dash-recent-punish').innerHTML = recent.length ? recent.map(r => \`
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);">
          <span>\${r.userId} - <span style="color:\${r.action==='kick'?'var(--danger)':'var(--warning)'}">\${formatAction(r.action)}</span></span>
          <span style="font-size:12px;color:var(--text-muted);">\${new Date(r.ts).toLocaleString()}</span>
        </div>
      \`).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted);">暂无记录</div>';
      
      // 更新功能状态
      if (groupConfig) {
        document.getElementById('dash-features').innerHTML = \`
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-hover);border-radius:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:\${groupConfig.enabled !== false ? 'var(--success)' : 'var(--text-muted)'}"></span>
              <span>群管功能</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-hover);border-radius:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:\${groupConfig.forbidden?.enabled ? 'var(--success)' : 'var(--text-muted)'}"></span>
              <span>违禁词检测</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-hover);border-radius:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:\${groupConfig.spam?.enabled ? 'var(--success)' : 'var(--text-muted)'}"></span>
              <span>刷屏检测</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-hover);border-radius:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:\${groupConfig.joinVerify?.enabled ? 'var(--success)' : 'var(--text-muted)'}"></span>
              <span>入群验证</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-hover);border-radius:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:\${groupConfig.joinNotice?.enabled ? 'var(--success)' : 'var(--text-muted)'}"></span>
              <span>入群通知</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-hover);border-radius:6px;">
              <span style="width:8px;height:8px;border-radius:50%;background:\${groupConfig.autoRecall?.enabled !== false ? 'var(--success)' : 'var(--text-muted)'}"></span>
              <span>自动撤回</span>
            </div>
          </div>
        \`;
      }
    }

    // 登录
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const groupId = document.getElementById('login-group').value;
      const userId = document.getElementById('login-user').value;
      const password = document.getElementById('login-pass').value;

      try {
        const res = await fetch('/qqgm/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, userId, password })
        });
        const data = await res.json();
        
        if (data.ok) {
          token = data.token;
          localStorage.setItem('qqgm_token', token);
          await loadConfig();
          showAdminPage();
        } else {
          showAlert('login-alert', data.message || '登录失败', 'error');
        }
      } catch (e) {
        showAlert('login-alert', '网络错误', 'error');
      }
    };

    function logout() {
      localStorage.removeItem('qqgm_token');
      token = null;
      showLoginPage();
    }

    // 机器人在群内的角色
    let botRole = 'member';

    // 加载配置
    async function loadConfig() {
      const res = await fetch('/qqgm/api/config', {
        headers: { 'X-QQGM-Token': token }
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      groupConfig = data.group;
      records = data.records || [];
      botRole = data.botRole || 'member';
      
      document.getElementById('group-id').textContent = groupConfig.groupId;
      document.getElementById('group-name').textContent = data.groupName || '未命名群聊';
      
      // 根据机器人角色控制功能显示（只有群主才能设头衔）
      const titleBtn = document.getElementById('btn-set-title');
      if (titleBtn) {
        titleBtn.style.display = botRole === 'owner' ? 'inline-flex' : 'none';
      }
      
      // 设置用户信息
      if (token) {
          try {
             // 简单解析
          } catch(e) {}
      }
      if(data.role) {
          const badge = document.getElementById('role-badge');
          if(data.role === 'owner') {
              badge.textContent = '群主';
              badge.className = 'badge badge-owner';
          } else {
              badge.textContent = '管理员';
              badge.className = 'badge badge-admin';
          }
      }
    }

    // 渲染配置
    function renderConfig() {
      if (!groupConfig) return;
      
      // 基本设置
      document.getElementById('cfg-enabled').checked = groupConfig.enabled !== false;
      document.getElementById('cfg-autoApprove').checked = groupConfig.autoApprove === true;
      document.getElementById('cfg-forbidden-enabled').checked = groupConfig.forbidden?.enabled === true;
      document.getElementById('cfg-spam-enabled').checked = groupConfig.spam?.enabled === true;
      document.getElementById('cfg-autoRecall-enabled').checked = groupConfig.autoRecall?.enabled !== false;
      document.getElementById('cfg-profanityApi-enabled').checked = groupConfig.forbidden?.profanityApi?.enabled === true;
      document.getElementById('cfg-forbidden-action').value = groupConfig.forbidden?.action || 'mute';
      document.getElementById('cfg-forbidden-muteSeconds').value = groupConfig.forbidden?.muteSeconds || 600;
      
      // 入群验证
      document.getElementById('cfg-joinVerify-enabled').checked = groupConfig.joinVerify?.enabled === true;
      document.getElementById('cfg-joinVerify-kickOnFail').checked = groupConfig.joinVerify?.kickOnFail !== false;
      document.getElementById('cfg-joinVerify-timeoutSeconds').value = groupConfig.joinVerify?.timeoutSeconds || 120;
      
      // 通知
      document.getElementById('cfg-joinNotice-enabled').checked = groupConfig.joinNotice?.enabled === true;
      document.getElementById('cfg-joinNotice-template').value = groupConfig.joinNotice?.template || '';
      document.getElementById('cfg-leaveNotice-enabled').checked = groupConfig.leaveNotice?.enabled === true;
      document.getElementById('cfg-leaveNotice-template').value = groupConfig.leaveNotice?.template || '';
      document.getElementById('cfg-welcomeGuide-enabled').checked = groupConfig.welcomeGuide?.enabled === true;
      document.getElementById('cfg-welcomeGuide-text').value = groupConfig.welcomeGuide?.text || '';
      
      renderWordList();
      renderMemberLists();
      renderQuestions();
      renderRecords();
    }

    // 渲染违禁词列表
    function renderWordList() {
      const words = groupConfig.forbidden?.words || [];
      const container = document.getElementById('word-list');
      container.innerHTML = words.map((w, i) => \`
        <div class="list-item">
          <span style="font-family:monospace;background:var(--bg-hover);padding:2px 6px;border-radius:4px;color:var(--text-main);">\${escapeHtml(w)}</span>
          <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;" onclick="removeWord(\${i})">删除</button>
        </div>
      \`).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">暂无违禁词</div>';
    }

    // 渲染成员列表
    function renderMemberLists() {
      ['whitelist', 'blacklist', 'graylist'].forEach(listName => {
        const list = groupConfig[listName] || [];
        const container = document.getElementById(listName + '-list');
        container.innerHTML = list.map((uid, i) => \`
          <div class="list-item">
            <span style="font-family:monospace;">\${uid}</span>
            <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;" onclick="removeFromList('\${listName}', \${i})">删除</button>
          </div>
        \`).join('') || '<div style="padding:15px;text-align:center;color:var(--text-muted);font-size:13px;">列表为空</div>';
      });
    }

    // 渲染问题列表
    function renderQuestions() {
      const questions = groupConfig.joinVerify?.questionPool || [];
      const container = document.getElementById('question-list');
      container.innerHTML = questions.map((q, i) => \`
        <div style="background:var(--bg-surface);padding:16px;border:1px solid var(--border-color); border-radius:8px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
            <span style="font-weight:600;font-size:13px;color:var(--text-main);">问题 #\${i + 1}</span>
            <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;" onclick="removeQuestion(\${i})">删除</button>
          </div>
          <div style="margin-bottom:12px;">
            <input type="text" class="form-control" placeholder="问题内容" value="\${escapeHtml(q.q)}" onchange="updateQuestion(\${i}, 'q', this.value)">
          </div>
          <div>
            <input type="text" class="form-control" placeholder="答案 (多个答案用逗号分隔)" value="\${(q.a || []).join(',')}" onchange="updateQuestion(\${i}, 'a', this.value)">
          </div>
        </div>
      \`).join('') || '<div style="padding:30px;text-align:center;color:var(--text-muted);background:var(--bg-hover);border-radius:8px;border:1px dashed var(--border-color);">暂无验证问题，请点击右上角添加</div>';
    }

    // 渲染处罚记录
    function renderRecords() {
      const today = new Date().toDateString();
      const todayRecords = records.filter(r => new Date(r.ts).toDateString() === today);
      
      document.getElementById('stat-total').textContent = records.length;
      document.getElementById('stat-today').textContent = todayRecords.length;
      document.getElementById('stat-mute').textContent = records.filter(r => r.action === 'mute').length;
      document.getElementById('stat-kick').textContent = records.filter(r => r.action === 'kick').length;
      
      const container = document.getElementById('record-list');
      const recent = records.slice(-20).reverse();
      container.innerHTML = recent.map(r => \`
        <div class="list-item">
          <div>
             <div style="font-weight:500;color:var(--text-main);">\${r.userId} <span style="font-weight:400;color:var(--text-secondary);margin:0 4px;">被</span> <span style="color:\${r.action==='kick'?'var(--danger)':'var(--warning)'}">\${formatAction(r.action)}</span></div>
             <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">\${new Date(r.ts).toLocaleString()}</div>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);background:var(--bg-hover);padding:4px 8px;border-radius:4px;max-width:40%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            \${escapeHtml(r.reason || '无原因')}
          </div>
        </div>
      \`).join('') || '<div style="padding:40px;text-align:center;color:var(--text-muted);">暂无数据</div>';
    }

    function formatAction(act) {
        const map = { mute: '禁言', kick: '踢出', warn: '警告' };
        return map[act] || act;
    }

    // 保存配置
    async function saveConfig() {
      groupConfig.enabled = document.getElementById('cfg-enabled').checked;
      groupConfig.autoApprove = document.getElementById('cfg-autoApprove').checked;
      
      if (!groupConfig.forbidden) groupConfig.forbidden = {};
      groupConfig.forbidden.enabled = document.getElementById('cfg-forbidden-enabled').checked;
      groupConfig.forbidden.action = document.getElementById('cfg-forbidden-action').value;
      groupConfig.forbidden.muteSeconds = parseInt(document.getElementById('cfg-forbidden-muteSeconds').value) || 600;
      
      if (!groupConfig.forbidden.profanityApi) groupConfig.forbidden.profanityApi = {};
      groupConfig.forbidden.profanityApi.enabled = document.getElementById('cfg-profanityApi-enabled').checked;
      
      if (!groupConfig.spam) groupConfig.spam = {};
      groupConfig.spam.enabled = document.getElementById('cfg-spam-enabled').checked;
      
      if (!groupConfig.autoRecall) groupConfig.autoRecall = {};
      groupConfig.autoRecall.enabled = document.getElementById('cfg-autoRecall-enabled').checked;
      
      if (!groupConfig.joinVerify) groupConfig.joinVerify = {};
      groupConfig.joinVerify.enabled = document.getElementById('cfg-joinVerify-enabled').checked;
      groupConfig.joinVerify.kickOnFail = document.getElementById('cfg-joinVerify-kickOnFail').checked;
      groupConfig.joinVerify.timeoutSeconds = parseInt(document.getElementById('cfg-joinVerify-timeoutSeconds').value) || 120;
      
      if (!groupConfig.joinNotice) groupConfig.joinNotice = {};
      groupConfig.joinNotice.enabled = document.getElementById('cfg-joinNotice-enabled').checked;
      groupConfig.joinNotice.template = document.getElementById('cfg-joinNotice-template').value;
      
      if (!groupConfig.leaveNotice) groupConfig.leaveNotice = {};
      groupConfig.leaveNotice.enabled = document.getElementById('cfg-leaveNotice-enabled').checked;
      groupConfig.leaveNotice.template = document.getElementById('cfg-leaveNotice-template').value;
      
      if (!groupConfig.welcomeGuide) groupConfig.welcomeGuide = {};
      groupConfig.welcomeGuide.enabled = document.getElementById('cfg-welcomeGuide-enabled').checked;
      groupConfig.welcomeGuide.text = document.getElementById('cfg-welcomeGuide-text').value;

      try {
        const res = await fetch('/qqgm/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify(groupConfig)
        });
        const data = await res.json();
        if (data.ok) {
          showToast('设置已保存', 'success');
        } else {
          showToast(data.message || '保存失败', 'error');
        }
      } catch (e) {
        showToast('网络错误', 'error');
      }
    }

    // 违禁词操作
    function addWord() {
      const input = document.getElementById('new-word');
      const word = input.value.trim();
      if (!word) return;
      if (!groupConfig.forbidden) groupConfig.forbidden = {};
      if (!groupConfig.forbidden.words) groupConfig.forbidden.words = [];
      if (!groupConfig.forbidden.words.includes(word)) {
        groupConfig.forbidden.words.push(word);
        renderWordList();
        saveConfig();
      }
      input.value = '';
    }

    function removeWord(index) {
      groupConfig.forbidden.words.splice(index, 1);
      renderWordList();
      saveConfig();
    }

    // 成员列表操作
    function addToList(listName) {
      const input = document.getElementById('new-' + listName);
      const uid = input.value.trim();
      if (!uid || !/^\\d+$/.test(uid)) {
        alert('请输入有效的QQ号');
        return;
      }
      if (!groupConfig[listName]) groupConfig[listName] = [];
      if (!groupConfig[listName].includes(uid)) {
        groupConfig[listName].push(uid);
        renderMemberLists();
        saveConfig();
      }
      input.value = '';
    }

    function removeFromList(listName, index) {
      groupConfig[listName].splice(index, 1);
      renderMemberLists();
      saveConfig();
    }

    // 问题操作
    function addQuestion() {
      if (!groupConfig.joinVerify) groupConfig.joinVerify = {};
      if (!groupConfig.joinVerify.questionPool) groupConfig.joinVerify.questionPool = [];
      groupConfig.joinVerify.questionPool.push({ q: '', a: [] });
      renderQuestions();
    }

    function updateQuestion(index, field, value) {
      if (field === 'a') {
        groupConfig.joinVerify.questionPool[index].a = value.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        groupConfig.joinVerify.questionPool[index][field] = value;
      }
      saveConfig();
    }

    function removeQuestion(index) {
      groupConfig.joinVerify.questionPool.splice(index, 1);
      renderQuestions();
      saveConfig();
    }

    // Tab 切换
    document.querySelectorAll('.nav-item').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        document.getElementById('tab-' + targetId).classList.add('active');
        
        // 更新标题
        document.getElementById('page-title').textContent = tab.textContent.trim();
        
        // 按需加载数据
        if (targetId === 'settings') checkPasswordStatus();
        if (targetId === 'dashboard') loadDashboard();
      };
    });

    // 提示工具 (Toast)
    function showToast(message, type) {
      const el = document.getElementById('save-status');
      el.textContent = message;
      // 样式在CSS中定义
      el.style.backgroundColor = type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)';
      el.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
      
      el.classList.remove('hidden');
      el.style.animation = 'fadeIn 0.3s ease';
      
      if(window.toastTimer) clearTimeout(window.toastTimer);
      window.toastTimer = setTimeout(() => {
          el.classList.add('hidden');
      }, 2000);
    }
    
    function showAlert(id, message, type) {
      const el = document.getElementById(id);
      el.textContent = message;
      el.classList.remove('hidden');
    }

    function escapeHtml(text) {
      if(!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // 群成员管理函数
    async function loadGroupMembers() {
      document.getElementById('member-loading').style.display = 'block';
      document.getElementById('member-list-body').innerHTML = '';
      try {
        const res = await fetch('/qqgm/api/members', { headers: { 'X-QQGM-Token': token } });
        const data = await res.json();
        if (data.ok) {
          groupMembers = data.members || [];
          renderGroupMembers();
          document.getElementById('member-loading').style.display = 'none';
        } else {
          showToast(data.message || '加载失败', 'error');
        }
      } catch (e) {
        showToast('网络错误', 'error');
      }
    }

    function renderGroupMembers() {
      const search = (document.getElementById('member-search').value || '').toLowerCase();
      const roleFilter = document.getElementById('member-filter-role').value;
      
      let filtered = groupMembers.filter(m => {
        if (search && !m.userId.includes(search) && !(m.nickname||'').toLowerCase().includes(search) && !(m.card||'').toLowerCase().includes(search)) return false;
        if (roleFilter && m.role !== roleFilter) return false;
        return true;
      });

      const tbody = document.getElementById('member-list-body');
      tbody.innerHTML = filtered.map(m => \`
        <tr>
          <td><input type="checkbox" class="member-checkbox" data-uid="\${m.userId}"></td>
          <td style="font-family:monospace;">\${m.userId}</td>
          <td>\${escapeHtml(m.card || m.nickname || '-')}</td>
          <td><span class="badge \${m.role==='owner'?'badge-owner':m.role==='admin'?'badge-admin':''}">\${formatRole(m.role)}</span></td>
          <td>\${escapeHtml(m.title || '-')}</td>
          <td style="font-size:12px;color:var(--text-muted);">\${m.lastSentTime ? new Date(m.lastSentTime*1000).toLocaleString() : '-'}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;" onclick="singleMute('\${m.userId}')">禁言</button>
            <button class="btn btn-danger" style="padding:4px 8px;font-size:11px;" onclick="singleKick('\${m.userId}')">踢出</button>
          </td>
        </tr>
      \`).join('') || '<tr><td colspan="7" style="padding:40px;text-align:center;color:var(--text-muted);">无匹配成员</td></tr>';
      
      updateSelectedCount();
    }

    function formatRole(role) {
      const map = { owner: '群主', admin: '管理员', member: '成员' };
      return map[role] || role;
    }

    function filterMembers() { renderGroupMembers(); }

    function toggleSelectAll() {
      const checked = document.getElementById('member-select-all').checked;
      document.querySelectorAll('.member-checkbox').forEach(cb => cb.checked = checked);
      updateSelectedCount();
    }

    function updateSelectedCount() {
      const count = document.querySelectorAll('.member-checkbox:checked').length;
      document.getElementById('selected-count').textContent = '已选 ' + count + ' 人';
    }

    document.addEventListener('change', e => {
      if (e.target.classList.contains('member-checkbox')) updateSelectedCount();
    });

    function getSelectedUserIds() {
      return Array.from(document.querySelectorAll('.member-checkbox:checked')).map(cb => cb.dataset.uid);
    }

    async function batchKick() {
      const ids = getSelectedUserIds();
      if (!ids.length) return showToast('请先选择成员', 'error');
      if (!confirm('确定踢出 ' + ids.length + ' 人？')) return;
      
      try {
        const res = await fetch('/qqgm/api/members/kick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ userIds: ids, rejectAddRequest: false })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
        if (data.ok) loadGroupMembers();
      } catch { showToast('网络错误', 'error'); }
    }

    async function batchMute() {
      const ids = getSelectedUserIds();
      if (!ids.length) return showToast('请先选择成员', 'error');
      const duration = prompt('禁言时长（秒），0为解禁', '600');
      if (duration === null) return;
      
      try {
        const res = await fetch('/qqgm/api/members/mute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ userIds: ids, duration: parseInt(duration) || 0 })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
      } catch { showToast('网络错误', 'error'); }
    }

    async function batchUnmute() {
      const ids = getSelectedUserIds();
      if (!ids.length) return showToast('请先选择成员', 'error');
      try {
        const res = await fetch('/qqgm/api/members/mute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ userIds: ids, duration: 0 })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
        if (data.ok) loadMutedList();
      } catch { showToast('网络错误', 'error'); }
    }

    async function batchSetTitle() {
      const ids = getSelectedUserIds();
      if (!ids.length) return showToast('请先选择成员', 'error');
      const title = prompt('输入头衔（留空清除）', '');
      if (title === null) return;
      
      try {
        const res = await fetch('/qqgm/api/members/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ userIds: ids, title })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
        if (data.ok) loadGroupMembers();
      } catch { showToast('网络错误', 'error'); }
    }

    async function batchSetCard() {
      const ids = getSelectedUserIds();
      if (!ids.length) return showToast('请先选择成员', 'error');
      const card = prompt('输入名片（留空清除）', '');
      if (card === null) return;
      
      try {
        const res = await fetch('/qqgm/api/members/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ userIds: ids, card })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
        if (data.ok) loadGroupMembers();
      } catch { showToast('网络错误', 'error'); }
    }

    async function singleMute(userId) {
      const duration = prompt('禁言时长（秒），0为解禁', '600');
      if (duration === null) return;
      try {
        const res = await fetch('/qqgm/api/members/mute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ userIds: [userId], duration: parseInt(duration) || 0 })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
      } catch { showToast('网络错误', 'error'); }
    }

    async function singleKick(userId) {
      if (!confirm('确定踢出此成员？')) return;
      try {
        const res = await fetch('/qqgm/api/members/kick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ userIds: [userId] })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
        if (data.ok) loadGroupMembers();
      } catch { showToast('网络错误', 'error'); }
    }

    async function toggleMuteAll() {
      const enable = confirm('点击确定开启全员禁言，点击取消关闭全员禁言');
      try {
        const res = await fetch('/qqgm/api/group/muteAll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ enable })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
      } catch { showToast('网络错误', 'error'); }
    }

    async function loadMutedList() {
      try {
        const res = await fetch('/qqgm/api/group/mutedList', { headers: { 'X-QQGM-Token': token } });
        const data = await res.json();
        if (data.ok) {
          const container = document.getElementById('muted-list-container');
          const list = data.mutedList || [];
          container.innerHTML = list.length ? list.map(m => \`
            <div class="list-item">
              <div>
                <span style="font-family:monospace;">\${m.userId}</span>
                <span style="color:var(--text-secondary);margin-left:8px;">\${escapeHtml(m.nickname)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:12px;color:var(--warning);">剩余 \${formatSeconds(m.remaining)}</span>
                <button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;" onclick="singleMute('\${m.userId}')">解禁</button>
              </div>
            </div>
          \`).join('') : '<div style="padding:20px;text-align:center;color:var(--text-muted);">暂无禁言成员</div>';
        }
      } catch {}
    }

    function formatSeconds(sec) {
      if (sec < 60) return sec + '秒';
      if (sec < 3600) return Math.floor(sec/60) + '分' + (sec%60) + '秒';
      if (sec < 86400) return Math.floor(sec/3600) + '时' + Math.floor((sec%3600)/60) + '分';
      return Math.floor(sec/86400) + '天' + Math.floor((sec%86400)/3600) + '时';
    }

    async function loadMessageStats() {
      try {
        const res = await fetch('/qqgm/api/stats/messages', { headers: { 'X-QQGM-Token': token } });
        const data = await res.json();
        if (data.ok) {
          messageStats = data.stats || [];
          renderStats();
        } else {
          showToast(data.message || '加载失败', 'error');
        }
      } catch { showToast('网络错误', 'error'); }
    }

    function renderStats() {
      const sortBy = document.getElementById('stats-sort').value;
      let sorted = [...messageStats];
      
      if (sortBy === 'total') sorted.sort((a,b) => b.totalMessages - a.totalMessages);
      else if (sortBy === 'today') sorted.sort((a,b) => b.todayMessages - a.todayMessages);
      else if (sortBy === 'last') sorted.sort((a,b) => b.lastMessageTime - a.lastMessageTime);

      const totalUsers = messageStats.length;
      const totalMsg = messageStats.reduce((s, m) => s + m.totalMessages, 0);
      const todayMsg = messageStats.reduce((s, m) => s + m.todayMessages, 0);
      
      document.getElementById('stats-total-users').textContent = totalUsers;
      document.getElementById('stats-total-messages').textContent = totalMsg;
      document.getElementById('stats-today-messages').textContent = todayMsg;
      document.getElementById('stats-avg').textContent = totalUsers ? (totalMsg / totalUsers).toFixed(1) : '-';

      const container = document.getElementById('stats-ranking');
      container.innerHTML = sorted.length ? \`
        <table style="width:100%;">
          <thead style="background:var(--bg-hover);position:sticky;top:0;">
            <tr>
              <th style="width:50px;">#</th>
              <th>QQ号</th>
              <th>昵称</th>
              <th style="text-align:right;">总消息</th>
              <th style="text-align:right;">今日</th>
              <th>最后发言</th>
            </tr>
          </thead>
          <tbody>
            \${sorted.slice(0, 100).map((m, i) => \`
              <tr>
                <td style="font-weight:600;color:\${i<3?'var(--warning)':'var(--text-muted)'};">\${i+1}</td>
                <td style="font-family:monospace;">\${m.userId}</td>
                <td>\${escapeHtml(m.nickname || '-')}</td>
                <td style="text-align:right;font-weight:500;">\${m.totalMessages}</td>
                <td style="text-align:right;color:var(--success);">\${m.todayMessages}</td>
                <td style="font-size:12px;color:var(--text-muted);">\${m.lastMessageTime ? new Date(m.lastMessageTime).toLocaleString() : '-'}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \` : '<div style="padding:40px;text-align:center;color:var(--text-muted);">暂无数据</div>';
    }

    async function checkPasswordStatus() {
      try {
        const res = await fetch('/qqgm/api/hasPassword', { headers: { 'X-QQGM-Token': token } });
        const data = await res.json();
        if (data.ok) {
          isPermanentLogin = data.permanent;
          const statusEl = document.getElementById('permanent-pwd-status');
          const delBtn = document.getElementById('del-pwd-btn');
          const expireInfo = document.getElementById('login-expire-info');
          
          if (data.hasPassword) {
            statusEl.innerHTML = '<div style="padding:12px;background:var(--success-bg);border-radius:6px;color:var(--success);">已设置永久密码</div>';
            delBtn.style.display = 'inline-block';
          } else {
            statusEl.innerHTML = '<div style="padding:12px;background:var(--warning);opacity:0.8;border-radius:6px;color:#fff;">未设置永久密码</div>';
            delBtn.style.display = 'none';
          }
          
          if (data.permanent) {
            expireInfo.innerHTML = '使用永久密码登录，会话永不过期';
            expireInfo.style.background = 'var(--success-bg)';
            expireInfo.style.color = 'var(--success)';
            document.getElementById('settings-login-type').textContent = '永久密码登录';
          } else {
            document.getElementById('settings-login-type').textContent = '临时密码登录';
          }
        }
      } catch {}
    }

    async function setPermanentPassword() {
      const pwd = document.getElementById('new-permanent-pwd').value;
      if (!pwd || pwd.length < 6 || pwd.length > 32) {
        return showToast('密码长度需在 6-32 位', 'error');
      }
      try {
        const res = await fetch('/qqgm/api/setPassword', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-QQGM-Token': token },
          body: JSON.stringify({ newPassword: pwd })
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
        if (data.ok) {
          document.getElementById('new-permanent-pwd').value = '';
          checkPasswordStatus();
        }
      } catch { showToast('网络错误', 'error'); }
    }

    async function deletePermanentPassword() {
      if (!confirm('确定删除永久密码？')) return;
      try {
        const res = await fetch('/qqgm/api/deletePassword', {
          method: 'POST',
          headers: { 'X-QQGM-Token': token }
        });
        const data = await res.json();
        showToast(data.message || '操作完成', data.ok ? 'success' : 'error');
        if (data.ok) checkPasswordStatus();
      } catch { showToast('网络错误', 'error'); }
    }

    init();
  </script>
</body>
</html>
`;

export function registerWebRoutes(
  ctx: Context,
  config: Config,
  logger: any,
  getGroup: (groupId: string) => any,
  ensureGroup: (groupId: string) => any,
  records: { punishments: any[]; appeals: any[] },
  doSaveConfig: () => Promise<void>,
  getRoleLevelAsync: (session: any) => Promise<number>,
  tokens: Map<string, TokenData>,
  webPasswords: Map<string, { password: string; createdAt: number }>
) {
  const server = (ctx as any).server;
  if (!server) {
    logger.warn('server 服务未加载，Web 管理系统不可用。请安装 @koishijs/plugin-server');
    return;
  }
  
  // 获取主模块的密码存储
  const getPasswords = (): Map<string, { password: string; createdAt: number }> => {
    return webPasswords;
  };
  
  // 获取永久密码函数
  const getAdminPwdFuncs = () => {
    return (ctx as any).qqgmAdminPassword || {
      get: () => null,
      verify: () => false,
      set: async () => {},
      remove: async () => {},
    };
  };

  // 清理过期 token
  const cleanupTokens = () => {
    const now = Date.now();
    for (const [t, data] of tokens) {
      if (data.expire > 0 && data.expire < now) tokens.delete(t);
    }
  };

  // 验证 Token
  const verifyToken = (tokenStr: string): TokenData | null => {
    cleanupTokens();
    const data = tokens.get(tokenStr);
    if (!data) return null;
    if (data.expire > 0 && data.expire < Date.now()) return null;
    return data;
  };

  // ================= API 路由 =================
  // (API 路由逻辑保持不变，确保功能完整性)

  server.post('/qqgm/api/login', async (kctx: any) => {
    const { groupId, userId, password } = kctx.request.body || {};
    if (!groupId || !userId || !password) return kctx.body = { ok: false, message: '参数不完整' };

    const key = `${groupId}:${userId}`;
    const passwords = getPasswords();
    const tempPwd = passwords.get(key);
    const adminPwd = getAdminPwdFuncs();
    
    let isPermanent = false;
    let isValidPassword = false;
    
    if (adminPwd.verify(groupId, userId, password)) {
      isPermanent = true;
      isValidPassword = true;
    } else if (tempPwd && tempPwd.password === password) {
      const age = Date.now() - tempPwd.createdAt;
      if (age <= 5 * 60 * 1000) isValidPassword = true;
      else {
        passwords.delete(key);
        return kctx.body = { ok: false, message: '临时密码已过期，请重新获取' };
      }
    }
    
    if (!isValidPassword) return kctx.body = { ok: false, message: '密码错误或已过期' };

    let role: 'admin' | 'owner' | 'bot-admin' = 'admin';
    if (Array.isArray(config.admins) && config.admins.includes(String(userId))) {
      role = 'bot-admin';
    } else {
      const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
      if (bot?.internal?.getGroupMemberInfo) {
        try {
          const info = await bot.internal.getGroupMemberInfo(groupId, userId, false);
          if (info?.role === 'owner') role = 'owner';
          else if (info?.role === 'admin') role = 'admin';
          else return kctx.body = { ok: false, message: '您不是群管理员' };
        } catch (e: any) {}
      }
    }

    const token = genToken();
    const expire = isPermanent ? 0 : Date.now() + 2 * 60 * 60 * 1000;
    tokens.set(token, { userId: String(userId), groupId: String(groupId), expire, role, permanent: isPermanent });
    if (!isPermanent) passwords.delete(key);

    return kctx.body = { ok: true, token, role, permanent: isPermanent };
  });

  server.post('/qqgm/api/setPassword', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    const { newPassword } = kctx.request.body || {};
    if (!newPassword || newPassword.length < 6 || newPassword.length > 32) return kctx.body = { ok: false, message: '密码长度需在 6-32 位之间' };
    try {
      await getAdminPwdFuncs().set(data.groupId, data.userId, newPassword);
      return kctx.body = { ok: true, message: '永久密码已设置' };
    } catch (e: any) { return kctx.body = { ok: false, message: e.message }; }
  });
  
  server.post('/qqgm/api/deletePassword', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    try {
      await getAdminPwdFuncs().remove(data.groupId, data.userId);
      return kctx.body = { ok: true, message: '永久密码已删除' };
    } catch (e: any) { return kctx.body = { ok: false, message: e.message }; }
  });
  
  server.get('/qqgm/api/hasPassword', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    const has = getAdminPwdFuncs().get(data.groupId, data.userId) !== null;
    return kctx.body = { ok: true, hasPassword: has, permanent: data.permanent };
  });

  server.get('/qqgm/api/config', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    // 如果群配置不存在，自动创建
    let group = getGroup(data.groupId);
    if (!group) {
      group = ensureGroup(data.groupId);
      await doSaveConfig();
    }
    const groupRecords = records.punishments.filter(p => String(p.groupId) === String(data.groupId)).slice(-100);
    
    // 获取群名称
    let groupName = '未命名群聊';
    const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
    if (bot?.internal?.getGroupInfo) {
      try {
        const groupInfo = await bot.internal.getGroupInfo(data.groupId, false);
        if (groupInfo?.group_name) groupName = groupInfo.group_name;
      } catch {}
    }
    
    // 获取机器人在该群的角色（判断是否群主）
    let botRole = 'member';
    if (bot?.internal?.getGroupMemberInfo && bot?.selfId) {
      try {
        const botInfo = await bot.internal.getGroupMemberInfo(data.groupId, bot.selfId, false);
        botRole = botInfo?.role || 'member';
      } catch {}
    }
    
    return kctx.body = { ok: true, group, records: groupRecords, role: data.role, groupName, botRole };
  });

  server.post('/qqgm/api/config', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    const group = ensureGroup(data.groupId);
    const patch = kctx.request.body || {};
    const allowedFields = ['enabled', 'autoApprove', 'whitelist', 'blacklist', 'graylist', 'forbidden', 'spam', 'penalty', 'autoRecall', 'joinVerify', 'joinNotice', 'leaveNotice', 'welcomeGuide', 'announcement', 'atAll', 'appeal'];
    for (const field of allowedFields) if (patch[field] !== undefined) group[field] = patch[field];
    try {
      await doSaveConfig();
      if ((ctx as any).scope?.update) (ctx as any).scope.update(config, true);
      return kctx.body = { ok: true };
    } catch (e: any) { return kctx.body = { ok: false, message: '保存失败' }; }
  });

  // 获取群成员列表
  server.get('/qqgm/api/members', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
    if (!bot?.internal?.getGroupMemberList) return kctx.body = { ok: false, message: 'Bot 不可用' };
    try {
      const members = await bot.internal.getGroupMemberList(data.groupId);
      const formatted = (members || []).map((m: any) => ({
        userId: String(m.user_id),
        nickname: m.nickname || '',
        card: m.card || '',
        role: m.role || 'member',
        joinTime: m.join_time || 0,
        lastSentTime: m.last_sent_time || 0,
        title: m.title || '',
        shutUpTimestamp: m.shut_up_timestamp || 0,
      }));
      return kctx.body = { ok: true, members: formatted };
    } catch (e: any) { return kctx.body = { ok: false, message: e.message }; }
  });

  // 批量操作 (kick, mute, etc) - 保持与原逻辑一致
  server.post('/qqgm/api/members/kick', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    const { userIds } = kctx.request.body || {};
    const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
    if (!bot?.internal?.setGroupKick) return kctx.body = { ok: false, message: 'Bot 不可用' };
    for (const userId of userIds) try { await bot.internal.setGroupKick(data.groupId, userId, false); } catch {}
    return kctx.body = { ok: true, message: '操作完成' };
  });

  server.post('/qqgm/api/members/mute', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    const { userIds, duration } = kctx.request.body || {};
    const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
    if (!bot?.internal?.setGroupBan) return kctx.body = { ok: false, message: 'Bot 不可用' };
    for (const userId of userIds) try { await bot.internal.setGroupBan(data.groupId, userId, duration); } catch {}
    return kctx.body = { ok: true, message: '操作完成' };
  });

  server.post('/qqgm/api/members/title', async (kctx: any) => {
      const token = String(kctx.request.headers['x-qqgm-token'] || '');
      const data = verifyToken(token);
      if (!data) return kctx.body = { ok: false, message: '未登录' };
      const { userIds, title } = kctx.request.body || {};
      const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
      if (!bot?.internal?.setGroupSpecialTitle) return kctx.body = { ok: false, message: 'Bot 不可用' };
      for (const userId of userIds) try { await bot.internal.setGroupSpecialTitle(data.groupId, userId, title || '', -1); } catch {}
      return kctx.body = { ok: true, message: '操作完成' };
  });

  server.post('/qqgm/api/members/card', async (kctx: any) => {
      const token = String(kctx.request.headers['x-qqgm-token'] || '');
      const data = verifyToken(token);
      if (!data) return kctx.body = { ok: false, message: '未登录' };
      const { userIds, card } = kctx.request.body || {};
      const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
      if (!bot?.internal?.setGroupCard) return kctx.body = { ok: false, message: 'Bot 不可用' };
      for (const userId of userIds) try { await bot.internal.setGroupCard(data.groupId, userId, card || ''); } catch {}
      return kctx.body = { ok: true, message: '操作完成' };
  });

  server.post('/qqgm/api/group/muteAll', async (kctx: any) => {
      const token = String(kctx.request.headers['x-qqgm-token'] || '');
      const data = verifyToken(token);
      if (!data) return kctx.body = { ok: false, message: '未登录' };
      const { enable } = kctx.request.body || {};
      const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
      if (!bot?.internal?.setGroupWholeBan) return kctx.body = { ok: false, message: 'Bot 不可用' };
      try { await bot.internal.setGroupWholeBan(data.groupId, enable); return kctx.body = { ok: true }; } catch(e) { return kctx.body = { ok: false, message: String(e) }; }
  });

  server.get('/qqgm/api/group/mutedList', async (kctx: any) => {
      const token = String(kctx.request.headers['x-qqgm-token'] || '');
      const data = verifyToken(token);
      if (!data) return kctx.body = { ok: false, message: '未登录' };
      const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
      if (!bot?.internal?.getGroupMemberList) return kctx.body = { ok: false, message: 'Bot 不可用' };
      try {
          const members = await bot.internal.getGroupMemberList(data.groupId);
          const now = Math.floor(Date.now() / 1000);
          const muted = (members || []).filter((m: any) => m.shut_up_timestamp && m.shut_up_timestamp > now)
              .map((m: any) => ({ userId: String(m.user_id), nickname: m.card||m.nickname, remaining: m.shut_up_timestamp - now }));
          return kctx.body = { ok: true, mutedList: muted };
      } catch(e) { return kctx.body = { ok: false, message: String(e) }; }
  });

  server.get('/qqgm/api/stats/messages', async (kctx: any) => {
    const token = String(kctx.request.headers['x-qqgm-token'] || '');
    const data = verifyToken(token);
    if (!data) return kctx.body = { ok: false, message: '未登录' };
    const msgStats = (ctx as any).qqgmMessageStats || new Map();
    const groupStats = msgStats.get(data.groupId) || {};
    const bot = ctx.bots.find(b => b.platform === 'onebot') as any;
    let memberMap = new Map<string, string>();
    if (bot?.internal?.getGroupMemberList) {
        try { const ms = await bot.internal.getGroupMemberList(data.groupId); for (const m of ms) memberMap.set(String(m.user_id), m.card || m.nickname); } catch {}
    }
    const stats = Object.entries(groupStats).map(([userId, d]: [string, any]) => ({
      userId, nickname: memberMap.get(userId) || userId, totalMessages: d.total || 0, todayMessages: d.today || 0, lastMessageTime: d.lastTime || 0
    })).sort((a, b) => b.totalMessages - a.totalMessages);
    return kctx.body = { ok: true, stats };
  });

  server.get('/qqgm', (kctx: any) => { kctx.type = 'text/html'; kctx.body = getAdminPageHtml(); });
  server.get('/qqgm/login/:token', (kctx: any) => {
    const { token } = kctx.params;
    const data = verifyToken(token);
    if (!data) { kctx.body = '链接已过期'; return; }
    kctx.type = 'text/html';
    kctx.body = `<script>localStorage.setItem('qqgm_token', '${token}');window.location.href = '/qqgm';</script>`;
  });
  
  logger.info('Web 管理系统路由已注册');
}