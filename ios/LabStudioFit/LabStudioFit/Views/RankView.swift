import SwiftUI

private struct FeaturedChallenge: Identifiable {
    let id: Int
    let title: String
    let detail: String
    let reward: String
    let active: Bool
}

private let featuredChallenges: [FeaturedChallenge] = [
    .init(id: 1, title: "300 Club", detail: "Reach 300 total reps in a single workout.", reward: "Badge + 500 points", active: true),
    .init(id: 2, title: "Cold Recovery", detail: "Log 20 total minutes of cold plunge recovery.", reward: "Free shake", active: false),
]

struct RankView: View {
    @Environment(LabAppState.self) private var state

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    header
                    challenges
                    leaderboard
                }
                .padding(20)
            }
            .refreshable { await state.refreshLeaderboard() }
            .navigationTitle("Rank")
            .toolbar(.hidden, for: .navigationBar)
        }
        .task {
            await state.refreshLeaderboard()
        }
    }

    private var header: some View {
        VStack(spacing: 8) {
            Text("LEADERBOARD")
                .font(.system(size: 30, weight: .black).italic())
                .foregroundStyle(.white)
            Text("COMPARE YOUR BEST REACTION SCORE")
                .font(LabTheme.eyebrow())
                .tracking(2.2)
                .foregroundStyle(LabTheme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
    }

    private var challenges: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("FEATURED CHALLENGES")
                .font(LabTheme.eyebrow())
                .tracking(2.0)
                .foregroundStyle(LabTheme.muted)
                .padding(.leading, 2)

            ForEach(featuredChallenges) { challenge in
                PremiumCard {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(alignment: .top) {
                            Text(challenge.title.uppercased())
                                .font(.title3.weight(.black).italic())
                                .foregroundStyle(.white)
                            Spacer()
                            Text(challenge.active ? "ACTIVE" : "LOCKED")
                                .font(.system(size: 9, weight: .black))
                                .tracking(1.2)
                                .foregroundStyle(challenge.active ? LabTheme.violetLight : LabTheme.red)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background((challenge.active ? LabTheme.violet : LabTheme.red).opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).stroke((challenge.active ? LabTheme.violet : LabTheme.red).opacity(0.24), lineWidth: 1))
                        }

                        Text(challenge.detail)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(LabTheme.secondaryText)

                        Label("REWARD: \(challenge.reward)", systemImage: "gift.fill")
                            .font(.system(size: 10, weight: .black))
                            .tracking(1.3)
                            .foregroundStyle(.yellow)
                    }
                }
                .opacity(challenge.active ? 1 : 0.62)
            }
        }
    }

    private var leaderboard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("GAME RANKINGS")
                    .font(LabTheme.eyebrow())
                    .tracking(2.0)
                    .foregroundStyle(LabTheme.muted)
                Spacer()
                HStack(spacing: 6) {
                    Circle()
                        .fill(LabTheme.emerald)
                        .frame(width: 7, height: 7)
                    Text("LIVE")
                        .font(.system(size: 9, weight: .black))
                        .tracking(1.2)
                        .foregroundStyle(LabTheme.emerald)
                }
            }
            .padding(.horizontal, 2)

            Text("BEST REACTION LAB SCORES")
                .font(.system(size: 10, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(LabTheme.muted)
                .padding(.horizontal, 2)

            if state.leaderboard.isEmpty {
                EmptyLabState(title: "No scores uploaded yet", detail: "Play from the Games tab and your best scores will appear here.", icon: "trophy")
            } else {
                ForEach(Array(state.leaderboard.enumerated()), id: \.element.id) { index, entry in
                    leaderboardRow(entry, rank: index + 1)
                }
            }
        }
    }

    private func leaderboardRow(_ entry: LabLeaderboardEntry, rank: Int) -> some View {
        let isFirst = rank == 1

        return HStack(spacing: 14) {
            Text("#\(rank)")
                .font(.system(size: 18, weight: .black).italic())
                .foregroundStyle(isFirst ? .yellow : LabTheme.elevated)
                .frame(width: 42, alignment: .center)

            Text(initials(from: entry.displayName))
                .font(.caption.weight(.black))
                .foregroundStyle(isFirst ? .black : .white)
                .frame(width: 42, height: 42)
                .background(isFirst ? .yellow : LabTheme.violet, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .shadow(color: (isFirst ? Color.yellow : LabTheme.violet).opacity(0.28), radius: 14, x: 0, y: 8)

            VStack(alignment: .leading, spacing: 2) {
                Text((entry.displayName?.nilIfBlank ?? "Anonymous").uppercased())
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                Text("MEMBER")
                    .font(.system(size: 9, weight: .black))
                    .tracking(1.3)
                    .foregroundStyle(LabTheme.muted)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(entry.score.formatted())
                    .font(LabTheme.mono(15, weight: .black))
                    .foregroundStyle(LabTheme.violetLight)
                Text("POINTS")
                    .font(.system(size: 9, weight: .black))
                    .tracking(1.1)
                    .foregroundStyle(LabTheme.muted)
            }
        }
        .padding(14)
        .background(isFirst ? Color.yellow.opacity(0.12) : LabTheme.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(isFirst ? Color.yellow.opacity(0.34) : LabTheme.border, lineWidth: 1))
    }

    private func initials(from name: String?) -> String {
        let source = name?.nilIfBlank ?? "??"
        let letters = source
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
        let value = String(letters)
        return value.isEmpty ? "??" : value.uppercased()
    }
}
