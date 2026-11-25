// Purchases with StoreKit 2 only: no server, no third-party service. This file
// does not depend on Capacitor so that it can be tested on its own
// (see ios-store/StoreKitTests).
import StoreKit

enum StoreOutcome: String {
    case purchased
    case cancelled
    case pending
}

enum StoreError: LocalizedError {
    case unknownProduct
    case unverified

    var errorDescription: String? {
        switch self {
        case .unknownProduct: return "The product was not found in the App Store."
        case .unverified: return "The purchase could not be verified."
        }
    }
}

final class StoreCore {
    func products(ids: [String]) async throws -> [Product] {
        try await Product.products(for: ids)
    }

    /// Product ids owned right now. StoreKit keeps this available offline, and
    /// refunded purchases are not included.
    func ownedProductIDs() async -> [String] {
        var ids = Set<String>()
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.revocationDate == nil {
                ids.insert(transaction.productID)
            }
        }
        return ids.sorted()
    }

    @MainActor
    func purchase(id: String) async throws -> StoreOutcome {
        guard let product = try await Product.products(for: [id]).first else {
            throw StoreError.unknownProduct
        }
        switch try await product.purchase() {
        case .success(let verification):
            guard case .verified(let transaction) = verification else { throw StoreError.unverified }
            await transaction.finish()
            return .purchased
        case .userCancelled:
            return .cancelled
        case .pending:
            return .pending
        @unknown default:
            return .cancelled
        }
    }

    /// Asks the App Store again; used by the "restore purchases" button.
    func restore() async throws {
        try await AppStore.sync()
    }

    /// Purchases that arrive outside the purchase call: approvals, refunds, other devices.
    func observeTransactions(_ changed: @escaping @Sendable () -> Void) -> Task<Void, Never> {
        Task.detached {
            for await result in Transaction.updates {
                if case .verified(let transaction) = result {
                    await transaction.finish()
                }
                changed()
            }
        }
    }
}
