import PhotosUI
import SwiftUI

struct ProfileView: View {
    @Environment(LabAppState.self) private var state
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var goal = ""
    @State private var activityLevel = ""
    @State private var weight = ""
    @State private var bodyFat = ""
    @State private var restingHr = ""
    @State private var note = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var confirmDelete = false

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    profileHero
                    profileForm
                    dailyStats
                    progressTools
                    accountTools
                }
                .padding(20)
            }
            .refreshable { await state.refreshAfterMutation() }
            .navigationTitle("Profile")
            .onAppear(perform: syncProfile)
            .onChange(of: state.profile?.userId) { _, _ in syncProfile() }
            .onChange(of: selectedPhoto) { _, item in
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self) {
                        await state.uploadProgressPhoto(data: data)
                    }
                    selectedPhoto = nil
                }
            }
            .confirmationDialog("Delete your Lab Studio account and saved training data?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete Account", role: .destructive) {
                    Task { await state.deleteAccount() }
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }

    private var profileHero: some View {
        PremiumCard(padding: 22) {
            VStack(spacing: 18) {
                ZStack {
                    Circle()
                        .fill(LinearGradient(colors: [LabTheme.blue, LabTheme.orange], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 92, height: 92)
                    Text(initials)
                        .font(.title.weight(.black))
                        .foregroundStyle(.white)
                }
                Text(state.displayName)
                    .font(.largeTitle.weight(.black))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                Text(state.location)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(LabTheme.muted)
                    .multilineTextAlignment(.center)
                HStack {
                    MetricPill(title: "Level", value: "\(state.level)", icon: "star.fill", tint: LabTheme.blue)
                    MetricPill(title: "XP", value: "\(state.xp)", icon: "bolt.fill", tint: LabTheme.orange)
                }
            }
        }
    }

    private var profileForm: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Member Details", icon: "person.crop.circle.fill")
            PremiumCard {
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        field("First", text: $firstName)
                        field("Last", text: $lastName)
                    }
                    field("Email", text: $email, keyboard: .emailAddress)
                    field("Phone", text: $phone, keyboard: .phonePad)
                    field("Primary goal", text: $goal)
                    field("Activity level", text: $activityLevel)
                    LabButton(title: "Save Profile", icon: "checkmark.circle.fill", tint: LabTheme.blue, isDisabled: state.isLoading) {
                        Task {
                            await state.saveProfile(
                                firstName: firstName,
                                lastName: lastName,
                                email: email,
                                phone: phone,
                                goal: goal,
                                activityLevel: activityLevel
                            )
                        }
                    }
                }
            }
        }
    }

    private var dailyStats: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Daily Check-In", icon: "heart.text.square.fill")
            PremiumCard {
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        field("Weight", text: $weight, keyboard: .decimalPad)
                        field("Body fat", text: $bodyFat, keyboard: .decimalPad)
                        field("Rest HR", text: $restingHr, keyboard: .numberPad)
                    }
                    field("Note", text: $note)
                    LabButton(title: "Save Check-In", icon: "plus.circle.fill", tint: LabTheme.green, isDisabled: state.isLoading) {
                        Task { await state.saveDailyStats(weight: weight, bodyFat: bodyFat, restingHr: restingHr, note: note) }
                    }
                }
            }
        }
    }

    private var progressTools: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Progress", icon: "chart.line.uptrend.xyaxis")
            LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: 12) {
                PremiumCard { MetricPill(title: "Workouts 7D", value: "\(state.home?.progress?.workouts7d?.count ?? 0)", icon: "dumbbell.fill", tint: LabTheme.blue) }
                PremiumCard { MetricPill(title: "Calories Avg", value: "\(state.home?.progress?.calories7dAvg ?? 0)", icon: "flame.fill", tint: LabTheme.orange) }
                PremiumCard { MetricPill(title: "Photos 30D", value: "\(state.home?.progress?.photos30d ?? 0)", icon: "camera.fill", tint: LabTheme.green) }
                PremiumCard { MetricPill(title: "Nutrition", value: "\(state.profile?.nutritionRating ?? 0)/10", icon: "fork.knife", tint: LabTheme.orange) }
            }

            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                HStack {
                    Image(systemName: "camera.fill")
                    Text("Upload Progress Photo")
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .font(.headline.weight(.black))
                .foregroundStyle(.white)
                .padding(18)
                .background(LabTheme.elevated, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            }
        }
    }

    private var accountTools: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Account", icon: "gearshape.fill")
            PremiumCard {
                VStack(spacing: 12) {
                    LabButton(title: "Sign Out", icon: "rectangle.portrait.and.arrow.right", tint: LabTheme.blue) {
                        Task { await state.logout() }
                    }
                    LabButton(title: "Delete Account", icon: "trash.fill", tint: LabTheme.red) {
                        confirmDelete = true
                    }
                }
            }
        }
    }

    private var initials: String {
        let source = state.displayName
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
        let value = String(source)
        return value.isEmpty ? "LS" : value.uppercased()
    }

    private func field(_ title: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.caption2.weight(.black))
                .foregroundStyle(LabTheme.muted)
            TextField(title, text: text)
                .keyboardType(keyboard)
                .textInputAutocapitalization(keyboard == .emailAddress ? .never : .words)
                .autocorrectionDisabled(keyboard == .emailAddress)
                .foregroundStyle(.white)
                .padding(13)
                .background(LabTheme.elevated, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private func syncProfile() {
        firstName = state.profile?.firstName ?? ""
        lastName = state.profile?.lastName ?? ""
        email = state.profile?.email ?? ""
        phone = state.profile?.phone ?? ""
        goal = state.profile?.goal ?? ""
        activityLevel = state.profile?.activityLevel ?? ""
    }
}
