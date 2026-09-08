import SwiftUI

struct TrainView: View {
    @Environment(LabAppState.self) private var state
    @State private var selectedService: LabBookableService?
    @State private var selectedDay: String?
    @State private var selectedTime: String?

    private var dateOptions: [BookingDateOption] {
        BookingDateOption.nextOptions(scheduleDays: state.profile?.scheduleDays)
    }

    private var timeSlots: [String] {
        state.timeGroups.flatMap(\.slots)
    }

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 18) {
                    intro
                    services
                    scheduler
                    upcomingCalendar
                }
                .padding(20)
            }
            .refreshable { await state.refreshAfterMutation() }
            .navigationTitle("Train")
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                selectedService = selectedService ?? state.services.first
                selectedDay = selectedDay ?? dateOptions.first?.value
                selectFirstAvailableTimeIfNeeded()
            }
            .onChange(of: state.bookingCalendar) { _, _ in
                selectFirstAvailableTimeIfNeeded()
            }
        }
    }

    private var intro: some View {
        PremiumCard {
            VStack(alignment: .leading, spacing: 10) {
                Text("BOOKING")
                    .font(LabTheme.eyebrow())
                    .tracking(2.6)
                    .foregroundStyle(LabTheme.violetLight)
                Text("Book sessions against the live Lab Studio calendar.")
                    .font(.title2.weight(.black))
                    .foregroundStyle(.white)
                Text("Pick the service, choose a time, and keep your week organized.")
                    .font(.subheadline)
                    .foregroundStyle(LabTheme.muted)
            }
        }
    }

    private var services: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Private Services", icon: "sparkles")
            if state.services.isEmpty {
                EmptyLabState(title: "Loading services", detail: "Pull to refresh if this takes longer than a moment.", icon: "arrow.clockwise")
            } else {
                ForEach(state.services) { service in
                    Button {
                        withAnimation(.snappy) {
                            selectedService = service
                            selectFirstAvailableTimeIfNeeded()
                        }
                    } label: {
                        PremiumCard(interactive: true) {
                            HStack(alignment: .top, spacing: 14) {
                                Image(systemName: selectedService?.id == service.id ? "checkmark.seal.fill" : "circle")
                                    .font(.title2.weight(.bold))
                                    .foregroundStyle(selectedService?.id == service.id ? LabTheme.green : LabTheme.muted)
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(service.type.uppercased())
                                        .font(LabTheme.eyebrow())
                                        .tracking(1.8)
                                        .foregroundStyle(LabTheme.violetLight)
                                    Text(service.name)
                                        .font(.title3.weight(.black))
                                        .foregroundStyle(.white)
                                    Text(service.desc)
                                        .font(.subheadline)
                                        .foregroundStyle(LabTheme.muted)
                                }
                                Spacer(minLength: 8)
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text(Currency.format(dollars: service.price))
                                        .font(.headline.weight(.black))
                                        .foregroundStyle(.white)
                                    Text(service.time)
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(LabTheme.muted)
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var scheduler: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Choose Time", icon: "clock.fill")
            PremiumCard {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Day")
                        .font(.caption.weight(.black))
                        .foregroundStyle(LabTheme.muted)
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 10) {
                        ForEach(dateOptions) { option in
                            selectablePill(title: option.shortLabel, active: selectedDay == option.value) {
                                selectedDay = option.value
                                selectFirstAvailableTimeIfNeeded()
                            }
                        }
                    }

                    ForEach(state.timeGroups, id: \.label) { group in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(group.label.uppercased())
                                .font(.caption.weight(.black))
                                .foregroundStyle(LabTheme.muted)
                            LazyVGrid(columns: [.init(.flexible()), .init(.flexible()), .init(.flexible())], spacing: 10) {
                                ForEach(group.slots, id: \.self) { slot in
                                    let blocked = slotIsBlocked(slot)
                                    selectablePill(title: slot, active: selectedTime == slot, disabled: blocked) {
                                        selectedTime = slot
                                    }
                                }
                            }
                        }
                    }

                    if !hasAvailableTime {
                        Label("No openings remain for this day. Choose another date.", systemImage: "calendar.badge.exclamationmark")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(LabTheme.muted)
                    }

                    LabButton(title: state.isLoading ? "Booking" : "Book Session", icon: "calendar.badge.plus", tint: LabTheme.violet, isDisabled: !canBook || state.isLoading) {
                        guard let selectedService, let selectedDay, let selectedTime else { return }
                        Task { await state.book(service: selectedService, day: selectedDay, time: selectedTime) }
                    }
                }
            }
        }
    }

    private var upcomingCalendar: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Your Sessions", icon: "calendar.badge.clock")
            let events = state.bookingCalendar.filter { $0.source != "google_calendar" }
            if events.isEmpty {
                EmptyLabState(title: "No sessions booked", detail: "Your confirmed in-app sessions will appear here.", icon: "calendar")
            } else {
                ForEach(events.prefix(4)) { event in
                    PremiumCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(event.summary ?? "Session")
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(.white)
                                Text(formatDateRange(start: event.start, end: event.end))
                                    .font(.caption)
                                    .foregroundStyle(LabTheme.muted)
                            }
                            Spacer()
                            Text("Booked")
                                .font(.caption2.weight(.black))
                                .foregroundStyle(LabTheme.violetLight)
                        }
                    }
                }
            }
        }
    }

    private var canBook: Bool {
        guard selectedService != nil, selectedDay != nil, let selectedTime else { return false }
        return !slotIsBlocked(selectedTime)
    }

    private var hasAvailableTime: Bool {
        timeSlots.contains { !slotIsBlocked($0) }
    }

    private func selectFirstAvailableTimeIfNeeded() {
        if let selectedTime, !slotIsBlocked(selectedTime) {
            return
        }

        selectedTime = timeSlots.first { !slotIsBlocked($0) }
    }

    private func selectablePill(title: String, active: Bool, disabled: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(.black))
                .foregroundStyle(disabled ? LabTheme.muted.opacity(0.5) : active ? .white : LabTheme.muted)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(active ? LabTheme.violet.opacity(0.30) : LabTheme.elevated, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(active ? LabTheme.violet.opacity(0.7) : .white.opacity(0.08), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.45 : 1)
    }

    private func slotIsBlocked(_ slot: String) -> Bool {
        guard let selectedDay, let selectedService else { return false }
        let slotStart = minutes(from: slot)
        let slotEnd = slotStart + selectedService.durationMinutes

        return state.bookingCalendar.contains { event in
            guard
                let startRaw = event.start,
                let endRaw = event.end,
                let start = ISO8601DateFormatter.labDate(from: startRaw),
                let end = ISO8601DateFormatter.labDate(from: endRaw),
                dateKey(start) == selectedDay
            else { return false }

            let eventStart = minutes(from: start)
            let eventEnd = minutes(from: end)
            return slotStart < eventEnd && slotEnd > eventStart
        }
    }

    private func minutes(from label: String) -> Int {
        let parts = label.uppercased().replacingOccurrences(of: " ", with: "")
        let match = parts.split(separator: ":")
        guard match.count == 2 else { return 0 }
        let hour = Int(match[0]) ?? 0
        let minutePart = match[1]
        let minute = Int(minutePart.prefix(2)) ?? 0
        let isPM = minutePart.contains("PM")
        let normalizedHour = (hour % 12) + (isPM ? 12 : 0)
        return normalizedHour * 60 + minute
    }

    private func minutes(from date: Date) -> Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/New_York") ?? .current
        let components = calendar.dateComponents([.hour, .minute], from: date)
        return (components.hour ?? 0) * 60 + (components.minute ?? 0)
    }

    private func dateKey(_ date: Date) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/New_York") ?? .current
        let comps = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", comps.year ?? 0, comps.month ?? 0, comps.day ?? 0)
    }

    private func formatDateRange(start: String?, end: String?) -> String {
        guard let start, let startDate = ISO8601DateFormatter.labDate(from: start) else { return "Time pending" }
        let startText = startDate.formatted(date: .abbreviated, time: .shortened)
        guard let end, let endDate = ISO8601DateFormatter.labDate(from: end) else { return startText }
        return "\(startText) - \(endDate.formatted(date: .omitted, time: .shortened))"
    }
}

private struct BookingDateOption: Identifiable {
    let value: String
    let label: String
    let shortLabel: String
    var id: String { value }

    static func nextOptions(scheduleDays: [String]?) -> [BookingDateOption] {
        let allowed = Set((scheduleDays ?? []).map { $0.lowercased() })
        let keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/New_York") ?? .current
        let start = calendar.startOfDay(for: Date())
        var output: [BookingDateOption] = []

        for offset in 1...14 where output.count < 6 {
            guard let date = calendar.date(byAdding: .day, value: offset, to: start) else { continue }
            let weekday = keys[calendar.component(.weekday, from: date) - 1]
            if !allowed.isEmpty && !allowed.contains(weekday) { continue }
            let value = String(format: "%04d-%02d-%02d", calendar.component(.year, from: date), calendar.component(.month, from: date), calendar.component(.day, from: date))
            output.append(.init(
                value: value,
                label: date.formatted(date: .complete, time: .omitted),
                shortLabel: date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
            ))
        }

        return output
    }
}
