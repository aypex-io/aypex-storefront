require "digest"

module Aypex
  module Storefront
    module NavigationHelper
      def aypex_menu_cache_key(section = "header")
        keys = base_cache_key + [
          current_store.cache_key_with_version,
          aypex_menu(section)&.cache_key_with_version,
          stores&.maximum(:updated_at),
          section
        ]
        Digest::MD5.hexdigest(keys.join("-"))
      end

      def aypex_menu(location = "header")
        method_name = "for_#{location}"

        if available_menus.respond_to?(method_name) && Aypex::Menu::MENU_LOCATIONS_PARAMETERIZED.include?(location)
          available_menus.send(method_name, I18n.locale) || current_store.default_menu(location)
        end
      end

      def aypex_localized_link(item)
        return if item.link.nil?

        output_locale = if locale_param
          "/#{I18n.locale}"
        end

        if ["Aypex::Product", "Aypex::Category", "Aypex::CmsPage"].include?(item.linked_resource_type)
          output_locale.to_s + item.link
        elsif item.linked_resource_type == "Home Page"
          "/#{locale_param}"
        else
          item.link
        end
      end

      def should_render_internationalization_dropdown?
        (defined?(should_render_locale_dropdown?) && should_render_locale_dropdown?) ||
          (defined?(should_render_currency_dropdown?) && should_render_currency_dropdown?)
      end

      def aypex_nav_link_tag(item, opts = {}, &block)
        if item.new_window
          target = opts[:target] || "_blank"
          rel = opts[:rel] || "noopener noreferrer"
        end

        active_class = if request && current_page?(aypex_localized_link(item))
          "active #{opts[:class]}"
        else
          opts[:class]
        end

        link_opts = {target: target, rel: rel, class: active_class, id: opts[:id], data: opts[:data], aria: opts[:aria]}

        if block
          link_to aypex_localized_link(item), link_opts, &block
        else
          link_to item.name, aypex_localized_link(item), link_opts
        end
      end

      private

      def aypex_navigation_data_cache_key
        @aypex_navigation_data_cache_key ||= Digest::MD5.hexdigest(aypex_navigation_data.to_s)
      end
    end
  end
end
