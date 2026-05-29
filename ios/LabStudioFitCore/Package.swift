// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LabStudioFitCore",
    platforms: [.iOS(.v18), .macOS(.v14)],
    products: [
        .library(name: "LabStudioFitCore", targets: ["LabStudioFitCore"])
    ],
    targets: [
        .target(name: "LabStudioFitCore"),
        .testTarget(name: "LabStudioFitCoreTests", dependencies: ["LabStudioFitCore"])
    ]
)
