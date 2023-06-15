module Aypex
  module Storefront
    module StorefrontHelper
      include BaseHelper
      include InlineSvg::ActionView::Helpers

      def create_product_image_tag(image, product, options, style)
        options[:alt] = image.alt.blank? ? product.name : image.alt
        image_tag main_app.cdn_image_url(image.url(style)), options
      end

      def define_image_method(style)
        self.class.send :define_method, "#{style}_image" do |product, *options|
          options = options.first || {}
          options[:alt] ||= product.name
          image_path = default_image_for_product_or_variant(product)
          img = if image_path.present?
            create_product_image_tag image_path, product, options, style
          else
            aypex_storefront_svg_tag "logo.svg", class: "noimage", size: "60px"
          end

          content_tag(:div, img, class: "product-image-container #{style}-img")
        end
      end

      # Returns style of image or nil
      def image_style_from_method_name(method_name)
        style = method_name.to_s.sub(/_image$/, "")

        if method_name.to_s.match(/_image$/) && (style.in? Aypex::Image.styles.with_indifferent_access)
          style
        end
      end

      def body_class
        @body_class ||= content_for?(:sidebar) ? "two-col" : "one-col"
        @body_class
      end

      def logo(image_path = nil, options = {})
        logo_attachment = if defined?(Aypex::StoreLogo) && current_store.logo.is_a?(Aypex::StoreLogo)
          current_store.logo.attachment
        end

        image_path ||= if logo_attachment&.attached? && logo_attachment&.variable?
          main_app.cdn_image_url(logo_attachment.variant(resize_to_limit: [244, 104]))
        else
          asset_path("aypex/storefront/logo.svg")
        end

        path = aypex.respond_to?(:root_path) ? aypex.root_path : main_app.root_path

        link_to path, "aria-label": current_store.name, method: options[:method] do
          image_tag image_path, alt: current_store.name, title: current_store.name, class: "mw-100"
        end
      end

      def aypex_breadcrumbs(category, _separator = "", product = nil)
        return "" if current_page?("/") || category.nil?

        # breadcrumbs for root
        crumbs = [content_tag(:li, content_tag(
          :a, content_tag(
            :span, I18n.t("aypex.storefront.home"), itemprop: "name"
          ) << content_tag(:meta, nil, itemprop: "position", content: "0"), itemprop: "url", href: aypex.root_path
        ) << content_tag(:span, nil, itemprop: "item", itemscope: "itemscope", itemtype: "https://schema.org/Thing", itemid: aypex.root_path), itemscope: "itemscope", itemtype: "https://schema.org/ListItem", itemprop: "itemListElement", class: "breadcrumb-item")]

        if category
          ancestors = category.ancestors.where.not(parent_id: nil)

          # breadcrumbs for ancestor categories
          crumbs << ancestors.each_with_index.map do |ancestor, index|
            content_tag(:li, content_tag(
              :a, content_tag(
                :span, ancestor.name, itemprop: "name"
              ) << content_tag(:meta, nil, itemprop: "position", content: index + 1), itemprop: "url", href: seo_url(ancestor, params: permitted_product_params)
            ) << content_tag(:span, nil, itemprop: "item", itemscope: "itemscope", itemtype: "https://schema.org/Thing", itemid: seo_url(ancestor, params: permitted_product_params)), itemscope: "itemscope", itemtype: "https://schema.org/ListItem", itemprop: "itemListElement", class: "breadcrumb-item")
          end

          # breadcrumbs for current category
          crumbs << content_tag(:li, content_tag(
            :a, content_tag(
              :span, category.name, itemprop: "name"
            ) << content_tag(:meta, nil, itemprop: "position", content: ancestors.size + 1), itemprop: "url", href: seo_url(category, params: permitted_product_params)
          ) << content_tag(:span, nil, itemprop: "item", itemscope: "itemscope", itemtype: "https://schema.org/Thing", itemid: seo_url(category, params: permitted_product_params)), itemscope: "itemscope", itemtype: "https://schema.org/ListItem", itemprop: "itemListElement", class: "breadcrumb-item")

          # breadcrumbs for product
          if product
            crumbs << content_tag(:li, content_tag(
              :span, content_tag(
                :span, product.name, itemprop: "name"
              ) << content_tag(:meta, nil, itemprop: "position", content: ancestors.size + 2), itemprop: "url", href: aypex.product_path(product, category_id: category&.id)
            ) << content_tag(:span, nil, itemprop: "item", itemscope: "itemscope", itemtype: "https://schema.org/Thing", itemid: aypex.product_path(product, category_id: category&.id)), itemscope: "itemscope", itemtype: "https://schema.org/ListItem", itemprop: "itemListElement", class: "breadcrumb-item")
          end
        else
          # breadcrumbs for product on PDP
          crumbs << content_tag(:li, content_tag(
            :span, I18n.t("aypex.storefront.products"), itemprop: "item"
          ) << content_tag(:meta, nil, itemprop: "position", content: "1"), class: "active", itemscope: "itemscope", itemtype: "https://schema.org/ListItem", itemprop: "itemListElement")
        end
        crumb_list = content_tag(:ol, raw(crumbs.flatten.map(&:mb_chars).join), class: "breadcrumb", itemscope: "itemscope", itemtype: "https://schema.org/BreadcrumbList")
        content_tag(:nav, crumb_list, id: "breadcrumbs", class: "col-12 mt-1 mt-sm-3 mt-lg-4", aria: {label: I18n.t("aypex.storefront.breadcrumbs")})
      end

      def class_for(flash_type)
        {
          success: "success",
          registration_error: "danger",
          error: "danger",
          alert: "danger",
          warning: "warning",
          notice: "success"
        }[flash_type.to_sym]
      end

      def flash_messages(opts = {})
        flashes = ""
        excluded_types = opts[:excluded_types].to_a.map(&:to_s)

        flash.to_h.except("order_completed").each do |msg_type, text|
          next if msg_type.blank? || excluded_types.include?(msg_type)

          flashes << content_tag(:div, class: "alert alert-#{class_for(msg_type)} mb-0") do
            content_tag(:button, "&times;".html_safe, class: "close", data: {dismiss: "alert", hidden: true}) +
              content_tag(:span, text)
          end
        end
        flashes.html_safe
      end

      def permitted_product_params
        product_filters = available_option_types.map(&:name)
        params.permit(product_filters << :sort_by)
      end

      def carousel_image_source_set(image)
        return "" unless image

        widths = {lg: 1200, md: 992, sm: 768, xs: 576}
        set = []
        widths.each do |key, value|
          file = main_app.cdn_image_url(image.url("plp_and_carousel_#{key}"))

          set << "#{file} #{value}w"
        end
        set.join(", ")
      end

      def categories_tree(root_category, current_category, max_level = 1)
        return "" if max_level < 1 || root_category.leaf?

        content_tag :div, class: "list-group" do
          categories = root_category.children.map do |category|
            css_class = current_category&.self_and_ancestors&.include?(category) ? "list-group-item list-group-item-action active" : "list-group-item list-group-item-action"
            link_to(category.name, seo_url(category), class: css_class) + categories_tree(category, current_category, max_level - 1)
          end
          safe_join(categories, "\n")
        end
      end

      def set_image_alt(image)
        return image.alt if image.alt.present?
      end

      def aypex_storefront_svg_tag(file_name, options = {})
        prefixed_file = "aypex/storefront/#{file_name}"

        inline_svg_tag(prefixed_file, options)
      end

      def price_filter_values
        ActiveSupport::Deprecation.warn(<<-DEPRECATION, caller)
          `StorefrontHelper#price_filter_values` is deprecated and will be removed in Aypex 5.0.
          Please use `ProductsFiltersHelper#price_filters` method
        DEPRECATION

        @price_filter_values ||= [
          "#{I18n.t("aypex.storefront.less_than")} #{formatted_price(50)}",
          "#{formatted_price(50)} - #{formatted_price(100)}",
          "#{formatted_price(101)} - #{formatted_price(150)}",
          "#{formatted_price(151)} - #{formatted_price(200)}",
          "#{formatted_price(201)} - #{formatted_price(300)}"
        ]
      end

      def static_filters
        @static_filters ||= Aypex::Storefront::Config.products_filters
      end

      def additional_filters_partials
        @additional_filters_partials ||= Aypex::Storefront::Config.additional_filters_partials
      end

      def filtering_params
        @filtering_params ||= available_option_types.map(&:filter_param).concat(static_filters)
      end

      def filtering_params_cache_key
        @filtering_params_cache_key ||= begin
          cache_key_parts = []

          permitted_products_params.each do |key, value|
            next if value.blank?

            if value.is_a?(String)
              cache_key_parts << [key, value].join("-")
            else
              value.each do |part_key, part_value|
                next if part_value.blank?

                cache_key_parts << [part_key, part_value].join("-")
              end
            end
          end

          cache_key_parts.join("-").parameterize
        end
      end

      def filters_cache_key(kind)
        base_cache_key + [
          kind,
          available_option_types_cache_key,
          available_properties_cache_key,
          filtering_params_cache_key,
          @category&.id,
          params[:menu_open]
        ].flatten
      end

      def permitted_products_params
        @permitted_products_params ||= params.permit(*filtering_params, properties: available_properties.map(&:filter_param))
      end

      def option_type_cache_key(option_type)
        filter_param = option_type.filter_param
        filtered_params = params[filter_param]

        [
          available_option_types_cache_key,
          filter_param,
          filtered_params
        ]
      end

      def available_option_types_cache_key
        @available_option_types_cache_key ||= [
          Aypex::OptionType.filterable.maximum(:updated_at).to_f,
          products_for_filters_cache_key
        ].flatten.join("/")
      end

      def available_option_types
        @available_option_types ||= Rails.cache.fetch("available-option-types/#{available_option_types_cache_key}") do
          option_values = OptionValues::FindAvailable.new(products_scope: products_for_filters).execute
          Filters::OptionsPresenter.new(option_values_scope: option_values).to_a
        end
      end

      def available_properties_cache_key
        @available_properties_cache_key ||= [
          Aypex::Property.filterable.maximum(:updated_at).to_f,
          products_for_filters_cache_key
        ].flatten.join("/")
      end

      def available_properties
        @available_properties ||= Rails.cache.fetch("available-properties/#{available_properties_cache_key}") do
          product_properties = ProductProperties::FindAvailable.new(products_scope: products_for_filters).execute
          Filters::PropertiesPresenter.new(product_properties_scope: product_properties).to_a
        end
      end

      def aypex_social_link(service)
        return "" if current_store.send(service).blank?

        link_to "https://#{service}.com/#{current_store.send(service)}", target: :blank, rel: "nofollow noopener", "aria-label": service do
          content_tag :figure, id: service, class: "px-2" do
            aypex_storefront_svg_tag("#{service}.svg", width: 22, height: 22)
          end
        end
      end

      def checkout_available_payment_methods
        @checkout_available_payment_methods ||= @order.available_payment_methods
      end

      def color_option_type_name
        @color_option_type_name ||= Aypex::OptionType.color&.name
      end

      def country_flag_icon(country_iso_code = nil)
        return if country_iso_code.blank?

        content_tag :span, nil, class: "flag-icon flag-icon-#{country_iso_code.downcase}"
      end

      def product_wysiwyg_editor_enabled?
        defined?(Aypex::Backend) && Aypex::Backend::Config[:product_wysiwyg_editor_enabled]
      end

      def category_wysiwyg_editor_enabled?
        defined?(Aypex::Backend) && Aypex::Backend::Config[:category_wysiwyg_editor_enabled]
      end

      # converts line breaks in product description into <p> tags (for html display purposes)
      def product_description(product)
        description = if Aypex::Storefront::Config.show_raw_product_description || product_wysiwyg_editor_enabled?
          product.description
        else
          product.description.to_s.gsub(/(.*?)\r?\n\r?\n/m, '<p>\1</p>')
        end
        description.blank? ? I18n.t("aypex.storefront.product_has_no_description") : description
      end

      private

      def formatted_price(value)
        Aypex::Money.new(value, currency: current_currency, no_cents_if_whole: true).to_s
      end

      def credit_card_icon(type)
        available_icons = %w[visa american_express diners_club discover jcb maestro master]

        if available_icons.include?(type)
          image_tag "credit_cards/icons/#{type}.svg", class: "payment-sources-list-item-image"
        else
          image_tag "credit_cards/icons/generic.svg", class: "payment-sources-list-item-image"
        end
      end

      def checkout_edit_link(step = "address", order = @order)
        return if order.uneditable?

        classes = "align-text-bottom checkout-confirm-delivery-informations-link"

        link_to aypex.checkout_state_path(step), class: classes, method: :get do
          aypex_storefront_svg_tag "edit.svg"
        end
      end

      def products_for_filters
        @products_for_filters ||= current_store.products.for_filters(current_currency, category: @category)
      end

      def products_for_filters_cache_key
        @products_for_filters_cache_key ||= [
          products_for_filters.maximum(:updated_at).to_f,
          base_cache_key,
          @category&.permalink
        ].flatten.compact
      end
    end
  end
end
