import Foundation
import Observation
import UIKit

private struct LabErrorResponse: Decodable {
    let ok: Bool?
    let error: String?
}

private struct LoginResponse: Decodable {
    let ok: Bool
    let error: String?
    let user: LabUser?
    let profile: LabProfile?
}

private struct UserResponse: Decodable {
    let ok: Bool
    let error: String?
    let user: LabUser?
}

private struct ProfileResponse: Decodable {
    let ok: Bool
    let error: String?
    let onboardingComplete: Bool?
    let profile: LabProfile?
}

private struct HomeResponse: Decodable {
    let ok: Bool
    let error: String?
    let home: LabHome?
}

private struct ServicesResponse: Decodable {
    let ok: Bool
    let error: String?
    let location: String?
    let services: [LabBookableService]
    let timeGroups: [LabTimeGroup]
}

private struct ShopResponse: Decodable {
    let ok: Bool
    let error: String?
    let products: [LabShopProduct]
}

private struct CafeResponse: Decodable {
    let ok: Bool
    let error: String?
    let items: [LabCafeItem]
}

private struct PublicCatalogResponse: Decodable {
    let ok: Bool
    let error: String?
    let location: String?
    let services: [LabBookableService]?
    let timeGroups: [LabTimeGroup]?
    let products: [LabShopProduct]?
}

private struct NutritionResponse: Decodable {
    let ok: Bool
    let error: String?
    let today: NutritionDay?
    let avg7: NutritionTotals?
}

private struct BookingResponse: Decodable {
    struct Item: Decodable {
        let id: String?
        let title: String?
        let time: String?
        let scheduledAt: String?
    }

    let ok: Bool
    let error: String?
    let item: Item?
}

private struct CheckoutResponse: Decodable {
    let ok: Bool
    let error: String?
    let url: String?
}

private struct TobyResponse: Decodable {
    let reply: String?
    let error: String?
}

private struct GenericResponse: Decodable {
    let ok: Bool?
    let error: String?
}

private struct GameScoresResponse: Decodable {
    let ok: Bool
    let error: String?
    let highScores: [LabGameHighScore]?
    let leaderboards: [LabLeaderboardEntry]?
}

private enum LabAPIError: LocalizedError {
    case unauthorized
    case server(String)
    case invalidURL
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            "Sign in to continue."
        case .server(let message):
            message
        case .invalidURL:
            "Invalid API URL."
        case .invalidResponse:
            "The Lab Studio API returned an unreadable response."
        }
    }
}

@MainActor
final class LabAPIClient {
    let baseURL = URL(string: "https://app.labstudio.fit")!

    private let session: URLSession
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()

    init() {
        let configuration = URLSessionConfiguration.default
        configuration.httpCookieStorage = .shared
        configuration.httpCookieAcceptPolicy = .always
        configuration.httpShouldSetCookies = true
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 12
        configuration.timeoutIntervalForResource = 20
        self.session = URLSession(configuration: configuration)
    }

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "GET")
    }

    func post<T: Decodable>(_ path: String, json: [String: Any?] = [:]) async throws -> T {
        try await request(path, method: "POST", json: json)
    }

    func delete<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "DELETE")
    }

    func clearCookies() {
        guard let cookies = HTTPCookieStorage.shared.cookies(for: baseURL) else { return }
        cookies.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
    }

    private func request<T: Decodable>(_ path: String, method: String, json: [String: Any?]? = nil) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else { throw LabAPIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "accept")
        request.setValue("LabStudioFit-iOS/1.0", forHTTPHeaderField: "user-agent")

        if let json {
            request.setValue("application/json", forHTTPHeaderField: "content-type")
            request.httpBody = try JSONSerialization.data(withJSONObject: sanitize(json), options: [])
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw LabAPIError.invalidResponse }

        if http.statusCode == 401 {
            throw LabAPIError.unauthorized
        }

        guard (200..<300).contains(http.statusCode) else {
            let apiError = try? decoder.decode(LabErrorResponse.self, from: data)
            throw LabAPIError.server(apiError?.error ?? "Request failed with status \(http.statusCode).")
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw LabAPIError.invalidResponse
        }
    }

    private func sanitize(_ value: Any?) -> Any {
        switch value {
        case nil:
            return NSNull()
        case let dict as [String: Any?]:
            return dict.reduce(into: [String: Any]()) { partial, pair in
                partial[pair.key] = sanitize(pair.value)
            }
        case let array as [Any?]:
            return array.map { sanitize($0) }
        case let value?:
            return value
        }
    }
}

