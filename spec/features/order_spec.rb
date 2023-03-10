require "spec_helper"

describe "orders", type: :feature do
  let(:order) { OrderWalkthrough.up_to(:complete) }
  let(:user) { create(:user) }

  before do
    order.update_attribute(:user_id, user.id)
    allow_any_instance_of(Aypex::OrdersController).to receive_messages(try_aypex_current_user: user)
  end

  it "can visit an order" do
    # Regression test for current_user call on orders/show
    expect { visit aypex.order_path(order) }.not_to raise_error
  end

  it "displays line item price" do
    # Regression test for #2772
    line_item = order.line_items.first
    line_item.target_shipment = create(:shipment)
    line_item.price = 19.00
    line_item.save!

    visit aypex.order_path(order)

    within first('[data-hook="order_item_price"]') do
      expect(page).to have_content "19.00"
    end
  end

  it "has credit card info if paid with credit card" do
    create(:payment, order: order)
    visit aypex.order_path(order)

    within "#order_summary" do
      expect(page).to have_content "Ending in 1111"
    end
  end

  it "has payment method name visible if not paid with credit card" do
    create(:check_payment, order: order)
    visit aypex.order_path(order)

    within "#order_summary" do
      expect(page).to have_content "Check"
    end
  end

  # Regression test for #2282
  context "can support a credit card with blank information" do
    before do
      credit_card = create(:credit_card)
      credit_card.update_column(:cc_type, "")
      payment = order.payments.first
      payment.source = credit_card
      payment.save!
    end

    specify do
      visit aypex.order_path(order)

      within "#order_summary" do
        expect(page).to have_content "Ending in 1111"
      end
    end
  end

  it "returns the correct title when displaying a completed order" do
    visit aypex.order_path(order)

    within "#order_summary" do
      expect(page).to have_content("#{Aypex.t(:order)} #{order.number}")
    end
  end

  # Regression test for #6733
  context "address_requires_state preference" do
    context "when set to true" do
      before do
        configure_aypex_preferences { |config| config.address_requires_state = true }
      end

      it "shows state text" do
        visit aypex.order_path(order)

        within "#order_summary" do
          expect(page).to have_content(order.bill_address.state_text)
          expect(page).to have_content(order.ship_address.state_text)
        end
      end
    end

    context "when set to false" do
      before do
        configure_aypex_preferences { |config| config.address_requires_state = false }
      end

      it "does not show state text" do
        visit aypex.order_path(order)

        within "#order_summary" do
          expect(page).not_to have_content(order.bill_address.state_text)
          expect(page).not_to have_content(order.ship_address.state_text)
        end
      end
    end
  end

  it "does not have save and continue button" do
    visit aypex.order_path(order)

    expect(page).not_to have_selector("input.btn-primary.checkout-content-save-continue-button[data-disable-with]")
  end

  it "does not have place order button" do
    visit aypex.order_path(order)

    expect(page).not_to have_button(class: "btn-primary", value: "Place Order")
  end

  it "does not have link to checkout address step" do
    visit aypex.order_path(order)

    expect(page).not_to have_link(href: aypex.checkout_state_path(:address))
  end

  it "does not have link to checkout delivery step" do
    visit aypex.order_path(order)

    expect(page).not_to have_link(href: aypex.checkout_state_path(:delivery))
  end

  it "does not have link to checkout payment step" do
    visit aypex.order_path(order)

    expect(page).not_to have_link(href: aypex.checkout_state_path(:payment))
  end
end
