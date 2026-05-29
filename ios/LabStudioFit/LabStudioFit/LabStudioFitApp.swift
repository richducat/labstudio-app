import SwiftUI

@main
struct LabStudioFitApp: App {
    @State private var state = LabAppState()

    var body: some Scene {
        WindowGroup {
            RootShellView()
                .environment(state)
                .preferredColorScheme(.dark)
        }
    }
}