@MainActor
@Observable
final class LabAppState {
    private static let signedOutCoachPrompt = "I’m Toby. Sign in and I’ll use your Lab Studio profile, training logs, and nutrition data to help you stay on track."
    private static let signedInCoachPrompt = "You’re in. I’ll use your Lab Studio profile and current logs for training, nutrition, booking, and recovery guidance."

    var selectedTab: LabTab = .home
    var isBootstrapping = true
    var isLoading = false
    var isAuthenticated = false
    var errorMessage: String?
    var successMessage: String?

    var user: LabUser?
    var profile: LabProfile?
    var home: LabHome?
    var services: [LabBookableService] = []
    var timeGroups: [LabTimeGroup] = []
    var location = "3280 Suntree Blvd, Melbourne, FL"
    var shopProducts: [LabShopProduct] = []
    var cafeItems: [LabCafeItem] = []
    var nutrition: LabNutrition?
    var cart: [LabCartLine] = []
    var gameHighScores: [String: Int] = [:]
    var leaderboard: [LabLeaderboardEntry] = []
    var coachMessages: [ChatMessage] = [
        .init(text: LabAppState.signedOutCoachPrompt, isCoach: true)
    ]

    private let api = LabAPIClient()
#if DEBUG
    private var isUsingScreenshotFixture = false
#endif

    var displayName: String {
        profile?.displayName ?? user?.displayName ?? "Lab Member"
    }

    var xp: Int {
        user?.xp ?? 0
    }

    var level: Int {
        max(1, user?.level ?? 1)
    }

    var nextLevelXP: Int {
        max(1_000, (level + 1) * 1_000)
    }

    var cartTotalCents: Int {
        cart.reduce(0) { $0 + ($1.priceCents * $1.quantity) }
    }

    var cartCount: Int {
        cart.reduce(0) { $0 + $1.quantity }
    }

    var bookingCalendar: [BookingEvent] {
        home?.bookingCalendar ?? []
    }

    func bootstrap() async {
        isBootstrapping = true
        defer { isBootstrapping = false }

#if DEBUG
        if applyScreenshotFixtureIfRequested() {
            return
        }
#endif

        do {
            try await refreshAll(includeGameData: false)
            isAuthenticated = true
            updateCoachPromptForAuthenticatedSession()
            refreshGameDataInBackground()
        } catch LabAPIError.unauthorized {
            isAuthenticated = false
            user = nil
            profile = nil
            home = nil
            await loadPublicCatalogs()
        } catch {
            errorMessage = error.localizedDescription
            await loadPublicCatalogs()
        }
    }

