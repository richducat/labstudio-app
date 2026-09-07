import SwiftUI

struct RootShellView: View {
    @Environment(LabAppState.self) private var state

    var body: some View {
        ZStack(alignment: .bottom) {
            LabTheme.background.ignoresSafeArea()
            LabTheme.heroGradient.ignoresSafeArea()
                .blur(radius: 18)

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
        ZStack(alignment: .bottom) {
            Group {
                switch state.selectedTab {
                case .home: HomeView()
                case .train: TrainView()
                case .market: MarketView()
                case .coach: CoachView()
                case .profile: ProfileView()
                }
            }
            .safeAreaPadding(.bottom, 92)

            PremiumTabBar()
        }
    }
}

private struct LoadingView: View {
    var body: some View {
        VStack(spacing: 18) {
            ProgressView()
                .tint(LabTheme.orange)
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
    @State private var code = ""
    @State private var challengeId: String?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 18) {
                Spacer(minLength: 40)
                hero
                form
                catalogPreview
            }
            .padding(20)
        }
    }

    private var hero: some View {
        PremiumCard(padding: 24) {
            VStack(alignment: .leading, spacing: 18) {
                Image(systemName: "bolt.heart.fill")
                    .font(.system(size: 42, weight: .black))
                    .foregroundStyle(LabTheme.orange, LabTheme.blue)
                VStack(alignment: .leading, spacing: 8) {
                    Text("LAB STUDIO")
                        .font(.caption.weight(.black))
                        .foregroundStyle(LabTheme.orange)
                    Text("Members-only training, booking, nutrition, and Toby coaching.")
                        .font(.largeTitle.weight(.black))
                        .foregroundStyle(.white)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text("Sign in with a one-time code sent to your member email.")
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
                    .background(LabTheme.elevated, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .foregroundStyle(.white)
                .disabled(challengeId != nil || state.isLoading)
                if challengeId != nil {
                    Text("Check your email. Your code expires in 10 minutes.")
                        .foregroundStyle(LabTheme.muted)
                    TextField("Six-digit code", text: $code)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .padding(14)
                        .background(LabTheme.elevated, in: RoundedRectangle(cornerRadius: 18))
                        .foregroundStyle(.white)
                }
                if let error = state.errorMessage {
                    Text(error).foregroundStyle(.red).accessibilityLabel("Sign-in error: \(error)")
                }
                LabButton(
                    title: state.isLoading ? "Please Wait" : challengeId == nil ? "Email Me a Code" : "Verify and Sign In",
                    icon: state.isLoading ? "hourglass" : "arrow.right",
                    tint: LabTheme.orange,
                    isDisabled: state.isLoading || email.nilIfBlank == nil || (challengeId != nil && (code.count != 6 || !code.allSatisfy { $0.isASCII && $0.isNumber }))
                ) {
                    Task {
                        if let challengeId {
                            await state.login(email: email, challengeId: challengeId, code: code)
                        } else {
                            challengeId = await state.requestLoginCode(email: email)
                        }
                    }
                }
                if challengeId != nil {
                    Button("Use another email or request a new code") {
                        challengeId = nil; code = ""; state.errorMessage = nil
                    }.disabled(state.isLoading)
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
                            .foregroundStyle(LabTheme.orange)
                    }
                }
            }
        }
    }
}

private struct PremiumTabBar: View {
    @Environment(LabAppState.self) private var state

    var body: some View {
        Group {
            if #available(iOS 26.0, *) {
                GlassEffectContainer(spacing: 8) { tabButtons }
            } else {
                tabButtons
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: Capsule(style: .continuous))
        .overlay(Capsule().stroke(.white.opacity(0.10), lineWidth: 1))
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    private var tabButtons: some View {
        HStack(spacing: 8) {
            ForEach(LabTab.allCases) { tab in
                Button {
                    withAnimation(.snappy(duration: 0.28)) { state.selectedTab = tab }
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 18, weight: .black))
                        Text(tab.rawValue)
                            .font(.caption2.weight(.black))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    .foregroundStyle(state.selectedTab == tab ? .white : LabTheme.muted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 11)
                    .background(state.selectedTab == tab ? LabTheme.blue.opacity(0.28) : .clear, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
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
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(tint.opacity(0.35), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
