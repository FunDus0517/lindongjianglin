# iOS 外壳（给全能签这类第三方签名服务用）

这个目录**不是**把网页打包成 App —— IPA 里的可执行文件只能由 Apple 的 Xcode 编译，而 Xcode 只在 macOS 上跑。
这里存放的是那层"壳"的工程源码，编译交给 GitHub 的免费 macOS 机器（`.github/workflows/ios.yml`）。

## 它是什么

一个 ~120 行的 Swift 程序：全屏 `WKWebView`，打开 `http://59.153.167.60:8080/`，没有浏览器地址栏、没有标签页。

**内容全在服务器上**，所以：

- 改游戏内容 → 只改服务器 → App 下次打开就是新的，**不用重新编译、不用重新签名、不用重新安装**
- 服务器换地址 → 改 `Sources/App.swift` 里的 `siteURL` 一行，重新出包一次
- 断网 → 显示一个能重试的提示页（不是白屏）

已知取舍：**v1 必须联网**（内容不在包里）。如果要离线也能玩，得改成"内置副本 + 云端同步"，
那需要给 App 内嵌一个本机 HTTP 服务（自定义 scheme 的 `localStorage` 行为在 iOS 上不可靠），是下一步的事。

## 出包流程

推送到 `main` 且 `ios/**` 有改动 → GitHub Actions 自动编译 → 产出**未签名 IPA**：

- Releases 里的固定链接（公网可直接下载）：
  `https://github.com/<用户名>/<仓库名>/releases/download/latest-ipa/Winterfall.ipa`
- 或 Actions 页面的 Artifacts（需要登录才能下）

拿到 IPA 后：**全能签 → 上传 IPA → 签名 → 安装**。未签名正是对的，签名由全能签完成。

## 本地编译（需要一台 Mac）

```bash
brew install xcodegen
cd ios && xcodegen generate
open Winterfall.xcodeproj     # 然后 Archive，或直接跑到真机上
```

`Winterfall.xcodeproj` 是生成物，不入库；工程描述在 `project.yml`。

## 两个关键文件

- `Sources/App.swift` — 外壳本体，`siteURL` 在这里改
- `Sources/Info.plist` — 显示名「凛冬降临」、竖屏、状态栏浅色、
  以及 `NSAppTransportSecurity`（服务器是明文 http，未备案 IP 上不了 443，所以必须放开 ATS）

图标：`Sources/Assets.xcassets/AppIcon.appiconset/Icon-1024.png`（1024×1024，不透明、不留圆角，iOS 自己会裁）。
这份图是从仓库根目录的 `icon.svg` 渲染的，改图标就重渲染一次这张 PNG。
