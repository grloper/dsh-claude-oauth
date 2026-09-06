# dsh-claude-oauth

[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/grloper/dsh-claude-oauth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![DSH 兼容性](https://img.shields.io/badge/DSH-0.1.0--rc.6%20%7C%200.1.2-green.svg)](https://github.com/deepseek-ai/deepseek-harness)
[![作者](https://img.shields.io/badge/author-grloper-orange.svg)](https://github.com/grloper)

**DeepSeek Harness (DSH) 官方 Web 界面的 Claude Pro / Max 订阅 OAuth 插件** — 支持直接在 DSH 设置界面通过 Google / Gmail 账号一键授权登录，自动刷新 Token，实时发现模型目录，并在设置与对话底栏中展示真实的 5 小时与 7 天额度监控条与重置倒计时。

[English](README.md) · [简体中文](README.zh.md) · [技术文章](ARTICLE.md)

---

## 界面效果

![Claude 设置界面](assets/claude-settings-ui.svg)

---

## 核心特性

* 🚀 **设置页一键 Google / Gmail 登录**：在 DSH 设置侧边栏拥有独立 **Claude** 页面（排序 `13`，位于 Antigravity 与 Codex 之间）。点击 **"Sign in with Google / Gmail"** 即可调起浏览器授权。
* ⚡ **告别终端复杂配置**：无需手动提取 CLI Token、复制粘贴长密钥或手工修改 YAML 文件。
* 🔄 **双栈 PKCE OAuth 回调服务**：内置临时双栈 loopback 回调服务，同时监听 IPv4 (`127.0.0.1`) 与 IPv6 (`::1`)，彻底避免 Windows 环境下 localhost 解析陷阱。
* 🛡️ **多存储凭据同步**：完成登录后自动将凭据同步至：
  * `~/.claude/.credentials.json`（与 Claude Code 官方 CLI 共享授权）
  * `~/.dsh/.credentials.yaml`（`ANTHROPIC_OAUTH_TOKEN` 与 `CLAUDE_CODE_OAUTH_TOKEN`）
  * `~/.dsh/settings.yaml`（自动挂载 `llm-pi-ai.providers.anthropic` 及可用模型）
* 📊 **实时额度与速率监控**：从 `/v1/messages` 统一频率限制头（Unified Rate Limit Headers）解析真实的 5 小时与 7 天使用率百分比及重置时间，展示在设置界面与聊天输入框底栏。
* 🤖 **动态模型发现**：启动时自动请求 `GET /v1/models`，无需硬编码模型列表，新版 Claude（如 3.7 Sonnet、4.5 Sonnet、Opus 等）自动可用。

---

## 架构流程图

![OAuth 架构流程图](assets/oauth-architecture.svg)

---

## 快速上手

### 安装插件

安装 `dsh-claude-oauth` 到当前 DSH Web Profile：

```bash
# 从 GitHub 仓库安装
dsh plugin --profile web add github:grloper/dsh-claude-oauth

# 或从本地源码安装
dsh plugin --profile web add ./dsh-claude-oauth
```

### 在 Web 设置中登录

1. 启动或打开 DeepSeek Harness Web GUI：
   ```bash
   dsh web
   ```
2. 点击左下角齿轮图标进入 **Settings（设置）**。
3. 在左侧菜单点击 **Claude (Anthropic)**。
4. 点击右上角的 **"Sign in with Google / Gmail"** 按钮。
5. 浏览器将自动打开 Claude 官方授权页，点击 **"Continue with Google"**，选择您的 Gmail 邮箱并确认授权。
6. 浏览器提示 **"Claude Connected"** 后返回 DSH 界面，设置页将自动展示您的 Gmail 账号、订阅类型（Pro / Max）、额度进度条与可用模型。

### 命令行辅助登录（可选）

也可直接在终端运行内置登录命令：

```bash
claude-oauth-login
# 或通过 npx
npx dsh-claude-oauth
```

---

## 设为默认模型

若需将 Claude Sonnet 4.5 设为所有会话的默认模型，在 `~/.dsh/settings.yaml` 中配置：

```yaml
agent-default-model:
  provider: anthropic
  model: claude-sonnet-4-5
```

---

## 开源协议

[MIT](LICENSE) © 2026 [grloper](https://github.com/grloper)
