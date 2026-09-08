import SwiftUI

struct HomeView: View {
    @Environment(LabAppState.self) private var state

    private var progress: Double {
        min(1, Double(state.xp) / Double(state.nextLevelXP))
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    hero
                    quickMetrics
                    nextSession
                    quickLogs
                    todayAgenda
                    recentWorkouts
                }
                .padding(20)
            }
            .refreshable { await state.refreshAfterMutation() }
            .navigationTitle("Lab Studio")
            .toolbar(.hidden, for: .navigationBar)
            .toolbar { ToolbarItem(placement: .topBarTrailing) { cartBadge } }
        }
    }

    private var hero: some View {
        PremiumCard(padding: 22) {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("PRIVATE PERFORMANCE")
                            .font(LabTheme.eyebrow())
                            .tracking(2.6)
                            .foregroundStyle(LabTheme.violetLight)
                        Text("Welcome back, \(greetingName)")
                            .font(.system(size: 34, weight: .black))
                            .foregroundStyle(.white)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 12)
                    Image(systemName: "bolt.heart.fill")
                        .font(.system(size: 34, weight: .black))
                        .foregroundStyle(LabTheme.violetLight, LabTheme.emerald)
                }

                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Level \(state.level)")
                            .font(.headline.weight(.black))
                        Spacer()
                        Text("\(state.xp) / \(state.nextLevelXP) XP")
                            .font(LabTheme.mono(13, weight: .black))
                            .foregroundStyle(LabTheme.muted)
                    }
                    ProgressView(value: progress)
                        .tint(LabTheme.violet)
                        .scaleEffect(y: 1.5)
                }

                LabButton(title: "Book a Session", icon: "calendar.badge.plus", tint: LabTheme.violet) {
                    state.selectedTab = .train
                }
            }
        }
    }

    private var quickMetrics: some View {
        LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
            PremiumCard { MetricPill(title: "XP", value: "\(state.xp)", icon: "bolt.fill", tint: LabTheme.violet) }
            PremiumCard { MetricPill(title: "Sessions", value: "\(state.home?.sessionLog?.bookedUpcoming30d ?? 0)", icon: "calendar.badge.checkmark", tint: LabTheme.blue) }
            PremiumCard { MetricPill(title: "Protein", value: "\(Int(state.home?.nutrition?.proteinG ?? 0))g", icon: "fork.knife", tint: LabTheme.green) }
            PremiumCard { MetricPill(title: "Photos", value: "\(state.home?.progress?.photos30d ?? 0)", icon: "camera.fill", tint: LabTheme.violet) }
        }
    }

    private var nextSession: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Next Session", icon: "calendar")
            if let booking = state.home?.nextBooking {
                PremiumCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(booking.summary ?? "Upcoming session")
                            .font(.title3.weight(.black))
                            .foregroundStyle(.white)
                        Label(formatDateRange(start: booking.start, end: booking.end), systemImage: "clock.fill")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(LabTheme.blue)
                        if let location = booking.location, !location.isEmpty {
                            Label(location, systemImage: "mappin.and.ellipse")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(LabTheme.muted)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                EmptyLabState(title: "No upcoming session", detail: "Book from the Book tab and it will appear here immediately.", icon: "calendar.badge.plus")
            }
        }
    }

    private var quickLogs: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Quick Logs", icon: "plus.circle.fill")
            HStack(spacing: 12) {
                LabButton(title: "Workout", icon: "dumbbell.fill", tint: LabTheme.blue, isDisabled: state.isLoading) {
                    Task { await state.logWorkout() }
                }
                LabButton(title: "Protein", icon: "fork.knife", tint: LabTheme.green, isDisabled: state.isLoading) {
                    Task { await state.logNutrition(name: "Protein check-in", protein: 30, carbs: 8, fat: 3) }
                }
            }
        }
    }

    private var todayAgenda: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Today's Plan", icon: "checklist.checked")
            let agenda = state.home?.agenda ?? []
            if agenda.isEmpty {
                EmptyLabState(title: "No agenda yet", detail: "Your check-ins, habits, and booked sessions will show here.", icon: "checklist")
            } else {
                ForEach(agenda) { item in
                    PremiumCard {
                        HStack(spacing: 14) {
                            Text(item.time ?? "Today")
                                .font(.caption.weight(.black))
                                .foregroundStyle(LabTheme.blue)
                                .frame(width: 70, alignment: .leading)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(.white)
                                Text(item.type ?? "Lab")
                                    .font(.caption)
                                    .foregroundStyle(LabTheme.muted)
                            }
                            Spacer()
                            Image(systemName: item.completed == true ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(item.completed == true ? LabTheme.green : LabTheme.muted)
                        }
                    }
                }
            }
        }
    }

    private var recentWorkouts: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Recent Workouts", icon: "dumbbell.fill")
            let workouts = state.home?.recentWorkouts ?? []
            if workouts.isEmpty {
                EmptyLabState(title: "No recent workouts", detail: "Tap Quick Logs after a session to keep your dashboard current.", icon: "figure.strengthtraining.traditional")
            } else {
                ForEach(workouts.prefix(4)) { workout in
                    PremiumCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(workout.kind?.capitalized ?? "Workout")
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(.white)
                                Text(formatDate(workout.createdAt))
                                    .font(.caption)
                                    .foregroundStyle(LabTheme.muted)
                            }
                            Spacer()
                            Text(workout.durationMin.map { "\($0)m" } ?? "Logged")
                                .font(.caption.weight(.black))
                                .foregroundStyle(LabTheme.violetLight)
                        }
                    }
                }
            }
        }
    }

    private var cartBadge: some View {
        Button { state.selectedTab = .market } label: {
            Label("\(state.cartCount)", systemImage: state.cart.isEmpty ? "bag" : "bag.fill")
        }
    }

    private var greetingName: String {
        let name = state.displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if let at = name.firstIndex(of: "@") {
            let emailPrefix = String(name[..<at])
            let emailName = emailPrefix.split(separator: "+").first.map(String.init) ?? emailPrefix
            return emailName.isEmpty ? "Athlete" : emailName
        }
        return name.isEmpty ? "Athlete" : name
    }

    private func formatDate(_ raw: String?) -> String {
        guard let raw, let date = ISO8601DateFormatter.labDate(from: raw) else { return "Recent" }
        return date.formatted(date: .abbreviated, time: .shortened)
    }

    private func formatDateRange(start: String?, end: String?) -> String {
        guard let start, let startDate = ISO8601DateFormatter.labDate(from: start) else { return "Time pending" }
        let startText = startDate.formatted(date: .abbreviated, time: .shortened)
        guard let end, let endDate = ISO8601DateFormatter.labDate(from: end) else { return startText }
        return "\(startText) - \(endDate.formatted(date: .omitted, time: .shortened))"
    }
}

extension ISO8601DateFormatter {
    static func labDate(from raw: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: raw) { return date }

        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: raw)
    }
}
