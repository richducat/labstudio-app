import SwiftUI

struct MarketView: View {
    @Environment(LabAppState.self) private var state
    @Environment(\.openURL) private var openURL
    @State private var category = "passes"

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    cartSummary
                    Picker("Category", selection: $category) {
                        Text("Passes").tag("passes")
                        Text("Cafe").tag("cafe")
                    }
                    .pickerStyle(.segmented)

                    if category == "passes" {
                        products
                    } else {
                        cafe
                    }
                }
                .padding(20)
            }
            .refreshable { await state.refreshAfterMutation() }
            .navigationTitle("Market")
        }
    }

    private var cartSummary: some View {
        PremiumCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    MetricPill(title: "Cart", value: "\(state.cartCount) items", icon: "bag.fill", tint: LabTheme.orange)
                    Text(Currency.format(cents: state.cartTotalCents))
                        .font(.title3.weight(.black))
                        .foregroundStyle(.white)
                }

                if !state.cart.isEmpty {
                    ForEach(state.cart) { line in
                        HStack {
                            Text("\(line.quantity)x \(line.name)")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(LabTheme.muted)
                                .lineLimit(1)
                            Spacer()
                            Text(Currency.format(cents: line.priceCents * line.quantity))
                                .font(.caption.weight(.black))
                                .foregroundStyle(.white)
                        }
                    }
                }

                HStack(spacing: 12) {
                    LabButton(title: "Checkout", icon: "creditcard.fill", tint: LabTheme.green, isDisabled: state.cart.isEmpty) {
                        Task {
                            if let url = await state.checkoutCart() {
                                openURL(url)
                            }
                        }
                    }
                    LabButton(title: "Clear", icon: "trash.fill", tint: LabTheme.red, isDisabled: state.cart.isEmpty) {
                        state.clearCart()
                    }
                }
            }
        }
    }

    private var products: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Memberships & Passes", icon: "figure.strengthtraining.traditional")
            if state.shopProducts.isEmpty {
                EmptyLabState(title: "No products available", detail: "The live Stripe catalog did not return any active products.", icon: "bag")
            } else {
                ForEach(state.shopProducts) { item in
                    itemCard(
                        name: item.name,
                        detail: item.description ?? "Lab Studio pass or membership",
                        tag: item.stripePriceId != nil ? "Stripe checkout" : "Direct checkout",
                        price: Currency.format(cents: item.priceCents),
                        imageURL: item.imageUrl.flatMap(URL.init(string:)),
                        action: { state.addToCart(product: item) }
                    )
                }
            }
        }
    }

    private var cafe: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Studio Cafe", icon: "takeoutbag.and.cup.and.straw.fill")
            if state.cafeItems.isEmpty {
                EmptyLabState(title: "Cafe unavailable", detail: "Cafe items are loaded from the production Lab Studio API.", icon: "cup.and.saucer.fill")
            } else {
                ForEach(state.cafeItems) { item in
                    itemCard(
                        name: item.name,
                        detail: item.category.capitalized,
                        tag: item.stripePriceId != nil ? "Stripe item" : "Cafe item",
                        price: Currency.format(cents: item.priceCents),
                        imageURL: item.imageUrl.flatMap(URL.init(string:)),
                        action: { state.addToCart(cafeItem: item) }
                    )
                }
            }
        }
    }

    private func itemCard(name: String, detail: String, tag: String, price: String, imageURL: URL?, action: @escaping () -> Void) -> some View {
        PremiumCard(interactive: true) {
            HStack(spacing: 14) {
                AsyncImage(url: imageURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    ZStack {
                        LabTheme.elevated
                        Image(systemName: "photo")
                            .foregroundStyle(LabTheme.muted)
                    }
                }
                .frame(width: 82, height: 82)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

                VStack(alignment: .leading, spacing: 7) {
                    Text(tag.uppercased())
                        .font(.caption2.weight(.black))
                        .foregroundStyle(LabTheme.orange)
                    Text(name)
                        .font(.headline.weight(.black))
                        .foregroundStyle(.white)
                    Text(detail)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(LabTheme.muted)
                        .lineLimit(2)
                }
                Spacer(minLength: 8)
                VStack(spacing: 12) {
                    Text(price)
                        .font(.headline.weight(.black))
                        .foregroundStyle(.white)
                    Button(action: action) {
                        Image(systemName: "plus")
                            .font(.headline.weight(.black))
                            .foregroundStyle(.white)
                            .frame(width: 42, height: 42)
                            .background(LabTheme.orange.gradient, in: Circle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}
