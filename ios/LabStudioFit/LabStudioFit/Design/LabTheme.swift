import SwiftUI

enum LabTheme {
    static let background = Color(red: 0.03, green: 0.03, blue: 0.04)
    static let surface = Color(red: 0.08, green: 0.08, blue: 0.10)
    static let elevated = Color(red: 0.12, green: 0.12, blue: 0.15)
    static let blue = Color(red: 0.00, green: 0.48, blue: 1.00)
    static let orange = Color(red: 1.00, green: 0.39, blue: 0.10)
    static let green = Color(red: 0.13, green: 0.77, blue: 0.37)
    static let red = Color(red: 0.96, green: 0.22, blue: 0.28)
    static let muted = Color(red: 0.68, green: 0.68, blue: 0.72)

    static let heroGradient = LinearGradient(
        colors: [LabTheme.blue.opacity(0.40), LabTheme.orange.opacity(0.28), .clear],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct PremiumCard<Content: View>: View {
    var padding: CGFloat = 18
    var radius: CGFloat = 28
    var interactive = false
    @ViewBuilder let content: Content

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)

        Group {
            if #available(iOS 26.0, *) {
                content
                    .padding(padding)
                    .background(LabTheme.surface.opacity(0.34), in: shape)
                    .glassEffect(.regular.tint(.white.opacity(0.04)).interactive(interactive), in: .rect(cornerRadius: radius))
            } else {
                content
                    .padding(padding)
                    .background(.ultraThinMaterial, in: shape)
            }
        }
        .overlay(shape.stroke(.white.opacity(0.10), lineWidth: 1))
        .shadow(color: .black.opacity(0.35), radius: 24, x: 0, y: 18)
    }
}

struct LabButton: View {
    let title: String
    var icon: String = "arrow.right"
    var tint: Color = LabTheme.orange
    var isDisabled = false
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Text(title)
                    .font(.headline.weight(.black))
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                Image(systemName: icon)
                    .font(.headline.weight(.black))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(tint.gradient, in: Capsule(style: .continuous))
            .shadow(color: tint.opacity(isDisabled ? 0 : 0.35), radius: 18, x: 0, y: 10)
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.45 : 1)
    }
}

struct MetricPill: View {
    let title: String
    let value: String
    let icon: String
    var tint: Color = LabTheme.blue

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.headline.weight(.bold))
                .foregroundStyle(tint)
                .frame(width: 38, height: 38)
                .background(tint.opacity(0.16), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(title.uppercased())
                    .font(.caption2.weight(.black))
                    .foregroundStyle(LabTheme.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(value)
                    .font(.headline.weight(.black))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
            }
            Spacer(minLength: 0)
        }
    }
}

struct SectionHeader: View {
    let title: String
    let icon: String

    var body: some View {
        HStack {
            Label(title, systemImage: icon)
                .font(.title3.weight(.black))
                .foregroundStyle(.white)
            Spacer(minLength: 0)
        }
    }
}

struct EmptyLabState: View {
    let title: String
    let detail: String
    let icon: String

    var body: some View {
        PremiumCard {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.largeTitle.weight(.black))
                    .foregroundStyle(LabTheme.blue)
                Text(title)
                    .font(.headline.weight(.black))
                    .foregroundStyle(.white)
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(LabTheme.muted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
