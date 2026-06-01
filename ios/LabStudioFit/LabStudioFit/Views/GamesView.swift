import SwiftUI

private struct LabGameDefinition: Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String
    let detail: String
    let icon: String
    let tint: Color
    let points: Int
    let tags: [String]
}

private let labGames: [LabGameDefinition] = [
    .init(
        id: "gear-sort",
        title: "GEAR SORT",
        subtitle: "Sorting",
        detail: "Sort each color into its own tube as efficiently as you can.",
        icon: "gearshape.2.fill",
        tint: LabTheme.violetLight,
        points: 50,
        tags: ["Brain", "Speed"]
    ),
    .init(
        id: "pattern-master",
        title: "PATTERN MASTER",
        subtitle: "Sequence Recall",
        detail: "Watch the sequence, then repeat it from memory.",
        icon: "brain.head.profile",
        tint: .pink,
        points: 30,
        tags: ["Memory", "Focus"]
    ),
    .init(
        id: "reaction-lab",
        title: "REACTION LAB",
        subtitle: "Reaction Speed",
        detail: "Tap as many targets as you can in 30 seconds.",
        icon: "bolt.fill",
        tint: .yellow,
        points: 40,
        tags: ["Reflex", "Speed"]
    ),
    .init(
        id: "neuro-grid",
        title: "NEURO GRID",
        subtitle: "Visual Processing",
        detail: "Find the mismatch in each grid before time runs out.",
        icon: "square.grid.3x3.fill",
        tint: LabTheme.blue,
        points: 60,
        tags: ["Visual", "Logic"]
    ),
]

struct GamesView: View {
    @Environment(LabAppState.self) private var state
    @State private var activeGame: LabGameDefinition?

    var body: some View {
        NavigationStack {
            Group {
                if let activeGame {
                    GameSessionView(game: activeGame) {
                        withAnimation(.snappy(duration: 0.24)) { self.activeGame = nil }
                    }
                } else {
                    gameHub
                }
            }
            .navigationTitle("Games")
            .toolbar(.hidden, for: .navigationBar)
        }
        .task {
            await state.refreshGameScores()
        }
    }

