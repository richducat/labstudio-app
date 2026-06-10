import SwiftUI

struct RootShellView: View {
    @Environment(LabAppState.self) private var state

    var body: some View {
        ZStack(alignment: .bottom) {
            LabTheme.background.ignoresSafeArea()
            BackgroundGlow()

            if state.isBootstrapping {
                LoadingView()
            } else if state.isAuthenticated {
                appTabs
            } else {
                LoginView()
            }

            VStack {
                StatusBanner()
                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
        }
        .task {
            await state.bootstrap()
        }
    }

    private var appTabs: some View {
        VStack(spacing: 0) {
            LabTopBar()
            ZStack(alignment: .bottom) {
                Group {
                    switch state.selectedTab {
                    case .home: HomeView()
                    case .train: TrainView()
                    case .games: GamesView()
                    case .market: MarketView()
                    case .coach: CoachView()
                    case .social: RankView()
                    case .profile: ProfileView()
                    }
                }
                .safeAreaPadding(.bottom, 94)

                PremiumTabBar()
            }
        }
    }
}

private struct BackgroundGlow: View {
    var body: some View {
        ZStack {
            LabTheme.background.ignoresSafeArea()
            Circle()
                .fill(LabTheme.violet.opacity(0.20))
                .frame(width: 340, height: 340)
                .blur(radius: 115)
                .offset(x: -180, y: -290)
            Circle()
                .fill(LabTheme.emerald.opacity(0.10))
                .frame(width: 320, height: 320)
                .blur(radius: 120)
                .offset(x: 190, y: 340)
        }
        .ignoresSafeArea()
    }
}

private struct LabTopBar: View {
    @Environment(LabAppState.self) private var state

    var body: some View {
        HStack(spacing: 12) {
            Button {
                withAnimation(.snappy(duration: 0.25)) { state.selectedTab = .home }
            } label: {
                HStack(spacing: 12) {
                    Text("L")
                        .font(.system(size: 19, weight: .black, design: .default).italic())
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(LabTheme.violet, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .shadow(color: LabTheme.violet.opacity(0.45), radius: 15, x: 0, y: 0)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("LAB STUDIO")
                            .font(.system(size: 15, weight: .bold))
                            .tracking(1.2)
                            .foregroundStyle(.white)
                        Text("MEMBER APP")
                            .font(LabTheme.eyebrow())
                            .tracking(2.0)
                            .foregroundStyle(LabTheme.muted)
                    }
                }
            }
            .buttonStyle(.plain)

            Spacer(minLength: 8)

            if state.cartCount > 0 {
                Button {
                    withAnimation(.snappy(duration: 0.25)) { state.selectedTab = .market }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "bag.fill")
                        Text("\(state.cartCount)")
                            .font(LabTheme.mono(12, weight: .black))
                    }
                    .font(.caption.weight(.black))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(LabTheme.surface, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(LabTheme.border, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background {
            if #available(iOS 26.0, *) {
                LabTheme.chrome.opacity(0.82)
                    .glassEffect(.regular.tint(.black.opacity(0.18)), in: .rect)
            } else {
                LabTheme.chrome.opacity(0.90)
            }
        }
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(.white.opacity(0.05))
                .frame(height: 1)
        }
    }
}

private struct LoadingView: View {
    var body: some View {
        VStack(spacing: 18) {
            ProgressView()
                .tint(LabTheme.violet)
                .scaleEffect(1.4)
            Text("Loading Lab Studio")
                .font(.headline.weight(.black))
                .foregroundStyle(.white)
        }
    }
}

private struct LoginView: View {
    @Environment(LabAppState.self) private var state
    @State private var email = ""
    @State private var phone = ""

