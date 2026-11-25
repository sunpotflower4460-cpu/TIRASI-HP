import StoreKit
import StoreKitTest
import XCTest

final class StoreCoreTests: XCTestCase {
    private let standard = "jp.tirasi.livechirashi.standard"
    private let full = "jp.tirasi.livechirashi.full"
    private let upgrade = "jp.tirasi.livechirashi.upgrade"
    private var session: SKTestSession!
    private let core = StoreCore()

    override func setUpWithError() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Products", withExtension: "storekit"))
        session = try SKTestSession(contentsOf: url)
        session.resetToDefaultState()
        session.clearTransactions()
        session.disableDialogs = true
    }

    override func tearDown() {
        session.clearTransactions()
    }

    func testAllThreeProductsComeWithAPrice() async throws {
        let products = try await core.products(ids: [standard, full, upgrade])
        XCTAssertEqual(Set(products.map(\.id)), [standard, full, upgrade])
        for product in products {
            XCTAssertFalse(product.displayPrice.isEmpty)
            XCTAssertEqual(product.type, .nonConsumable)
        }
    }

    func testNothingIsOwnedAtFirst() async {
        let owned = await core.ownedProductIDs()
        XCTAssertEqual(owned, [])
    }

    func testBuyingStandardThenUpgradeIsKept() async throws {
        let first = try await core.purchase(id: standard)
        XCTAssertEqual(first, .purchased)
        var owned = await core.ownedProductIDs()
        XCTAssertEqual(owned, [standard])

        let second = try await core.purchase(id: upgrade)
        XCTAssertEqual(second, .purchased)
        owned = await core.ownedProductIDs()
        XCTAssertEqual(owned, [standard, upgrade])
    }

    func testRefundRemovesTheEntitlement() async throws {
        _ = try await core.purchase(id: full)
        let transaction = try XCTUnwrap(session.allTransactions().first)
        try session.refundTransaction(identifier: UInt(transaction.identifier))
        // The refund reaches StoreKit asynchronously.
        var owned = await core.ownedProductIDs()
        for _ in 0..<50 where !owned.isEmpty {
            try await Task.sleep(nanoseconds: 100_000_000)
            owned = await core.ownedProductIDs()
        }
        XCTAssertEqual(owned, [])
    }

    func testAskToBuyStaysLockedUntilApproved() async throws {
        session.askToBuyEnabled = true
        let outcome = try await core.purchase(id: standard)
        XCTAssertEqual(outcome, .pending)
        var owned = await core.ownedProductIDs()
        XCTAssertEqual(owned, [])

        let changed = expectation(description: "the approval is delivered")
        changed.assertForOverFulfill = false
        let updates = core.observeTransactions { changed.fulfill() }
        defer { updates.cancel() }
        let transaction = try XCTUnwrap(session.allTransactions().first)
        try session.approveAskToBuyTransaction(identifier: UInt(transaction.identifier))
        await fulfillment(of: [changed], timeout: 15)
        owned = await core.ownedProductIDs()
        XCTAssertEqual(owned, [standard])
    }

    func testUnknownProductIsAnError() async {
        do {
            _ = try await core.purchase(id: "jp.tirasi.livechirashi.missing")
            XCTFail("expected an error")
        } catch {
            XCTAssertTrue(error is StoreError)
        }
    }
}
