import Foundation
import Network

/// 一个极小的 HTTP/1.1 静态文件服务，只监听 127.0.0.1 的**固定端口**。
///
/// 为什么要它：WKWebView 里 `file://` 打不开 ES 模块、自定义 scheme 的 localStorage 又不可靠，
/// 而游戏依赖 `import` 与 localStorage 存档。用一个真实 http origin 服务本机文件，
/// 两个问题一起解决，并且断网也能玩。
///
/// 端口必须固定：localStorage 按「协议+主机+端口」隔离，端口一变存档就丢了。
final class LocalServer {

    static let port: UInt16 = 8731

    private let queue = DispatchQueue(label: "winterfall.local-server")
    private let root: URL
    private var listener: NWListener?
    private let ready = DispatchSemaphore(value: 0)
    private var failed = false

    init(root: URL) { self.root = root }

    /// 启动并等待就绪。返回是否成功监听（失败就由调用方回退到远程地址）。
    func start(timeout: TimeInterval = 3) -> Bool {
        do {
            let params = NWParameters.tcp
            params.allowLocalEndpointReuse = true
            params.requiredInterfaceType = .loopback
            let port = NWEndpoint.Port(rawValue: LocalServer.port)!
            let listener = try NWListener(using: params, on: port)
            listener.stateUpdateHandler = { [weak self] state in
                switch state {
                case .ready: self?.ready.signal()
                case .failed, .cancelled: self?.failed = true; self?.ready.signal()
                default: break
                }
            }
            listener.newConnectionHandler = { [weak self] conn in self?.accept(conn) }
            listener.start(queue: queue)
            self.listener = listener
        } catch {
            return false
        }
        if ready.wait(timeout: .now() + timeout) == .timedOut { return false }
        return !failed
    }

    func stop() {
        listener?.cancel()
        listener = nil
    }

    // MARK: - 连接处理

    private func accept(_ conn: NWConnection) {
        conn.start(queue: queue)
        read(conn, buffer: Data())
    }

    private func read(_ conn: NWConnection, buffer: Data) {
        conn.receive(minimumIncompleteLength: 1, maximumLength: 16 * 1024) { [weak self] data, _, isComplete, error in
            guard let self = self else { return }
            var buf = buffer
            if let d = data { buf.append(d) }

            if let sep = buf.range(of: Data("\r\n\r\n".utf8)) {
                let head = String(decoding: buf[buf.startIndex..<sep.lowerBound], as: UTF8.self)
                self.respond(conn, head: head)
                return
            }
            if error != nil || isComplete || buf.count > 128 * 1024 {
                conn.cancel()
                return
            }
            self.read(conn, buffer: buf)
        }
    }

    private func respond(_ conn: NWConnection, head: String) {
        let requestLine = head.split(separator: "\r\n").first.map(String.init) ?? ""
        let parts = requestLine.split(separator: " ")
        let rawPath = parts.count >= 2 ? String(parts[1]) : "/"
        let withoutQuery = rawPath.split(separator: "?").first.map(String.init) ?? rawPath
        let decoded = withoutQuery.removingPercentEncoding ?? withoutQuery
        let relative = decoded == "/" ? "index.html" : String(decoded.drop(while: { $0 == "/" }))

        // 输入校验：任何情况下都不许越出站点根目录（即使是本机服务也留一道门）
        let rootStd = root.standardizedFileURL
        let target = URL(fileURLWithPath: relative, relativeTo: rootStd).standardizedFileURL
        guard target.path == rootStd.path || target.path.hasPrefix(rootStd.path + "/") else {
            send(conn, status: "403 Forbidden", contentType: "text/plain; charset=utf-8", body: Data("forbidden".utf8))
            return
        }
        guard let body = try? Data(contentsOf: target) else {
            send(conn, status: "404 Not Found", contentType: "text/plain; charset=utf-8", body: Data("not found".utf8))
            return
        }
        send(conn, status: "200 OK", contentType: LocalServer.mime(target.pathExtension), body: body)
    }

    private func send(_ conn: NWConnection, status: String, contentType: String, body: Data) {
        var header = "HTTP/1.1 \(status)\r\n"
        header += "Content-Type: \(contentType)\r\n"
        header += "Content-Length: \(body.count)\r\n"
        header += "Cache-Control: no-cache\r\n"
        header += "Connection: close\r\n\r\n"
        var out = Data(header.utf8)
        out.append(body)
        conn.send(content: out, completion: .contentProcessed { _ in conn.cancel() })
    }

    /// 只覆盖站点真正会用到的类型；未知类型一律按二进制给，避免浏览器按 HTML 解析出错。
    static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "webmanifest": return "application/manifest+json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "ico": return "image/x-icon"
        case "txt", "md": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}
