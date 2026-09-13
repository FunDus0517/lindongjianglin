// 《凛冬降临》iOS 外壳
//
// 设计取舍：游戏内容放在服务器上（http://59.153.167.60:8080/），App 只做一件事——
// 全屏、无浏览器界面的打开它。好处是内容更新只要改服务器，永远不用重新出包、重新签名。
// 代价是需要联网；断网时给一个能重试的提示页，而不是白屏。
import UIKit
import WebKit

/// 游戏内容地址。换域名/换服务器就改这一行。
private let siteURL = URL(string: "http://59.153.167.60:8080/")!

final class GameViewController: UIViewController, WKNavigationDelegate {

    private var webView: WKWebView!

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

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
        loadSite()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    private func loadSite() {
        var request = URLRequest(url: siteURL)
        request.timeoutInterval = 20
        request.cachePolicy = .reloadRevalidatingCacheData
        webView.load(request)
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showOfflineNotice()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
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
          button{-webkit-appearance:none;border:0;border-radius:10px;background:#2f6df6;color:#fff;
            font-size:16px;font-weight:600;padding:14px 0;width:100%}
          code{color:#5d6a80;font-size:11px;word-break:break-all}
        </style></head><body><div class="box">
          <h1>连不上服务器</h1>
          <p>游戏内容在服务器上，需要联网才能打开。<br>检查网络后重试。</p>
          <button onclick="location.href='\(siteURL.absoluteString)'">重试</button>
          <p style="margin-top:18px"><code>\(siteURL.absoluteString)</code></p>
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
