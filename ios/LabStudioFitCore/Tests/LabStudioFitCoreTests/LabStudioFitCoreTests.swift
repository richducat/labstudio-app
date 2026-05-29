import Foundation
import Testing
@testable import LabStudioFitCore

@Test func seedDataMirrorsMemberAppEssentials() async throws {
    #expect(LabStudioSeedData.brand.name == "THE LAB")
    #expect(LabStudioSeedData.services.count == 4)
    #expect(LabStudioSeedData.marketItems.count == 5)
    #expect(LabStudioSeedData.workoutTemplate.exercises.count == 4)
    #expect(LabStudioSeedData.challenges.count == 3)
}

@Test func businessRulesMatchGamifiedExperience() async throws {
    #expect(LabStudioBusinessRules.level(for: 1_250) == 2)
    #expect(LabStudioBusinessRules.nextLevelXP(for: 2) == 3_000)
    #expect(LabStudioBusinessRules.cartTotal(Array(LabStudioSeedData.marketItems.prefix(2))) == Decimal(23.98))
}
