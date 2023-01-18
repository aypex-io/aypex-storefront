module Aypex
  module ProductHelper
    include Aypex::BaseHelper

    # returns the formatted price for the specified variant
    # as a full price or a difference depending on configuration
    def variant_price(variant)
      if Aypex::Config[:show_variant_full_price]
        variant_full_price(variant)
      else
        variant_price_diff(variant)
      end
    end

    # returns the formatted price for the specified variant as
    # a difference from product price
    def variant_price_diff(variant)
      variant_amount = variant.amount_in(current_currency)
      product_amount = variant.product.amount_in(current_currency)
      return if variant_amount == product_amount || product_amount.nil?

      diff = variant.amount_in(current_currency) - product_amount
      amount = Aypex::Money.new(diff.abs, currency: current_currency).to_html
      label = (diff > 0) ? :add : :subtract
      "(#{Aypex.t(label)}: #{amount})".html_safe
    end

    # returns the formatted full price for the variant,
    # if at least one variant price differs from product price
    def variant_full_price(variant)
      product = variant.product
      unless product.variants.active(current_currency).all? { |v| v.price == product.price }
        Aypex::Money.new(variant.price, currency: current_currency).to_html
      end
    end

    # Returns the best guess variant image for the tagged options
    # else it returns the first image and falls back to the missing
    # image logo.
    # If you have pre-loaded images, you can pass the has in
    # and lastly you can specify an image size.
    def variant_image(variant, size: nil, pre_loaded_images: nil)
      imgs = pre_loaded_images || variant.product.images
      option_values = variant.option_values

      img = if imgs.empty?
        aypex_storefront_svg_tag "logo.svg", class: "no-image", size: "60px"
      elsif variant.is_master?
        imgs.first
      else
        active_image_filter = option_values.joins(:option_type).where(option_type: {image_filter: true}).first
        option_value_id = active_image_filter.id.to_s
        imgs.where(private_metadata: {option_value_ids: [option_value_id]}).first
      end

      if img.instance_of? Aypex::Image
        if size.nil?
          image_tag img.original_url
        else
          image_tag img.generate_url(size: size)
        end
      else
        img
      end
    end

    def default_variant(variants, product)
      variants_option_types_presenter(variants, product).default_variant || product.default_variant
    end

    def should_display_compare_at_price?(default_variant)
      default_variant_price = default_variant.price_in(current_currency)
      default_variant_price.compare_at_amount.present? && (default_variant_price.compare_at_amount > default_variant_price.amount)
    end

    def used_variants_options(variants, product)
      variants_option_types_presenter(variants, product).options
    end

    def line_item_description_text(description_text)
      if description_text.present?
        truncate(strip_tags(description_text.gsub("&nbsp;", " ").squish), length: 100)
      else
        Aypex.t(:product_has_no_description)
      end
    end

    def cache_key_for_products(products = @products, additional_cache_key = nil)
      max_updated_at = (products.except(:group, :order).maximum(:updated_at) || Date.today).to_s(:number)
      products_cache_keys = "aypex/products/#{products.map(&:id).join("-")}-#{params[:page]}-#{params[:sort_by]}-#{max_updated_at}-#{@category&.id}"
      (common_product_cache_keys + [products_cache_keys] + [additional_cache_key]).compact.join("/")
    end

    def cache_key_for_product(product = @product)
      cache_key_elements = common_product_cache_keys
      cache_key_elements += [
        product.cache_key_with_version,
        product.possible_promotions.map(&:cache_key)
      ]

      cache_key_elements.compact.join("/")
    end

    def available_status(product)
      return Aypex.t(:archived) if product.discontinued?
      return Aypex.t(:deleted) if product.deleted?

      if product.available?
        Aypex.t(:active)
      elsif product.make_active_at&.future?
        Aypex.t(:pending_sale)
      else
        Aypex.t(:draft)
      end
    end

    def product_images(product, variants)
      if product.variants_and_option_values(current_currency).any?
        variants_without_master_images = variants.reject(&:is_master).map(&:images).flatten

        if variants_without_master_images.any?
          return variants_without_master_images
        end
      end

      variants.map(&:images).flatten
    end

    def option_value_default_image(product, option_value_id)
      product.master_images.where(private_metadata: {option_value_ids: [option_value_id.to_s]}).first
    end

    def product_relation_types
      @product_relation_types ||= @product.respond_to?(:relation_types) ? @product.relation_types : []
    end

    def product_relations_by_type(relation_type)
      return [] if product_relation_types.none? || !@product.respond_to?(:relations)

      product_ids = @product.relations.where(relation_type: relation_type).pluck(:related_to_id).uniq

      return [] if product_ids.empty?

      current_store.products
        .available.not_discontinued.distinct
        .where(id: product_ids)
        .includes(
          :tax_category,
          master: [
            :prices,
            {images: {attachment_attachment: :blob}}
          ]
        )
        .limit(Aypex::Config[:products_per_page])
    end

    def related_products
      return [] unless @product.respond_to?(:has_related_products?)

      @related_products ||= relations_by_type("related_products")
    end

    def product_available_in_currency?
      !(@product_price.nil? || @product_price.zero?)
    end

    def common_product_cache_keys
      base_cache_key + price_options_cache_key
    end

    private

    def price_options_cache_key
      current_price_options.sort.map(&:last).map do |value|
        value.try(:cache_key) || value
      end
    end

    def variants_option_types_presenter(variants, product)
      @variants_option_types_presenter ||= begin
        option_types = Aypex::Variants::OptionTypesFinder.new(variant_ids: variants.map(&:id)).execute

        Aypex::Variants::OptionTypesPresenter.new(option_types, variants, product)
      end
    end
  end
end