    private var gameHub: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 18) {
                header
                ForEach(labGames) { game in
                    gameCard(game)
                }
                leaderboardCallout
            }
            .padding(20)
        }
        .refreshable { await state.refreshGameScores() }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Image(systemName: "gamecontroller.fill")
                .font(.system(size: 30, weight: .black))
                .foregroundStyle(LabTheme.violetLight)
            Text("BRAIN TRAINING")
                .font(.system(size: 30, weight: .black).italic())
                .foregroundStyle(.white)
            Text("FOCUS, MEMORY, REACTION, AND VISUAL SCANNING")
                .font(LabTheme.eyebrow())
                .tracking(2.2)
                .foregroundStyle(LabTheme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
    }

    private func gameCard(_ game: LabGameDefinition) -> some View {
        Button {
            withAnimation(.snappy(duration: 0.24)) { activeGame = game }
        } label: {
            PremiumCard(padding: 1, interactive: true) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(alignment: .top, spacing: 14) {
                        Image(systemName: game.icon)
                            .font(.title.weight(.black))
                            .foregroundStyle(game.tint)
                            .frame(width: 58, height: 58)
                            .background(LabTheme.elevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(LabTheme.border, lineWidth: 1))

                        VStack(alignment: .leading, spacing: 6) {
                            Text(game.subtitle.uppercased())
                                .font(LabTheme.eyebrow())
                                .tracking(1.8)
                                .foregroundStyle(game.tint)
                            Text(game.title)
                                .font(.system(size: 22, weight: .black).italic())
                                .foregroundStyle(.white)
                            Text(game.detail)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(LabTheme.secondaryText)
                                .lineLimit(2)
                        }

                        Spacer(minLength: 0)
                    }
                    .padding(15)

                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("HIGH SCORE")
                                .font(LabTheme.eyebrow())
                                .tracking(1.7)
                                .foregroundStyle(LabTheme.muted)
                            Text((state.gameHighScores[game.id] ?? 0).formatted())
                                .font(LabTheme.mono(18, weight: .black))
                                .foregroundStyle(.white)
                        }

                        Spacer()

                        HStack(spacing: 7) {
                            ForEach(game.tags, id: \.self) { tag in
                                Text(tag.uppercased())
                                    .font(.system(size: 9, weight: .black))
                                    .foregroundStyle(LabTheme.muted)
                                    .padding(.horizontal, 7)
                                    .padding(.vertical, 4)
                                    .background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                            }
                        }

                        Image(systemName: "arrow.right")
                            .font(.caption.weight(.black))
                            .foregroundStyle(game.tint)
                    }
                    .padding(15)
                    .overlay(alignment: .top) {
                        Rectangle()
                            .fill(.white.opacity(0.05))
                            .frame(height: 1)
                    }
                }
                .background(
                    LinearGradient(
                        colors: [game.tint.opacity(0.18), LabTheme.surface],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    in: RoundedRectangle(cornerRadius: 16, style: .continuous)
                )
            }
        }
        .buttonStyle(.plain)
    }

    private var leaderboardCallout: some View {
        PremiumCard {
            VStack(spacing: 12) {
                Image(systemName: "trophy.fill")
                    .font(.title.weight(.black))
                    .foregroundStyle(.yellow)
                Text("LEADERBOARD")
                    .font(.headline.weight(.black).italic())
                    .foregroundStyle(.white)
                Text("See how your best scores compare with other members.")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(LabTheme.muted)
                    .multilineTextAlignment(.center)
                Button {
                    withAnimation(.snappy(duration: 0.24)) { state.selectedTab = .social }
                } label: {
                    Text("VIEW LEADERBOARD")
                        .font(LabTheme.eyebrow())
                        .tracking(1.8)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(.white.opacity(0.14), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

private struct GameSessionView: View {
    @Environment(LabAppState.self) private var state

    let game: LabGameDefinition
    let onExit: () -> Void

    @State private var score = 0
    @State private var timeLeft = 30
    @State private var isRunning = false
    @State private var hasFinished = false
    @State private var targetX = 0.5
    @State private var targetY = 0.5
    @State private var runID = UUID()

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                Button(action: onExit) {
                    Image(systemName: "chevron.left")
                        .font(.headline.weight(.black))
                        .foregroundStyle(.white)
                        .frame(width: 42, height: 42)
                        .background(LabTheme.elevated, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)

                VStack(alignment: .leading, spacing: 2) {
                    Text(game.title)
                        .font(.headline.weight(.black).italic())
                        .foregroundStyle(.white)
                    Text(game.subtitle.uppercased())
                        .font(LabTheme.eyebrow())
                        .tracking(1.7)
                        .foregroundStyle(game.tint)
                }

                Spacer()

                Text("\(timeLeft)s")
                    .font(LabTheme.mono(18, weight: .black))
                    .foregroundStyle(timeLeft <= 5 && isRunning ? LabTheme.red : .white)
            }

            HStack(spacing: 12) {
                PremiumCard { MetricPill(title: "Score", value: score.formatted(), icon: "target", tint: game.tint) }
                PremiumCard { MetricPill(title: "Best", value: (state.gameHighScores[game.id] ?? 0).formatted(), icon: "trophy.fill", tint: .yellow) }
            }

            GeometryReader { proxy in
                ZStack {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(LabTheme.surface)
                        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(LabTheme.border, lineWidth: 1))

                    if isRunning {
                        Button {
                            score += game.points
                            randomizeTarget()
                        } label: {
                            ZStack {
                                Circle()
                                    .fill(game.tint.opacity(0.24))
                                    .frame(width: 72, height: 72)
                                    .blur(radius: 8)
                                Circle()
                                    .fill(game.tint)
                                    .frame(width: 54, height: 54)
                                Image(systemName: game.icon)
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(.white)
                            }
                        }
                        .buttonStyle(.plain)
                        .position(x: targetX * proxy.size.width, y: targetY * proxy.size.height)
                    } else {
                        VStack(spacing: 10) {
                            Image(systemName: hasFinished ? "checkmark.seal.fill" : game.icon)
                                .font(.system(size: 42, weight: .black))
                                .foregroundStyle(hasFinished ? LabTheme.green : game.tint)
                            Text(hasFinished ? "ROUND COMPLETE" : "READY")
                                .font(.title3.weight(.black).italic())
                                .foregroundStyle(.white)
                            Text(hasFinished ? "Your score was saved to the Lab leaderboard." : "Tap as many targets as possible before the clock runs out.")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(LabTheme.muted)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 28)
                        }
                    }
                }
            }
            .frame(height: 330)

            LabButton(
                title: isRunning ? "Playing" : hasFinished ? "Play Again" : "Start Game",
                icon: isRunning ? "timer" : "play.fill",
                tint: game.tint,
                isDisabled: isRunning
            ) {
                start()
            }

            Spacer(minLength: 0)
        }
        .padding(20)
    }

    private func start() {
        score = 0
        timeLeft = 30
        hasFinished = false
        isRunning = true
        randomizeTarget()

        let token = UUID()
        runID = token
        Task {
            while true {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    guard runID == token, isRunning else { return }
                    if timeLeft > 1 {
                        timeLeft -= 1
                    } else {
                        timeLeft = 0
                        isRunning = false
                        hasFinished = true
                        Task { await state.submitGameScore(gameId: game.id, score: score) }
                    }
                }
                if await MainActor.run(body: { !isRunning || runID != token }) {
                    return
                }
            }
        }
    }

    private func randomizeTarget() {
        targetX = Double.random(in: 0.16...0.84)
        targetY = Double.random(in: 0.16...0.84)
    }
}
