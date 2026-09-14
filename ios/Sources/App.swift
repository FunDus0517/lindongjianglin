// 《凛冬降临》iOS 外壳
//
// 加载顺序（每一步失败都往后退一层，绝不留白屏）：
//   1. 沙盒里的本机站点（http://127.0.0.1:8731，断网也能玩，localStorage 存档稳定）
//   2. 服务器上的在线站点（Content.remoteBase）
//   3. 一张能重试的离线提示页
//
// 内容更新：本机模式下每次启动在后台拉一次 site-bundle.json，版本变了就整包替换并重载 ——
// 改游戏内容只改服务器，不用重新编译、不用重新签名、不用重装。
import UIKit
import WebKit

final class GameViewController: UIViewController, WKNavigationDelegate {

    private var webView: WKWebView!
    private var server: LocalServer?
    private var usingLocal = false

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // 震动桥：网页里 core/haptics.js 会往这里发消息，iOS 端负责真的震一下。
        config.userContentController.add(WeakMessageHandler(self), name: "haptic")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.scrollView.bounces = false
        // 页面自己用 env(safe-area-inset-*) 处理刘海和底部横条，这里不要再叠加一次内边距
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        let background = UIColor(red: 0.024, green: 0.035, blue: 0.067, alpha: 1)
        webView.backgroundColor = background
        webView.scrollView.backgroundColor = background

        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        start()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    // MARK: - 启动顺序

    private func start() {
        guard Content.ensureSeed() else {
            load(Content.remoteBase, local: false)
            return
        }
        let server = LocalServer(root: Content.root)
        guard server.start() else {
            // 端口被占或监听失败：直接用在线站点，行为与升级前一致
            load(Content.remoteBase, local: false)
            return
        }
        self.server = server

        let localURL = URL(string: "http://127.0.0.1:\(LocalServer.port)/index.html")!
        var probe = URLRequest(url: localURL)
        probe.timeoutInterval = 6
        probe.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: probe) { [weak self] data, response, error in
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let ok = error == nil && status == 200 && (data?.count ?? 0) > 200
            DispatchQueue.main.async {
                // 探针确认本机服务真的能给出首页，才切到本机模式
                self?.load(ok ? localURL : Content.remoteBase, local: ok)
            }
        }.resume()
    }

    private func load(_ url: URL, local: Bool) {
        usingLocal = local
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.cachePolicy = .reloadRevalidatingCacheData
        webView.load(request)
        checkForUpdate()
    }

    /// 后台检查内容版本；本机模式下有新版本就重载页面。
    private func checkForUpdate() {
        Content.updateIfNeeded { [weak self] changed in
            guard changed else { return }
            DispatchQueue.main.async {
                guard let self = self, self.usingLocal else { return }
                self.webView.reload()
            }
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        recover()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        recover()
    }

    /// 本机失败就退到在线，在线失败才显示提示页。
    private func recover() {
        if usingLocal {
            usingLocal = false
            load(Content.remoteBase, local: false)
            return
        }
        server?.stop()
        showOfflineNotice()
    }

    /// 断网 / 服务器不可达：给一个能重试的页面，而不是白屏或系统错误页
    private func showOfflineNotice() {
        let html = """
        <!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
        <style>
          html,body{margin:0;height:100%;background:#060911;color:#e9eefb;
            font:16px/1.75 -apple-system,"PingFang SC",sans-serif;
            padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            box-sizing:border-box;display:flex;align-items:center;justify-content:center}
          .box{max-width:20em;padding:24px;text-align:center}
          h1{font-size:19px;margin:0 0 10px;font-weight:600}
          p{color:#8a97ad;font-size:14px;margin:0 0 22px}
          button{-webkit-appearance:none;border:0;border-radius:16px;background:#2f6df6;color:#fff;
            font-size:16px;font-weight:600;padding:14px 0;width:100%}
          code{color:#5d6a80;font-size:11px;word-break:break-all}
        </style></head><body><div class="box">
          <h1>连不上服务器</h1>
          <p>本机副本没有就绪，服务器也暂时联系不上。<br>检查网络后重试。</p>
          <button onclick="location.href='\(Content.remoteBase.absoluteString)'">重试</button>
          <p style="margin-top:18px"><code>\(Content.remoteBase.absoluteString)</code></p>
        </div></body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }
}

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = GameViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

/// 震动反馈（无限生存方案 §九：爽感反馈）。
/// 网页没有 iOS 震动 API，所以这里接住 core/haptics.js 发来的消息，用系统触感引擎震一下。
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {

    private weak var target: GameViewController?

    init(_ target: GameViewController) { self.target = target }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        let kind = (message.body as? String) ?? "light"
        target?.feedback(kind)
    }
}

extension GameViewController {

    /// 把网页传过来的语义映射到系统触感强度。
    func feedback(_ kind: String) {
        switch kind {
        case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}
