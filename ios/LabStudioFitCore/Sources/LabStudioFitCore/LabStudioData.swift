import Foundation

public struct Brand: Equatable, Sendable {
    public let name: String
    public let address: String

    public init(name: String, address: String) {
        self.name = name
        self.address = address
    }
}

public struct Member: Identifiable, Equatable, Sendable {
    public let id: Int
    public let name: String
    public let xp: Int
    public let rank: Int
    public let imageURL: String
}

public struct LabService: Identifiable, Equatable, Sendable {
    public let id: String
    public let name: String
    public let price: Decimal
    public let duration: String
    public let description: String
    public let xp: Int
    public let type: String
}

public struct MarketItem: Identifiable, Equatable, Sendable {
    public struct Macros: Equatable, Sendable {
        public let protein: Int
        public let carbs: Int
        public let fat: Int
    }

    public let id: String
    public let name: String
    public let price: Decimal
    public let xp: Int
    public let category: String
    public let tag: String
    public let macros: Macros?
    public let imageURL: String
}

public struct WorkoutExercise: Identifiable, Equatable, Sendable {
    public let id: Int
    public let name: String
    public let sets: Int
    public let reps: String
    public let weight: String
}

public struct WorkoutTemplate: Equatable, Sendable {
    public let name: String
    public let exercises: [WorkoutExercise]
}

public struct Challenge: Identifiable, Equatable, Sendable {
    public let id: String
    public let name: String
    public let prize: String
    public let progress: Double
    public let icon: String
}

public struct LibraryContent: Identifiable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let category: String
    public let minutes: Int
}

public struct DailyAgendaItem: Identifiable, Equatable, Sendable {
    public let id: String
    public let time: String
    public let title: String
    public let subtitle: String
    public let status: String
}

public struct ProgressTile: Identifiable, Equatable, Sendable {
    public let id: String
    public let title: String
    public let value: String
    public let delta: String
    public let kind: String
}

public enum LabStudioSeedData {
    public static let brand = Brand(name: "THE LAB", address: "3280 Suntree Blvd, Melbourne, FL")

    public static let members: [Member] = [
        .init(id: 1, name: "YOU", xp: 1250, rank: 4, imageURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop"),
        .init(id: 2, name: "Sarah J.", xp: 2400, rank: 1, imageURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop"),
        .init(id: 3, name: "Mike T.", xp: 2150, rank: 2, imageURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop")
    ]

    public static let services: [LabService] = [
        .init(id: "intro", name: "Intro Assessment", price: 49, duration: "45m", description: "Movement screen & strategy.", xp: 100, type: "Strategy"),
        .init(id: "pt60", name: "1:1 Protocol", price: 95, duration: "60m", description: "Full guided hypertrophy session.", xp: 200, type: "Strength"),
        .init(id: "recovery", name: "Ice & Heat", price: 59, duration: "30m", description: "Contrast therapy via sauna/plunge.", xp: 150, type: "Recovery"),
        .init(id: "mobility", name: "Flow State", price: 55, duration: "45m", description: "Active mobility & joint health.", xp: 120, type: "Mobility")
    ]

    public static let marketItems: [MarketItem] = [
        .init(id: "m1", name: "Macro Bowl: Chkn/Rice", price: 10.99, xp: 50, category: "fuel", tag: "HIGH PROTEIN", macros: .init(protein: 45, carbs: 50, fat: 12), imageURL: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop"),
        .init(id: "m2", name: "Steak & Greens", price: 12.99, xp: 50, category: "fuel", tag: "KETO", macros: .init(protein: 50, carbs: 10, fat: 25), imageURL: "https://images.unsplash.com/photo-1600335247177-61b6c73950fb?q=80&w=600&auto=format&fit=crop"),
        .init(id: "d1", name: "Electro-Hydrate", price: 2.99, xp: 10, category: "fuel", tag: "RECOVERY", macros: .init(protein: 0, carbs: 15, fat: 0), imageURL: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=600&auto=format&fit=crop"),
        .init(id: "d2", name: "Iso-Whey Shake", price: 4.99, xp: 25, category: "fuel", tag: "POST-WORKOUT", macros: .init(protein: 30, carbs: 5, fat: 2), imageURL: "https://images.unsplash.com/photo-1584175697669-70a2c07742d4?q=80&w=600&auto=format&fit=crop"),
        .init(id: "g1", name: "Lab Lifting Straps", price: 19.99, xp: 100, category: "gear", tag: "ACCESSORY", macros: nil, imageURL: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop")
    ]

    public static let workoutTemplate = WorkoutTemplate(
        name: "Upper Body Hypertrophy",
        exercises: [
            .init(id: 1, name: "DB Incline Press", sets: 3, reps: "8-12", weight: "60lbs"),
            .init(id: 2, name: "Lat Pulldown", sets: 4, reps: "10", weight: "120lbs"),
            .init(id: 3, name: "Cable Row", sets: 3, reps: "12", weight: "100lbs"),
            .init(id: 4, name: "Lateral Raise", sets: 3, reps: "15", weight: "20lbs")
        ]
    )

    public static let challenges: [Challenge] = [
        .init(id: "c1", name: "May Consistency", prize: "$50 Credit", progress: 0.64, icon: "flame.fill"),
        .init(id: "c2", name: "Protein Streak", prize: "Free Shake", progress: 0.30, icon: "fork.knife"),
        .init(id: "c3", name: "Check-in King", prize: "Lab Tee", progress: 0.82, icon: "checkmark.seal.fill")
    ]

    public static let library: [LibraryContent] = [
        .init(id: "l1", title: "How to Brace Under Load", category: "Strength", minutes: 4),
        .init(id: "l2", title: "Mobility Reset for Desk Hips", category: "Mobility", minutes: 7),
        .init(id: "l3", title: "Protein Timing Basics", category: "Nutrition", minutes: 5)
    ]

    public static let agenda: [DailyAgendaItem] = [
        .init(id: "a1", time: "7:30 AM", title: "Hydration check", subtitle: "Electrolytes before first client block", status: "ready"),
        .init(id: "a2", time: "12:00 PM", title: "Macro Bowl", subtitle: "45g protein logged from Lab Market", status: "logged"),
        .init(id: "a3", time: "5:30 PM", title: "Upper Body Hypertrophy", subtitle: "1:1 Protocol with Coach Toby", status: "booked")
    ]

    public static let progressTiles: [ProgressTile] = [
        .init(id: "xp", title: "XP", value: "1,250", delta: "+180 this week", kind: "bolt.fill"),
        .init(id: "bodyfat", title: "Body Fat", value: "18.4%", delta: "-1.2%", kind: "chart.line.downtrend.xyaxis"),
        .init(id: "sessions", title: "Sessions", value: "5", delta: "3 made / 0 missed", kind: "calendar.badge.checkmark"),
        .init(id: "credits", title: "Credits", value: "$72", delta: "available", kind: "creditcard.fill")
    ]
}

public enum LabStudioBusinessRules {
    public static func level(for xp: Int) -> Int {
        max(1, xp / 1_000 + 1)
    }

    public static func nextLevelXP(for level: Int) -> Int {
        max(1, level + 1) * 1_000
    }

    public static func cartTotal(_ items: [MarketItem]) -> Decimal {
        items.reduce(Decimal.zero) { $0 + $1.price }
    }
}
