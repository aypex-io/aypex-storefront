module Aypex
  module Storefront
    class Configuration
      attr_writer :user_account_name, :user_account_controller, :additional_filters_partials, :always_put_site_name_in_title, :coupon_codes_enabled,
        :http_cache_enabled, :layout, :locale, :products_filters, :remember_me_enabled, :show_raw_product_description,
        :show_quantity_input_on_product_page, :show_store_selector, :title_site_name_separator

      def user_account_name
        self.user_account_name = "account" unless @user_account_name

        if @user_account_name.is_a?(String)
          @user_account_name
        else
          raise "Aypex::Storefront::Config.user_account_name MUST be an String"
        end
      end

      def user_account_controller
        self.user_account_controller = "users" unless @user_account_controller

        if @user_account_controller.is_a?(String)
          @user_account_controller
        else
          raise "Aypex::Storefront::Config.user_account_controller MUST be an String"
        end
      end

      def locale
        self.locale = nil unless @locale

        @locale
      end

      def always_put_site_name_in_title
        self.always_put_site_name_in_title = true unless @always_put_site_name_in_title == false

        if @always_put_site_name_in_title.in? [true, false]
          @always_put_site_name_in_title
        else
          raise "Aypex::Storefront::Config.always_put_site_name_in_title MUST be a Boolean (true / false)"
        end
      end

      def coupon_codes_enabled
        self.coupon_codes_enabled = true unless @coupon_codes_enabled == false

        if @coupon_codes_enabled.in? [true, false]
          @coupon_codes_enabled
        else
          raise "Aypex::Storefront::Config.coupon_codes_enabled MUST be a Boolean (true / false)"
        end
      end

      def http_cache_enabled
        self.http_cache_enabled = true unless @http_cache_enabled == false

        if @http_cache_enabled.in? [true, false]
          @http_cache_enabled
        else
          raise "Aypex::Storefront::Config.http_cache_enabled MUST be a Boolean (true / false)"
        end
      end

      def remember_me_enabled
        self.remember_me_enabled = true unless @remember_me_enabled == false

        if @remember_me_enabled.in? [true, false]
          @remember_me_enabled
        else
          raise "Aypex::Storefront::Config.remember_me_enabled MUST be a Boolean (true / false)"
        end
      end

      def show_raw_product_description
        self.show_raw_product_description = false unless @show_raw_product_description == true

        if @show_raw_product_description.in? [true, false]
          @show_raw_product_description
        else
          raise "Aypex::Config.show_raw_product_description MUST be a Boolean (true / false)"
        end
      end

      def show_quantity_input_on_product_page
        self.show_quantity_input_on_product_page = false unless @show_quantity_input_on_product_page == true

        if @show_quantity_input_on_product_page.in? [true, false]
          @show_quantity_input_on_product_page
        else
          raise "Aypex::Storefront::Config.show_quantity_input_on_product_page MUST be a Boolean (true / false)"
        end
      end

      def show_store_selector
        self.show_store_selector = false unless @show_store_selector == true

        if @show_store_selector.in? [true, false]
          @show_store_selector
        else
          raise "Aypex::Storefront::Config.show_store_selector MUST be a Boolean (true / false)"
        end
      end

      def additional_filters_partials
        self.additional_filters_partials = [] unless @additional_filters_partials

        if @additional_filters_partials.is_a?(Array)
          @additional_filters_partials
        else
          raise "Aypex::Storefront::Config.additional_filters_partials MUST be an Array"
        end
      end

      def products_filters
        self.products_filters = %w[keywords price sort_by] unless @products_filters

        if @products_filters.is_a?(Array)
          @products_filters
        else
          raise "Aypex::Storefront::Config.products_filters MUST be an Array"
        end
      end

      def layout
        self.layout = "aypex/layouts/aypex_application" unless @layout

        if @layout.is_a?(String)
          @layout
        else
          raise "Aypex::Storefront::Config.layout MUST be an String"
        end
      end

      def title_site_name_separator
        self.title_site_name_separator = "-" unless @title_site_name_separator

        if @title_site_name_separator.is_a?(String)
          @title_site_name_separator
        else
          raise "Aypex::Storefront::Config.title_site_name_separator MUST be an String"
        end
      end
    end
  end
end
