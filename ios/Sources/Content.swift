import Foundation

/// 站点内容的本地副本与"云端更新"。
///
/// 设计：App 里**内置**一份完整站点（构建时从仓库复制进 bundle），首次运行复制到沙盒；
/// 之后每次启动在后台向服务器要一份单文件清单 `site-bundle.json`，版本不同就整包替换。
/// 这样：断网可玩（用沙盒里的副本），联网自动更新（改服务器即生效，不用重新签名）。
enum Content {

    /// 服务器地址（换域名只改这一行）。
    static let remoteBase = URL(string: "http://59.153.167.60:8080")!

    private static let versionKey = "winterfall.content.version"

    /// 沙盒里的站点根目录。
    static var root: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("winterfall-www", isDirectory: true)
    }

    /// 内置站点在 bundle 里的位置（project.yml 把 ios/www 作为文件夹引用打进包）。
    static var bundled: URL? {
        guard let res = Bundle.main.resourceURL else { return nil }
        let url = res.appendingPathComponent("www", isDirectory: true)
        return FileManager.default.fileExists(atPath: url.appendingPathComponent("index.html").path) ? url : nil
    }

    /// 沙盒里是否已有可用站点。
    static var hasLocalCopy: Bool {
        FileManager.default.fileExists(atPath: root.appendingPathComponent("index.html").path)
    }

    /// 首次运行：把内置站点复制到沙盒。已有则不动（保留玩家可能更新过的版本）。
    @discardableResult
    static func ensureSeed() -> Bool {
        if hasLocalCopy { return true }
        guard let src = bundled else { return false }
        do {
            try? FileManager.default.removeItem(at: root)
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            try copyTree(from: src, to: root)
            return hasLocalCopy
        } catch {
            return false
        }
    }

    private static func copyTree(from src: URL, to dst: URL) throws {
        let fm = FileManager.default
        guard let walker = fm.enumerator(at: src, includingPropertiesForKeys: [.isDirectoryKey], options: [.skipsHiddenFiles]) else { return }
        for case let item as URL in walker {
            let rel = item.path.replacingOccurrences(of: src.path, with: "")
            let target = dst.appendingPathComponent(rel)
            let isDir = (try? item.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) ?? false
            if isDir {
                try fm.createDirectory(at: target, withIntermediateDirectories: true)
            } else {
                try? fm.removeItem(at: target)
                try fm.copyItem(at: item, to: target)
            }
        }
    }

    /// 后台检查服务器上的内容版本；有新版本就整包替换。回调 true 表示内容变了（调用方应重载页面）。
    static func updateIfNeeded(completion: @escaping (Bool) -> Void) {
        let url = remoteBase.appendingPathComponent("download/site-bundle.json")
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.cachePolicy = .reloadIgnoringLocalCacheData

        URLSession.shared.dataTask(with: request) { data, _, error in
            guard error == nil, let data = data, !data.isEmpty else {
                completion(false)
                return
            }
            guard
                let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                let version = json["version"] as? String,
                let files = json["files"] as? [String: String]
            else {
                completion(false)
                return
            }
            let known = UserDefaults.standard.string(forKey: versionKey)
            if known == version && hasLocalCopy {
                completion(false)
                return
            }
            let ok = write(files: files)
            if ok { UserDefaults.standard.set(version, forKey: versionKey) }
            completion(ok)
        }.resume()
    }

    /// 整包写入：先写临时目录，再原子替换，避免更新到一半的站点被加载。
    private static func write(files: [String: String]) -> Bool {
        let fm = FileManager.default
        let base = root.deletingLastPathComponent()
        let staging = base.appendingPathComponent("winterfall-www-staging", isDirectory: true)
        let backup = base.appendingPathComponent("winterfall-www-old", isDirectory: true)
        do {
            try? fm.removeItem(at: staging)
            try fm.createDirectory(at: staging, withIntermediateDirectories: true)
            for (path, text) in files {
                // 清单来自网络：拒绝任何试图跳出站点根目录的路径
                let clean = path.replacingOccurrences(of: "..", with: "")
                guard !clean.hasPrefix("/") , !clean.isEmpty else { continue }
                let target = staging.appendingPathComponent(clean)
                try fm.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
                try Data(text.utf8).write(to: target)
            }
            guard fm.fileExists(atPath: staging.appendingPathComponent("index.html").path) else { return false }

            try? fm.removeItem(at: backup)
            if fm.fileExists(atPath: root.path) { try fm.moveItem(at: root, to: backup) }
            try fm.moveItem(at: staging, to: root)
            try? fm.removeItem(at: backup)
            return true
        } catch {
            // 失败就把旧版本放回去，宁可旧也不能没有
            if !fm.fileExists(atPath: root.path), fm.fileExists(atPath: backup.path) {
                try? fm.moveItem(at: backup, to: root)
            }
            return false
        }
    }
}
