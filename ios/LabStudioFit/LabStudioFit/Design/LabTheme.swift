import SwiftUI

enum LabTheme {
    static let background = Color(red: 0.035, green: 0.035, blue: 0.043)
    static let chrome = Color(red: 0.035, green: 0.035, blue: 0.043)
    static let surface = Color(red: 0.095, green: 0.095, blue: 0.106)
    static let elevated = Color(red: 0.15, green: 0.15, blue: 0.165)
    static let violet = Color(red: 0.486, green: 0.227, blue: 0.929)
    static let violetLight = Color(red: 0.545, green: 0.361, blue: 0.965)
    static let emerald = Color(red: 0.063, green: 0.725, blue: 0.506)
    static let blue = Color(red: 0.024, green: 0.714, blue: 0.831)
    static let orange = violet
    static let green = emerald
    static let red = Color(red: 0.96, green: 0.22, blue: 0.28)
    static let muted = Color(red: 0.45, green: 0.45, blue: 0.50)
    static let secondaryText = Color(red: 0.68, green: 0.68, blue: 0.72)
    static let border = Color.white.opacity(0.05)

    static let heroGradient = LinearGradient(
        colors: [LabTheme.violet.opacity(0.20), LabTheme.emerald.opacity(0.10), .clear],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static func eyebrow(_ color: Color = LabTheme.violetLight) -> Font {
        .system(size: 10, weight: .black, design: .default)
    }

    static func sectionTitle() -> Font {
        .system(size: 24, weight: .black, design: .default).italic()
    }

    static func mono(_ size: CGFloat = 14, weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}

struct PremiumCard<Content: View>: View {
    var padding: CGFloat = 16
    var radius: CGFloat = 16
    var interactive = false
    @ViewBuilder let content: Content

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)

        Group {
            if #available(iOS 26.0, *) {
                content
                    .padding(padding)
                    .background(LabTheme.surface, in: shape)
                    .glassEffect(.regular.tint(.white.opacity(0.015)).interactive(interactive), in: .rect(cornerRadius: radius))
            } else {
                content
                    .padding(padding)
                    .background(LabTheme.surface, in: shape)
            }
        }
        .overlay(shape.stroke(LabTheme.border, lineWidth: 1))
    }
}

struct LabButton: View {
    let title: String
    var icon: String = "arrow.right"
    var tint: Color = LabTheme.violet
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
            .padding(.vertical, 14)
            .background(tint, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: tint.opacity(isDisabled ? 0 : 0.28), radius: 16, x: 0, y: 8)
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
                .frame(width: 42, height: 42)
                .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title.uppercased())
                    .font(LabTheme.eyebrow(LabTheme.muted))
                    .tracking(1.7)
                    .foregroundStyle(LabTheme.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(value)
                    .font(LabTheme.mono(16, weight: .black))
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
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.headline.weight(.black))
                .foregroundStyle(LabTheme.violetLight)
            Text(title.uppercased())
                .font(LabTheme.sectionTitle())
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
                    .foregroundStyle(LabTheme.violetLight)
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
