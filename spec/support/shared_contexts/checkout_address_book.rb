shared_context "checkout address book" do
  before do
    @store = Aypex::Store.default || create(:store)
    @state = Aypex::State.all.first || create(:state)
    @zone = Aypex::Zone.global || create(:global_zone)
    @zone.countries << Aypex::Country.all
    @tax_category = Aypex::TaxCategory.first || create(:tax_category)
    @shipping = Aypex::ShippingMethod.find_by_name("UPS Ground") || create(:shipping_method, tax_category: @tax_category)

    create(:credit_card_payment_method, stores: [@store])
    create(:check_payment_method, stores: [@store])

    reset_aypex_preferences do |config|
      config.company = true
      config.alternative_shipping_phone = false
    end

    product = create(:product_in_stock, name: "Ruby on Rails Mug", price: 13.99, stores: [@store])

    add_to_cart(product)
  end

  let(:state) { @state }

  private

  def should_have_address_fields
    expect(page).to have_field("First Name *")
    expect(page).to have_field("Last Name *")
    expect(page).to have_field("#{I18n.t("activerecord.attributes.aypex/address.address1")} #{Aypex.t(:required)}")
    expect(page).to have_field("City *")
    expect(page).to have_field(id: /order_(bill|ship)_address_attributes_country_id/)
    expect(page).to have_field("#{I18n.t("activerecord.attributes.aypex/address.zipcode")} #{Aypex.t(:required)}")
    expect(page).to have_field("#{I18n.t("activerecord.attributes.aypex/address.phone")} #{Aypex.t(:required)}")
  end

  def complete_checkout(address)
    click_button Aypex.t(:save_and_continue)
    find("label > span", text: "UPS Ground").click
    click_button Aypex.t(:save_and_continue)
    fill_in_credit_card_info(address)
    click_button Aypex.t(:save_and_continue)
  end

  def fill_in_address(address, type = :bill)
    fill_in "First Name *", with: address.firstname
    fill_in "Last Name *", with: address.lastname
    fill_in "Company", with: address.company if current_store.address_show_company_address_field
    fill_in "#{I18n.t("activerecord.attributes.aypex/address.address1")} #{Aypex.t(:required)}", with: address.address1
    fill_in I18n.t("activerecord.attributes.aypex/address.address2"), with: address.address2
    select address.state.name, from: "order_#{type}_address_attributes_state_id"
    fill_in "City *", with: address.city
    fill_in "#{I18n.t("activerecord.attributes.aypex/address.zipcode")} #{Aypex.t(:required)}", with: address.zipcode
    fill_in "#{I18n.t("activerecord.attributes.aypex/address.phone")} #{Aypex.t(:required)}", with: address.phone
  end

  def fill_in_credit_card_info(address)
    fill_in "name_on_card", with: "#{address.firstname} #{address.lastname}"
    fill_in "card_number", with: "4111 1111 1111 1111"
    fill_in "card_expiry", with: "12 / 24"
    fill_in "card_code", with: "123"
  end

  def expected_address_format(address_title, address)
    [
      address_title,
      "#{address.firstname} #{address.lastname}",
      address.company.to_s,
      address.address1.to_s,
      address.address2.to_s,
      "#{address.city} #{address.state ? address.state.abbr : address.state_name} #{address.zipcode}",
      address.country.to_s
    ].reject(&:empty?).join("\n")
  end
end
