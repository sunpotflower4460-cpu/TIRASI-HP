import SwiftUI

// An empty app: unit tests that use StoreKit need a host application.
@main
struct HostApp: App {
    var body: some Scene {
        WindowGroup { Text("StoreKit tests") }
    }
}
