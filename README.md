# 学习通 · 解除粘贴限制

> 一个轻量的用户脚本（UserScript），解除学习通网页端对「粘贴 / 复制 / 剪切 / 右键菜单 / 选中」的限制，
> 包括基于 **UEditor** 富文本编辑器实现的主观题作答框。支持页面内所有 iframe。

[![GitHub release](https://img.shields.io/github/v/release/lizhengyang-byte/cx-paste-unlock?color=blue)](https://github.com/lizhengyang-byte/cx-paste-unlock/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#许可证)
![Platform](https://img.shields.io/badge/Platform-Tampermonkey%20%7C%20Violentmonkey%20%7C%20Greasemonkey-orange)

---

## 功能特性

- ✅ **解除粘贴**：主观题作答框（UEditor 富文本）内 `Ctrl+V` 正常落字
- ✅ **解除复制 / 剪切**
- ✅ **恢复右键菜单**
- ✅ **强制可选中**（覆盖 `user-select: none`）
- ✅ **覆盖 iframe**：脚本在页面每个子框架独立运行
- ✅ **保留编辑器排版能力**：不破坏 UEditor 的格式、字号、附件等功能

## 原理

学习通作业作答框本质是 UEditor 富文本编辑器，站点通过注册 `beforepaste` 监听器拦截粘贴：

```js
// 站点源码（示例）
function editorPaste(o, html) {
    html.html = "";                 // 清空待粘贴内容
    $.toast({ content: "只能录入不能粘贴!" });
    return false;
}
editor1.addListener('beforepaste', editorPaste);
```

UEditor 内部在触发 `beforepaste` 后判断 `if (!html.html) return;`，于是粘贴被中止。

本脚本在其他手段之外，核心做法是**劫持 `UE.EventBase.prototype.fireEvent`**：

1. 在触发 `beforepaste` 前备份 `html.html` 原文；
2. 监听器（`editorPaste`）执行、内容被清空后，立刻把原文写回；
3. 若仍为空，则从剪贴板文本重建内容，确保 `html.html` 非空，粘贴正常落地。

同时提供 DOM 层兜底：`preventDefault()` 失效、`onxxx` 内联属性中和、`MutationObserver` 清扫新增节点、普通输入框补粘等。

## 安装

### 方式一：一键安装（推荐）

1. 先安装用户脚本管理器：
   - [Tampermonkey（油猴）](https://www.tampermonkey.net/)
   - [Violentmonkey（暴力猴）](https://violentmonkey.github.io/)
   - [Greasemonkey](https://www.greasespot.net/)
2. 打开本仓库的脚本地址，脚本管理器会自动弹出安装提示：
   - [学习通解除粘贴限制.user.js](https://github.com/lizhengyang-byte/cx-paste-unlock/raw/main/学习通解除粘贴限制.user.js)
3. 点击「安装」即可。

### 方式二：Greasy Fork 安装

在 [Greasy Fork](https://greasyfork.org/) 搜索「学习通 解除粘贴限制」，进入详情页点击安装。

### 方式三：手动安装

1. 复制 [`学习通解除粘贴限制.user.js`](./学习通解除粘贴限制.user.js) 全部内容；
2. 打开脚本管理器 → 新建脚本 → 粘贴覆盖 → 保存。

## 使用方法

安装后无需任何操作。打开学习通作业作答页面，直接在作答框内 `Ctrl+V` 即可正常粘贴。

## 适用站点

脚本在以下域名自动生效：

- `*.chaoxing.com` / `chaoxing.com`
- `*.xuexitong.com`
- `*.chaoxing.cn`
- `*.cxfanya.com`
- `*.cxerya.com`

## 常见问题

**Q：粘贴后右下角出现「粘贴已解除限制」提示，可以关掉吗？**
A：可以。打开脚本编辑，把 `CONFIG.showToast` 改为 `false`。

**Q：某个页面仍然无法粘贴？**
A：把脚本里的 `CONFIG.debug` 改为 `true`，打开浏览器控制台（F12）查看 `[CX-Paste]` 日志，提交 [Issue](https://github.com/lizhengyang-byte/cx-paste-unlock/issues) 反馈。

**Q：会不会影响编辑器自带的格式/附件功能？**
A：不会。脚本只放行粘贴内容，不清除监听器、不破坏编辑器管道。

## 免责声明

本脚本仅供学习交流与个人效率研究使用。请遵守所在平台的服务条款及相关法律法规，由使用者自行承担使用风险。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。