    func login(email: String, phone: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response: LoginResponse = try await api.post("/api/lab/auth/login", json: [
                "email": email,
                "phone": phone,
            ])
            if !response.ok {
                throw LabAPIError.server(response.error ?? "Unable to log in.")
            }
            user = response.user
            profile = response.profile
            isAuthenticated = true
            coachMessages = [
                .init(text: Self.signedInCoachPrompt, isCoach: true)
            ]
            try await refreshAll(includeGameData: false)
            refreshGameDataInBackground()
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
        }
    }

    func logout() async {
        _ = try? await api.post("/api/lab/auth/logout") as GenericResponse
        api.clearCookies()
        user = nil
        profile = nil
        home = nil
        nutrition = nil
        cart.removeAll()
        gameHighScores = [:]
        leaderboard = []
        coachMessages = [
            .init(text: Self.signedOutCoachPrompt, isCoach: true)
        ]
        isAuthenticated = false
        selectedTab = .home
        successMessage = "Signed out."
    }

    func refreshAll(includeGameData: Bool = true) async throws {
        async let userRequest: UserResponse = api.get("/api/lab/user")
        async let profileRequest: ProfileResponse = api.get("/api/lab/profile")
        async let homeRequest: HomeResponse = api.get("/api/lab/home")
        async let servicesRequest: ServicesResponse = api.get("/api/lab/services")
        async let shopRequest: ShopResponse = api.get("/api/lab/shop")
        async let cafeRequest: CafeResponse = api.get("/api/lab/cafe")
        async let nutritionRequest: NutritionResponse = api.get("/api/lab/nutrition")

        let (
            userResponse,
            profileResponse,
            homeResponse,
            servicesResponse,
            shopResponse,
            cafeResponse,
            nutritionResponse
        ) = try await (
            userRequest,
            profileRequest,
            homeRequest,
            servicesRequest,
            shopRequest,
            cafeRequest,
            nutritionRequest
        )

        user = userResponse.user
        profile = profileResponse.profile ?? homeResponse.home?.profile
        home = homeResponse.home
        services = servicesResponse.services
        timeGroups = servicesResponse.timeGroups
        location = servicesResponse.location ?? location
        shopProducts = shopResponse.products
        cafeItems = cafeResponse.items
        nutrition = LabNutrition(today: nutritionResponse.today, avg7: nutritionResponse.avg7)
        isAuthenticated = true
        updateCoachPromptForAuthenticatedSession()
        if includeGameData {
            await refreshGameScores()
            await refreshLeaderboard()
        }
    }

    func refreshAfterMutation(success: String? = nil) async {
        do {
            try await refreshAll()
            successMessage = success
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadPublicCatalogs() async {
        do {
            let publicResponse: PublicCatalogResponse = try await api.get("/api/lab/shop")
            let cafeResponse: CafeResponse = try await api.get("/api/lab/cafe")
            services = publicResponse.services ?? []
            timeGroups = publicResponse.timeGroups ?? []
            location = publicResponse.location ?? location
            shopProducts = publicResponse.products ?? []
            cafeItems = cafeResponse.items
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func book(service: LabBookableService, day: String, time: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response: BookingResponse = try await api.post("/api/lab/agenda", json: [
                "day": day,
                "timeLabel": time,
                "title": service.name,
                "type": "Session",
                "action": "book",
                "durationMin": service.durationMinutes,
                "details": [
                    "description": service.desc,
                    "location": location,
                    "price": service.price,
                    "serviceId": service.id,
                ],
            ])
            if !response.ok {
                throw LabAPIError.server(response.error ?? "Unable to book that session.")
            }
            await refreshAfterMutation(success: "Session booked for \(day) at \(time).")
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logWorkout(kind: String = "workout", durationMin: Int = 45, note: String = "Logged from native iOS") async {
        await mutate("/api/lab/workouts", body: [
            "kind": kind,
            "durationMin": durationMin,
            "note": note,
        ], success: "Workout logged.")
    }

    func logNutrition(name: String, protein: Int, carbs: Int, fat: Int) async {
        await mutate("/api/lab/nutrition", body: [
            "name": name,
            "p": protein,
            "c": carbs,
            "f": fat,
            "time": "iOS",
        ], success: "Nutrition logged.")
    }

    func saveDailyStats(weight: String, bodyFat: String, restingHr: String, note: String) async {
        await mutate("/api/lab/daily-stats", body: [
            "weight": weight.nilIfBlank,
            "bodyFat": bodyFat.nilIfBlank,
            "restingHr": restingHr.nilIfBlank,
            "note": note.nilIfBlank,
        ], success: "Daily stats saved.")
    }

    func saveProfile(firstName: String, lastName: String, email: String, phone: String, goal: String, activityLevel: String) async {
        await mutate("/api/lab/profile", body: [
            "first_name": firstName,
            "last_name": lastName,
            "email": email,
            "phone": phone,
            "goal": goal,
            "activity_level": activityLevel,
            "schedule_days": profile?.scheduleDays ?? [],
        ], success: "Profile saved.")
    }

    func uploadProgressPhoto(data: Data) async {
        guard let imageData = compressedJPEGData(from: data), imageData.count < 1_100_000 else {
            errorMessage = "That photo is too large. Choose a smaller image."
            return
        }

        await mutate("/api/lab/progress-photos", body: [
            "imageDataUrl": "data:image/jpeg;base64,\(imageData.base64EncodedString())",
            "note": "Uploaded from native iOS",
        ], success: "Progress photo uploaded.")
    }

    func deleteAccount() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            _ = try await api.delete("/api/lab/account") as GenericResponse
            api.clearCookies()
            user = nil
            profile = nil
            home = nil
            nutrition = nil
            cart.removeAll()
            gameHighScores = [:]
            leaderboard = []
            isAuthenticated = false
            selectedTab = .home
            successMessage = "Account deleted."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sendCoachMessage(_ text: String) async {
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }

        coachMessages.append(.init(text: clean, isCoach: false))

        do {
            let response: TobyResponse = try await api.post("/api/toby/chat", json: ["message": clean])
            if let error = response.error {
                throw LabAPIError.server(error)
            }
            coachMessages.append(.init(text: response.reply ?? "I’m here, but I didn’t get a clean response back. Try that again.", isCoach: true))
        } catch {
            coachMessages.append(.init(text: error.localizedDescription, isCoach: true))
        }
    }

    func refreshGameScores() async {
#if DEBUG
        if isUsingScreenshotFixture { return }
#endif
        do {
            let response: GameScoresResponse = try await api.get("/api/lab/games/score")
            if response.ok {
                gameHighScores = Dictionary(uniqueKeysWithValues: (response.highScores ?? []).map { ($0.gameId, $0.topScore) })
            }
        } catch {
            // Scores are additive; the rest of the member app should stay usable if this endpoint is unavailable.
        }
    }

    func refreshLeaderboard() async {
#if DEBUG
        if isUsingScreenshotFixture { return }
#endif
        do {
            let response: GameScoresResponse = try await api.get("/api/lab/games/score?scope=global")
            if response.ok {
                leaderboard = response.leaderboards ?? []
            }
        } catch {
            leaderboard = []
        }
    }

    func submitGameScore(gameId: String, score: Int) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response: GenericResponse = try await api.post("/api/lab/games/score", json: [
                "gameId": gameId,
                "score": max(0, score),
            ])
            if let ok = response.ok, !ok {
                throw LabAPIError.server(response.error ?? "Unable to save score.")
            }
            await refreshGameScores()
            await refreshLeaderboard()
            successMessage = "Score saved."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func addToCart(product: LabShopProduct) {
        let priceId = product.stripePriceId
        let checkoutURL = product.checkoutUrl.flatMap(URL.init(string:))
        upsertCartLine(
            id: "shop:\(product.slug)",
            name: product.name,
            priceCents: product.priceCents ?? 0,
            priceId: priceId,
            checkoutURL: checkoutURL
        )
    }

    func addToCart(cafeItem: LabCafeItem) {
        upsertCartLine(
            id: "cafe:\(cafeItem.slug)",
            name: cafeItem.name,
            priceCents: cafeItem.priceCents,
            priceId: cafeItem.stripePriceId,
            checkoutURL: cafeItem.productUrl.flatMap(URL.init(string:))
        )
    }

    func clearCart() {
        cart.removeAll()
    }

    func checkoutCart() async -> URL? {
        guard !cart.isEmpty else { return nil }
        errorMessage = nil

        if cart.count == 1, let url = cart[0].checkoutURL, cart[0].priceId == nil {
            cart.removeAll()
            return url
        }

        let lines = cart.compactMap { item -> [String: Any]? in
            guard let priceId = item.priceId else { return nil }
            return ["price_id": priceId, "quantity": item.quantity]
        }

        guard lines.count == cart.count else {
            errorMessage = "Checkout these direct-link items one at a time."
            return nil
        }

        do {
            let response: CheckoutResponse = try await api.post("/api/lab/shop/checkout-cart", json: ["lines": lines])
            guard response.ok, let rawURL = response.url, let url = URL(string: rawURL) else {
                throw LabAPIError.server(response.error ?? "Unable to start checkout.")
            }
            cart.removeAll()
            return url
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    private func mutate(_ path: String, body: [String: Any?], success: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response: GenericResponse = try await api.post(path, json: body)
            if let ok = response.ok, !ok {
                throw LabAPIError.server(response.error ?? "Request failed.")
            }
            await refreshAfterMutation(success: success)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func upsertCartLine(id: String, name: String, priceCents: Int, priceId: String?, checkoutURL: URL?) {
        if let index = cart.firstIndex(where: { $0.id == id }) {
            cart[index].quantity += 1
        } else {
            cart.append(.init(id: id, name: name, priceCents: priceCents, priceId: priceId, checkoutURL: checkoutURL, quantity: 1))
        }
        successMessage = "\(name) added to cart."
    }

    private func updateCoachPromptForAuthenticatedSession() {
        if coachMessages.count == 1, coachMessages.first?.text == Self.signedOutCoachPrompt {
            coachMessages = [
                .init(text: Self.signedInCoachPrompt, isCoach: true)
            ]
        }
    }

    private func refreshGameDataInBackground() {
        Task { @MainActor in
            await refreshGameScores()
            await refreshLeaderboard()
        }
    }

#if DEBUG
    private func applyScreenshotFixtureIfRequested() -> Bool {
        let process = ProcessInfo.processInfo
        let arguments = process.arguments
        let environment = process.environment

        let rawMode: String?
        if let index = arguments.firstIndex(of: "-LabStudioScreenshotMode"),
           arguments.indices.contains(index + 1) {
            rawMode = arguments[index + 1]
        } else {
            rawMode = environment["LABSTUDIO_SCREENSHOT_MODE"]
        }

        guard let rawMode, let tab = screenshotTab(for: rawMode) else {
            return false
        }

        applyScreenshotFixture(selectedTab: tab)
        return true
    }

    private func screenshotTab(for rawMode: String) -> LabTab? {
        switch rawMode.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
        case "dash", "home":
            .home
        case "book", "train":
            .train
        case "games", "game":
            .games
        case "shop", "market":
            .market
        case "coach", "toby":
            .coach
        case "rank", "social", "leaderboard":
            .social
        case "me", "profile":
            .profile
        default:
            nil
        }
    }

    private func applyScreenshotFixture(selectedTab tab: LabTab) {
        let fixtureProfile = LabProfile(
            userId: "reviewer",
            firstName: "Avery",
            lastName: "Member",
            email: "reviewer+labstudio@labstudio.fit",
            phone: "321-555-0198",
            goal: "Build strength and stay consistent",
            activityLevel: "Active",
            scheduleDays: ["mon", "wed", "fri"],
            nutritionRating: 4
        )

        user = LabUser(id: "reviewer", displayName: "Avery Member", xp: 1840, level: 3, onboardingComplete: true)
        profile = fixtureProfile
        location = "3280 Suntree Blvd, Melbourne, FL"
        services = [
            .init(id: "private-strength", name: "Private Strength", price: 85, time: "60 min", desc: "One-on-one programming and coaching.", type: "Training"),
            .init(id: "performance-checkin", name: "Performance Check-In", price: 45, time: "30 min", desc: "Movement review, goal setting, and recovery planning.", type: "Coaching"),
            .init(id: "small-group", name: "Small Group Training", price: 35, time: "45 min", desc: "Coach-led strength session with a focused group.", type: "Training")
        ]
        timeGroups = [
            .init(label: "Morning", slots: ["7:00 AM", "8:30 AM", "10:00 AM"]),
            .init(label: "Afternoon", slots: ["12:30 PM", "2:00 PM", "4:30 PM"]),
            .init(label: "Evening", slots: ["5:30 PM", "6:30 PM"])
        ]
        shopProducts = [
            .init(slug: "day-pass", name: "Day Pass", description: "Single-day facility access.", priceCents: 2500, imageUrl: nil, stripePriceId: nil, checkoutUrl: nil),
            .init(slug: "private-pack", name: "Private Training Pack", description: "Five private coaching sessions.", priceCents: 39900, imageUrl: nil, stripePriceId: nil, checkoutUrl: nil),
            .init(slug: "membership", name: "Studio Membership", description: "Monthly access for Lab Studio members.", priceCents: 12900, imageUrl: nil, stripePriceId: nil, checkoutUrl: nil)
        ]
        cafeItems = [
            .init(slug: "recovery-shake", name: "Recovery Shake", category: "Cafe", priceCents: 900, productUrl: nil, imageUrl: nil, stripePriceId: nil),
            .init(slug: "protein-coffee", name: "Protein Coffee", category: "Cafe", priceCents: 650, productUrl: nil, imageUrl: nil, stripePriceId: nil)
        ]
        home = LabHome(
            profile: fixtureProfile,
            nutrition: .init(proteinG: 126, carbsG: 210, fatG: 62, calories: 1840),
            latestStats: .init(id: 44, createdAt: "2026-06-10T13:30:00-04:00", weightLbs: 176.4, bodyFatPct: 15.8, restingHr: 54, note: "Feeling strong after lower-body day."),
            nextBooking: .init(summary: "Private Strength Session", start: "2026-06-12T14:00:00-04:00", end: "2026-06-12T15:00:00-04:00", location: location, description: "Lower-body strength block.", source: "labstudio"),
            upcomingBookings: [
                .init(summary: "Private Strength Session", start: "2026-06-12T14:00:00-04:00", end: "2026-06-12T15:00:00-04:00", location: location, description: nil, source: "labstudio"),
                .init(summary: "Small Group Training", start: "2026-06-15T17:30:00-04:00", end: "2026-06-15T18:15:00-04:00", location: location, description: nil, source: "labstudio")
            ],
            bookingCalendar: [
                .init(summary: "Private Strength Session", start: "2026-06-12T14:00:00-04:00", end: "2026-06-12T15:00:00-04:00", location: location, description: nil, source: "labstudio"),
                .init(summary: "Small Group Training", start: "2026-06-15T17:30:00-04:00", end: "2026-06-15T18:15:00-04:00", location: location, description: nil, source: "labstudio")
            ],
            calendarFeed: .init(connected: true, importedUpcomingCount: 2),
            recentWorkouts: [
                .init(id: 301, createdAt: "2026-06-10T09:45:00-04:00", kind: "strength", durationMin: 62, note: "Trap bar deadlift and sled work."),
                .init(id: 300, createdAt: "2026-06-08T08:30:00-04:00", kind: "conditioning", durationMin: 38, note: "Intervals and mobility.")
            ],
            agenda: [
                .init(id: "protein", title: "Hit protein target", time: "Today", type: "Nutrition", action: "log", completed: false),
                .init(id: "mobility", title: "10-minute mobility reset", time: "4:00 PM", type: "Recovery", action: "checkoff", completed: true),
                .init(id: "session", title: "Confirm Friday session", time: "6:00 PM", type: "Booking", action: "book", completed: false)
            ],
            sessionLog: .init(bookedUpcoming30d: 4, completed7d: 3, missedApprox30d: 0),
            progress: .init(photos30d: 2, calories7dAvg: 1880, workouts7d: .init(count: 4, minutes: 215), latestPr: .init(lift: "Trap Bar Deadlift", value: 225, unit: "lb", reps: 3))
        )
        nutrition = LabNutrition(
            today: .init(
                proteinG: 126,
                carbsG: 210,
                fatG: 62,
                calories: 1840,
                entries: [
                    .init(id: 1001, createdAt: "2026-06-10T08:00:00-04:00", name: "Protein oats", proteinG: 38, carbsG: 52, fatG: 12, timeLabel: "Breakfast"),
                    .init(id: 1002, createdAt: "2026-06-10T12:30:00-04:00", name: "Chicken bowl", proteinG: 48, carbsG: 70, fatG: 18, timeLabel: "Lunch")
                ]
            ),
            avg7: .init(proteinG: 121, carbsG: 198, fatG: 58, calories: 1815)
        )
        gameHighScores = ["reaction-lab": 540]
        leaderboard = [
            .init(displayName: "Maya Stone", score: 720, gamesPlayed: 9),
            .init(displayName: "Avery Member", score: 540, gamesPlayed: 6),
            .init(displayName: "Chris Lee", score: 480, gamesPlayed: 5),
            .init(displayName: "Jordan Pace", score: 360, gamesPlayed: 4)
        ]
        coachMessages = [
            .init(text: Self.signedInCoachPrompt, isCoach: true),
            .init(text: "Focus today on the lower-body session and keep protein above 120g.", isCoach: true)
        ]
        cart.removeAll()
        errorMessage = nil
        successMessage = nil
        isLoading = false
        isAuthenticated = true
        isUsingScreenshotFixture = true
        selectedTab = tab
    }
#endif

    private func compressedJPEGData(from data: Data) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let maxSide: CGFloat = 1_200
        let largestSide = max(image.size.width, image.size.height)
        let scale = largestSide > maxSide ? maxSide / largestSide : 1
        let targetSize = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resized.jpegData(compressionQuality: 0.58)
    }
}

enum LabTab: String, CaseIterable, Identifiable {
    case home = "Home"
    case train = "Train"
    case games = "Games"
    case market = "Market"
    case coach = "Coach"
    case social = "Social"
    case profile = "Profile"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .home: "waveform.path.ecg"
        case .train: "calendar"
        case .games: "brain.head.profile"
        case .market: "bag.fill"
        case .coach: "message.fill"
        case .social: "trophy.fill"
        case .profile: "person.fill"
        }
    }

    var navLabel: String {
        switch self {
        case .home: "Dash"
        case .train: "Book"
        case .games: "Games"
        case .market: "Shop"
        case .coach: "Coach"
        case .social: "Rank"
        case .profile: "Me"
        }
    }
}
