import SwiftUI

struct CoachView: View {
    @Environment(LabAppState.self) private var state
    @State private var draft = ""
    @State private var sending = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 12) {
                            coachHeader
                            ForEach(state.coachMessages) { message in
                                messageBubble(message).id(message.id)
                            }
                            if sending {
                                HStack {
                                    ProgressView()
                                        .tint(LabTheme.orange)
                                    Text("Toby is reading your Lab data…")
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(LabTheme.muted)
                                    Spacer()
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                        .padding(20)
                    }
                    .onChange(of: state.coachMessages.count) { _, _ in
                        if let last = state.coachMessages.last?.id {
                            withAnimation { proxy.scrollTo(last, anchor: .bottom) }
                        }
                    }
                }
                composer
            }
            .navigationTitle("Toby")
        }
    }

    private var coachHeader: some View {
        PremiumCard {
            HStack(spacing: 14) {
                Image(systemName: "brain.head.profile")
                    .font(.largeTitle.weight(.black))
                    .foregroundStyle(LabTheme.blue)
                    .frame(width: 58, height: 58)
                    .background(LabTheme.blue.opacity(0.15), in: Circle())
                VStack(alignment: .leading, spacing: 4) {
                    Text("Toby is online")
                        .font(.title3.weight(.black))
                        .foregroundStyle(.white)
                    Text("Messages are sent to the same production Toby endpoint used by the member app.")
                        .font(.caption)
                        .foregroundStyle(LabTheme.muted)
                }
                Spacer(minLength: 0)
            }
        }
    }

    private func messageBubble(_ message: ChatMessage) -> some View {
        HStack {
            if !message.isCoach { Spacer(minLength: 48) }
            Text(message.text)
                .font(.body.weight(.medium))
                .foregroundStyle(.white)
                .padding(14)
                .background(message.isCoach ? LabTheme.elevated : LabTheme.blue, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            if message.isCoach { Spacer(minLength: 48) }
        }
    }

    private var composer: some View {
        HStack(spacing: 10) {
            TextField("Ask about training, nutrition, booking…", text: $draft, axis: .vertical)
                .textFieldStyle(.plain)
                .foregroundStyle(.white)
                .lineLimit(1...4)
                .padding(14)
                .background(LabTheme.elevated, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            Button {
                let message = draft
                draft = ""
                sending = true
                Task {
                    await state.sendCoachMessage(message)
                    sending = false
                }
            } label: {
                Image(systemName: sending ? "hourglass" : "arrow.up")
                    .font(.headline.weight(.black))
                    .foregroundStyle(.white)
                    .frame(width: 46, height: 46)
                    .background(LabTheme.orange.gradient, in: Circle())
            }
            .disabled(sending || draft.nilIfBlank == nil)
            .opacity(sending || draft.nilIfBlank == nil ? 0.5 : 1)
        }
        .padding(16)
        .background(.ultraThinMaterial)
    }
}