    var body: some View {
        GeometryReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 18) {
                    hero
                    form
                    catalogPreview
                }
                .padding(20)
                .padding(.top, 24)
                .padding(.bottom, 44)
                .frame(maxWidth: .infinity)
                .frame(minHeight: proxy.size.height, alignment: .top)
                .contentShape(Rectangle())
            }
            .frame(width: proxy.size.width, height: proxy.size.height)
        }
    }

    private var hero: some View {
        PremiumCard(padding: 24) {
            VStack(alignment: .leading, spacing: 18) {
                Text("L")
                    .font(.system(size: 30, weight: .black).italic())
                    .foregroundStyle(.white)
                    .frame(width: 72, height: 72)
                    .background(LabTheme.violet, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .shadow(color: LabTheme.violet.opacity(0.35), radius: 28, x: 0, y: 16)
                VStack(alignment: .leading, spacing: 8) {
                    Text("LAB STUDIO")
                        .font(LabTheme.eyebrow())
                        .tracking(3.4)
                        .foregroundStyle(LabTheme.violetLight)
                    Text("Members-only training, booking, nutrition, and Toby coaching.")
                        .font(.system(size: 34, weight: .black))
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text("Use the same email address or phone number from the current member app.")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(LabTheme.muted)
            }
        }
    }

    private var form: some View {
        PremiumCard {
            VStack(spacing: 14) {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .textContentType(.emailAddress)
                    .padding(14)
                    .background(.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(.white.opacity(0.10), lineWidth: 1))
                    .foregroundStyle(.white)
                TextField("Phone", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .padding(14)
                    .background(.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(.white.opacity(0.10), lineWidth: 1))
                    .foregroundStyle(.white)

                LabButton(
                    title: state.isLoading ? "Signing In" : "Enter Lab Studio",
                    icon: state.isLoading ? "hourglass" : "arrow.right",
                    tint: LabTheme.violet,
                    isDisabled: state.isLoading || (email.nilIfBlank == nil && phone.nilIfBlank == nil)
                ) {
                    Task { await state.login(email: email, phone: phone) }
                }
            }
        }
    }

    private var catalogPreview: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Live Catalog", icon: "bag.fill")
            ForEach(state.shopProducts.prefix(2)) { item in
                PremiumCard {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name)
                                .font(.headline.weight(.black))
                                .foregroundStyle(.white)
                            Text(item.description ?? "Available in Lab Studio checkout")
                                .font(.caption)
                                .foregroundStyle(LabTheme.muted)
                                .lineLimit(2)
                        }
                        Spacer()
                        Text(Currency.format(cents: item.priceCents))
                            .font(.headline.weight(.black))
                            .foregroundStyle(LabTheme.violetLight)
                    }
                }
            }
        }
    }
}

private struct PremiumTabBar: View {
    @Environment(LabAppState.self) private var state

    var body: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(.white.opacity(0.10))
                .frame(height: 1)
            HStack(alignment: .bottom, spacing: 2) {
                ForEach([LabTab.home, .train, .games], id: \.id) { tab in
                    tabButton(tab)
                }
                coachButton
                    .offset(y: -18)
                ForEach([LabTab.social, .market, .profile], id: \.id) { tab in
                    tabButton(tab)
                }
            }
            .padding(.horizontal, 8)
            .padding(.top, 8)
            .padding(.bottom, 10)
        }
        .background {
            ZStack {
                LabTheme.chrome
                    .ignoresSafeArea(.container, edges: .bottom)

                if #available(iOS 26.0, *) {
                    LabTheme.chrome.opacity(0.90)
                        .glassEffect(.regular.tint(.black.opacity(0.20)), in: .rect)
                } else {
                    LabTheme.chrome.opacity(0.94)
                }
            }
        }
    }

    private func tabButton(_ tab: LabTab) -> some View {
        Button {
            withAnimation(.snappy(duration: 0.28)) { state.selectedTab = tab }
        } label: {
            VStack(spacing: 5) {
                Image(systemName: tab.icon)
                    .font(.system(size: 20, weight: state.selectedTab == tab ? .bold : .semibold))
                Text(tab.navLabel)
                    .font(.system(size: 9, weight: .bold))
                    .tracking(0.6)
                    .textCase(.uppercase)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
            }
            .foregroundStyle(state.selectedTab == tab ? .white : LabTheme.muted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
        .buttonStyle(.plain)
    }

    private var coachButton: some View {
        Button {
            withAnimation(.snappy(duration: 0.28)) { state.selectedTab = .coach }
        } label: {
            ZStack {
                Circle()
                    .fill(LabTheme.violet.opacity(0.40))
                    .blur(radius: 12)
                    .frame(width: 68, height: 68)
                Circle()
                    .fill(state.selectedTab == .coach ? .white : LabTheme.violet)
                    .frame(width: 58, height: 58)
                    .overlay(Circle().stroke(LabTheme.chrome, lineWidth: 4))
                Image(systemName: LabTab.coach.icon)
                    .font(.system(size: 23, weight: .black))
                    .foregroundStyle(state.selectedTab == .coach ? LabTheme.violet : .white)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

private struct StatusBanner: View {
    @Environment(LabAppState.self) private var state

    var body: some View {
        Group {
            if let error = state.errorMessage {
                banner(error, tint: LabTheme.red, icon: "exclamationmark.triangle.fill") {
                    state.errorMessage = nil
                }
            } else if let success = state.successMessage {
                banner(success, tint: LabTheme.green, icon: "checkmark.circle.fill") {
                    state.successMessage = nil
                }
            }
        }
    }

    private func banner(_ text: String, tint: Color, icon: String, dismiss: @escaping () -> Void) -> some View {
        Button(action: dismiss) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .foregroundStyle(tint)
                Text(text)
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                Spacer(minLength: 0)
                Image(systemName: "xmark")
                    .font(.caption.weight(.black))
                    .foregroundStyle(LabTheme.muted)
            }
            .padding(14)
            .background(LabTheme.surface, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(tint.opacity(0.35), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
