module Aypex
  module Storefront
    module CmsHelper
      def simple_page?(page)
        page.content.present? && !page.sections?
      end

      def section_tags(section, &block)
        inner_content = content_tag(:div, &block)

        gutters_class = if section.has_gutters
          ""
        else
          "g-0"
        end

        container_class = if section.is_full_screen
          "container-fluid"
        else
          "container"
        end

        content_tag(:section, inner_content, id: "aypex_section_id_#{section.id}", class: "#{container_class} #{gutters_class}")
      end

      def build_section(section)
        section_tags(section) do
          render "aypex/shared/cms/sections/#{aypex_resource_path(section)}", section: section
        end
      end

      def image_size(section, component)
        if section.is_full_screen
          "100vh"
        else
          "max-width: 1300px"
        end
      end
    end
  end
end
