// The bridge between src/plan/store.ts and StoreCore.
import Capacitor
import StoreKit

@objc(TirasiStorePlugin)
public class TirasiStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TirasiStorePlugin"
    public let jsName = "TirasiStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    private let core = StoreCore()
    private var updates: Task<Void, Never>?

    override public func load() {
        updates = core.observeTransactions { [weak self] in
            self?.notifyListeners("entitlementsChanged", data: [:])
        }
    }

    deinit {
        updates?.cancel()
    }

    @objc func products(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids", String.self) else {
            call.reject("ids is required")
            return
        }
        Task {
            do {
                let products = try await core.products(ids: ids)
                call.resolve(["products": products.map { product in
                    ["id": product.id, "title": product.displayName, "price": product.displayPrice]
                }])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func owned(_ call: CAPPluginCall) {
        Task {
            call.resolve(["ids": await core.ownedProductIDs()])
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id is required")
            return
        }
        Task {
            do {
                let outcome = try await core.purchase(id: id)
                call.resolve(["outcome": outcome.rawValue])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await core.restore()
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }
}

/// Registers the app's own plugin; plugins from npm packages register themselves.
class StoreViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(TirasiStorePlugin())
    }
}
