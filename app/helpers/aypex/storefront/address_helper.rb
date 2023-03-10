module Aypex
  module Storefront
    module AddressHelper
      def address_field(form, method, address_id = "b", &handler)
        content_tag :div, id: [address_id, method].join, class: "form-group checkout-content-inner-field has-float-label" do
          if handler
            yield
          else
            is_required = Aypex::Address.required_fields.include?(method)
            method_name = I18n.t("activerecord.attributes.aypex/address.#{method}")
            required = I18n.t("aypex.storefront.required")
            form.text_field(method,
              class: ["aypex-flat-input"].compact,
              required: is_required,
              placeholder: is_required ? "#{method_name} #{required}" : method_name,
              aria: {label: method_name}) +
              form.label(method_name,
                is_required ? "#{method_name} #{required}" : method_name,
                class: "text-uppercase")
          end
        end
      end

      def address_zipcode(form, country, address_id = "b")
        country ||= address_default_country
        is_required = country.zipcode_required?
        method_name = I18n.t("aypex.storefront.zipcode")
        required = I18n.t("aypex.storefront.required")
        form.text_field(:zipcode,
          class: ["aypex-flat-input"].compact,
          required: is_required,
          placeholder: is_required ? "#{method_name} #{required}" : method_name,
          aria: {label: I18n.t("aypex.storefront.zipcode")}) +
          form.label(:zipcode,
            is_required ? "#{method_name} #{required}" : method_name,
            class: "text-uppercase",
            id: address_id + "_zipcode_label")
      end

      def address_state(form, country, address_id = "b")
        country ||= address_default_country
        have_states = country.states.any?
        state_elements = [
          form.collection_select(:state_id, checkout_zone_applicable_states_for(country).sort_by(&:name),
            :id, :name,
            {prompt: I18n.t("aypex.storefront.state")},
            class: ["aypex-flat-select"].compact,
            aria: {label: I18n.t("aypex.storefront.state")},
            disabled: !have_states) +
            form.text_field(:state_name,
              class: ["aypex-flat-input"].compact,
              aria: {label: I18n.t("aypex.storefront.state")},
              disabled: have_states,
              placeholder: I18n.t("aypex.storefront.state") + " #{I18n.t("aypex.storefront.required")}") +
            form.label(I18n.t("aypex.storefront.state").downcase,
              raw(I18n.t("aypex.storefront.state") + content_tag(:abbr, " #{I18n.t("aypex.storefront.required")}")),
              class: [have_states ? "state-select-label" : nil, " text-uppercase"].compact,
              id: address_id + "_state_label") +
            aypex_storefront_svg_tag("arrow.svg",
              class: [(!have_states) ? "hidden" : nil, "position-absolute aypex-flat-select-arrow"].compact)
        ].join.tr('"', "'").delete("\n")

        content_tag :span, class: "d-block position-relative" do
          state_elements.html_safe
        end
      end

      def user_available_addresses
        @user_available_addresses ||= begin
          return [] unless try_aypex_current_user

          states = current_store.countries_available_for_checkout.each_with_object([]) do |country, memo|
            memo << current_store.states_available_for_checkout(country)
          end.flatten

          try_aypex_current_user.addresses
            .where(country_id: states.pluck(:country_id).uniq)
        end
      end

      def checkout_zone_applicable_states_for(country)
        current_store.states_available_for_checkout(country)
      end

      def address_default_country
        @address_default_country ||= current_store.default_country
      end
    end
  end
end
