module Aypex
  class ProductsController < Aypex::StoreController
    include Aypex::ProductHelper
    include Aypex::FrontendHelper
    include Aypex::CacheHelper

    before_action :load_product, only: [:show, :related]
    before_action :load_taxon, only: :index
    before_action :can_show_product?, only: :show

    def index
      @searcher = build_searcher(params.merge(include_images: true, current_store: current_store))
      @products = @searcher.retrieve_products

      if http_cache_enabled?
        fresh_when etag: etag_index, last_modified: last_modified_index, public: true
      end
    end

    def show
      @taxon = params[:taxon_id].present? ? taxons_scope.find_by(id: params[:taxon_id]) : nil
      @taxon = @product.taxons.first unless @taxon.present?

      if !http_cache_enabled? || stale?(etag: etag_show, last_modified: last_modified_show, public: true)
        @product_summary = Aypex::ProductSummaryPresenter.new(@product).call
        @product_properties = @product.product_properties.includes(:property)
        load_variants
        @product_images = product_images(@product, @variants)
        @variant ||= default_variant(@variants, @product)
        @product_price = @variant.price_in(current_currency).amount

        if params[:options]
          find_variant
          load_filtered_images
        end
      end
    end

    def related
      if product_relation_types.any?
        render template: 'aypex/products/related', layout: false
      else
        head :no_content
      end
    end

    private

    def accurate_title
      if @product
        @product.meta_title.blank? ? @product.name : @product.meta_title
      else
        super
      end
    end

    def load_product
      @product = current_store.products.for_user(try_aypex_current_user).friendly.find(params[:id])
    end

    def load_taxon
      @taxon = taxons_scope.find(params[:taxon]) if params[:taxon].present?
    end

    def can_show_product?
      raise ActiveRecord::RecordNotFound if @product.stores.exclude?(current_store)
    end

    def find_variant
      return unless request.query_parameters[:options]

      request_opts = request.query_parameters[:options].values
      @variant = Aypex::Variants::Find.new(variants: @variants,
                                           options: request_opts,
                                           return_object: true).execute
    end

    def load_variants
      @variants = @product.
                  variants_including_master.
                  aypex_base_scopes.
                  active(current_currency).
                  includes(
                    :default_price,
                    option_values: [:option_value_variants],
                    images: { attachment_attachment: :blob }
                  )
    end

    def load_filtered_images
      opt_types_array = params[:options].keys
      filtarable_types = Aypex::OptionType.where(id: opt_types_array, image_filter: true).map { |ot| ot.id.to_s }
      filtarable_values = params[:options].values_at(*filtarable_types)

      @option_images = @product_images.select do |image|
        next if filtarable_values.empty?

        (filtarable_values - image.private_metadata[:option_value_ids]).empty?
      end
    end

    def load_option_images(option_id)
      variants = @variants.where(option_values: { id: option_id.to_s })
      @option_images = variants.map(&:images).flatten
    end

    def etag_index
      [
        store_etag,
        last_modified_index,
        available_option_types_cache_key,
        filtering_params_cache_key
      ]
    end

    def etag_show
      [
        store_etag,
        @product,
        @taxon,
        @product.possible_promotion_ids,
        @product.possible_promotions.maximum(:updated_at),
      ]
    end

    alias product_etag etag_show

    def last_modified_index
      products_last_modified      = @products.maximum(:updated_at)&.utc if @products.respond_to?(:maximum)
      current_store_last_modified = current_store.updated_at.utc

      [products_last_modified, current_store_last_modified].compact.max
    end

    def last_modified_show
      product_last_modified       = @product.updated_at.utc
      current_store_last_modified = current_store.updated_at.utc

      [product_last_modified, current_store_last_modified].compact.max
    end

    def taxons_scope
      current_store.taxons
    end
  end
end
