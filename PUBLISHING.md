# 发布指引（GitHub / Greasy Fork / OpenUserJS / 暴力猴）

> 说明：Greasy Fork、OpenUserJS 等脚本托管站**没有提供可程序化提交的写入 API**（Greasy Fork 为只读 JSON API，仅提供需登录会话的“预填表单”链接，最终仍需人工审核提交）。Tampermonkey / Violentmonkey 也没有公开的“市场上传 API”。因此发布到市场需要在网页上人工提交，以下为可直接复制的提交素材。

---

## 一、GitHub（已完成 ✅）

- 仓库：https://github.com/lizhengyang-byte/cx-paste-unlock
- 默认分支：`main`
- 脚本直链（供脚本管理器安装）：
  `https://github.com/lizhengyang-byte/cx-paste-unlock/raw/main/学习通解除粘贴限制.user.js`

> 建议再发一个 **Release v2.0.0**，并把 `.user.js` 作为附件，方便 `@downloadURL/@updateURL` 自动更新。

---

## 二、Greasy Fork（油猴市场）提交

提交地址：https://greasyfork.org/zh-CN/scripts/new  （需登录）

> 注意：Greasy Fork 审核规则**不允许发布“绕过网站功能限制”类脚本**，此类脚本可能被拒绝或下架。提交前请知晓该风险；若被拒，可改用 GitHub raw 直链分发，或发布到允许此类内容的平台。

**填写字段：**

| 字段 | 内容 |
| --- | --- |
| 脚本名称 | 学习通 · 解除粘贴限制 |
| 命名空间 (Namespace) | cx-paste-unlock |
| 版本 | 2.0.0 |
| 描述 | 解除学习通网页端（含 UEditor 富文本作答框）对粘贴/复制/剪切/右键/选中的限制，覆盖页面内所有 iframe |
| 语言 | 中文 |
| 许可证 | MIT |
| 适用范围（@match） | 见脚本文本，粘贴脚本文本即可自动识别 |
| 脚本代码 | 粘贴 `学习通解除粘贴限制.user.js` 全部内容 |

**附加元数据建议追加到脚本头（Greasy Fork 自动更新用）：**

```
// @downloadURL https://update.greasyfork.org/scripts/XXXXXX/学习通%20·%20解除粘贴限制.user.js
// @updateURL   https://update.greasyfork.org/scripts/XXXXXX/学习通%20·%20解除粘贴限制.user.js
```
（`XXXXXX` 为提交后生成的真实脚本 ID，提交成功后 Greasy Fork 会提示下载链接。）

---

## 三、OpenUserJS 提交

提交地址：https://openuserjs.org/  （注册后 → “+”/New Script）

- 新建后粘贴 `学习通解除粘贴限制.user.js` 内容。
- OpenUserJS 支持通过 GitHub 仓库同步（在其设置里绑定 GitHub repo，选择 `.user.js` 文件路径），可做到后续自动同步。
- OpenUserJS 同样有内容审核，合规性同 Greasy Fork。

---

## 四、暴力猴（Violentmonkey）/ 油猴（Tampermonkey）安装

这两个是**脚本管理器**，不是脚本商店，通过安装链接即可分发给用户：

1. 用户先装好 Tampermonkey 或 Violentmonkey 扩展；
2. 打开 GitHub raw 直链（脚本管理器会拦截并弹出安装页）：
   `https://github.com/lizhengyang-byte/cx-paste-unlock/raw/main/学习通解除粘贴限制.user.js`
3. 点击“安装 / 确认”。

如需“一行安装”按钮，可在任意网页放：
```html
<a href="https://github.com/lizhengyang-byte/cx-paste-unlock/raw/main/学习通解除粘贴限制.user.js">安装脚本</a>
```

---

## 五、（可选）Greasy Fork 预填表单自动化

若想减少手填，可构造预填链接（需在已登录 Greasy Fork 的浏览器中打开并提交，仍为人工确认）：

- 新建预填：`https://greasyfork.org/en/script_versions/prefill`（POST `script_version[code]`）

因其要求用户会话 Cookie 且最终人工提交，本项目不提供绕过审核的自动化脚本。

---

## 六、发布检查清单

- [x] 脚本已抹除作者姓名与个人标识（`@author` 已移除，`@namespace` 为中性标识）
- [x] `node --check` 语法校验通过
- [x] README / LICENSE / .gitignore 齐备
- [x] GitHub 仓库已公开
- [ ] （人工）创建 Release 附件 `学习通解除粘贴限制.user.js`
- [ ] （人工）Greasy Fork / OpenUserJS 网页提交
