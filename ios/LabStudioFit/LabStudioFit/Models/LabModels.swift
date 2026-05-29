import Foundation

struct LabUser: Codable {
    let id: String
    let displayName: String?
    let xp: Int
    let level: Int
    let onboardingComplete: Bool?
}

struct LabProfile: Codable {
    let userId: String?
    var firstName: String?
    var lastName: String?
    var email: String?
    var phone: String?
    var goal: String?
    var activityLevel: String?
    var scheduleDays: [String]?
    var nutritionRating: Int?

    var displayName: String {
        let name = [firstName, lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        if !name.isEmpty { return name }
        if let email, !email.isEmpty { return email }
        if let phone, !phone.isEmpty { return phone }
        return "Lab Member"
    }
}

struct LabHome: Codable {
    var profile: LabProfile?
    var nutrition: NutritionTotals?
    var latestStats: DailyStats?
    var nextBooking: BookingEvent?
    var upcomingBookings: [BookingEvent]?
    var bookingCalendar: [BookingEvent]?
    var calendarFeed: CalendarFeed?
    var recentWorkouts: [RecentWorkout]?
    var agenda: [LabAgendaItem]?
    var sessionLog: SessionLog?
    var progress: ProgressSummary?
}

struct NutritionTotals: Codable {
    var proteinG: Double?
    var carbsG: Double?
    var fatG: Double?
    var calories: Double?
}

struct DailyStats: Codable {
    var id: Int?
    var createdAt: String?
    var weightLbs: Double?
    var bodyFatPct: Double?
    var restingHr: Int?
    var note: String?
}

struct BookingEvent: Codable, Identifiable, Hashable {
    var summary: String?
    var start: String?
    var end: String?
    var location: String?
    var description: String?
    var source: String?

    var id: String { "\(summary ?? "event")-\(start ?? UUID().uuidString)" }
}

struct CalendarFeed: Codable {
    var connected: Bool?
    var importedUpcomingCount: Int?
}

struct RecentWorkout: Codable, Identifiable {
    var id: Int
    var createdAt: String?
    var kind: String?
    var durationMin: Int?
    var note: String?
}

struct LabAgendaItem: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var time: String?
    var type: String?
    var action: String?
    var completed: Bool?
}

struct SessionLog: Codable {
    var bookedUpcoming30d: Int?
    var completed7d: Int?
    var missedApprox30d: Int?
}

struct ProgressSummary: Codable {
    var photos30d: Int?
    var calories7dAvg: Int?
    var workouts7d: WorkoutWindow?
    var latestPr: StrengthPr?
}

struct WorkoutWindow: Codable {
    var count: Int?
    var minutes: Int?
}

struct StrengthPr: Codable {
    var lift: String?
    var value: Double?
    var unit: String?
    var reps: Int?
}

struct LabBookableService: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let price: Double
    let time: String
    let desc: String
    let type: String

    var durationMinutes: Int {
        Int(time.filter(\.isNumber)) ?? 60
    }
}

struct LabTimeGroup: Codable, Hashable {
    let label: String
    let slots: [String]
}

struct LabShopProduct: Codable, Identifiable, Hashable {
    let slug: String
    let name: String
    let description: String?
    let priceCents: Int?
    let imageUrl: String?
    let stripePriceId: String?
    let checkoutUrl: String?

    var id: String { slug }
}

struct LabCafeItem: Codable, Identifiable, Hashable {
    let slug: String
    let name: String
    let category: String
    let priceCents: Int
    let productUrl: String?
    let imageUrl: String?
    let stripePriceId: String?

    var id: String { slug }
}

struct NutritionEntry: Codable, Identifiable {
    var id: Int
    var createdAt: String?
    var name: String
    var proteinG: Int
    var carbsG: Int
    var fatG: Int
    var timeLabel: String?
}

struct NutritionDay: Codable {
    var proteinG: Int?
    var carbsG: Int?
    var fatG: Int?
    var calories: Int?
    var entries: [NutritionEntry]?
}

struct LabNutrition: Codable {
    var today: NutritionDay?
    var avg7: NutritionTotals?
}

struct LabCartLine: Identifiable, Hashable {
    let id: String
    let name: String
    let priceCents: Int
    let priceId: String?
    let checkoutURL: URL?
    var quantity: Int

    var formattedPrice: String {
        Currency.format(cents: priceCents)
    }
}

struct ChatMessage: Identifiable, Hashable {
    let id = UUID()
    let text: String
    let isCoach: Bool
}

enum Currency {
    static func format(cents: Int?) -> String {
        let value = Decimal(cents ?? 0) / Decimal(100)
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 2
        return formatter.string(from: value as NSDecimalNumber) ?? "$0.00"
    }

    static func format(dollars: Double) -> String {
        format(cents: Int((dollars * 100).rounded()))
    }
}

extension String {
    var nilIfBlank: String? {
        let value = trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? nil : value
    }
}
