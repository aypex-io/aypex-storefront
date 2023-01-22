module Aypex
  class CategoriesController < Aypex::StoreController
    include Aypex::Storefront::StorefrontHelper
    include Aypex::Storefront::CacheHelper

    before_action :load_category

    def show
      if !http_cache_enabled? || stale?(etag: etag, last_modified: last_modified, public: true)
        load_products
      end
    end

    def product_carousel
      if !http_cache_enabled? || stale?(etag: carousel_etag, last_modified: last_modified, public: true)
        load_products
        if @products.reload.any?
          render template: "aypex/categories/product_carousel", layout: false
        else
          head :no_content
        end
      end
    end

    private

    def accurate_title
      @category.try(:seo_title) || super
    end

    def load_category
      @category = current_store.categories.friendly.find(params[:id])
    end

    def load_products
      search_params = params.merge(
        current_store: current_store,
        category: @category,
        include_images: true
      )

      @searcher = build_searcher(search_params)
      @products = @searcher.retrieve_products
    end

    def etag
      [
        store_etag,
        @category,
        available_option_types_cache_key,
        filtering_params_cache_key
      ]
    end

    def carousel_etag
      [
        store_etag,
        @category
      ]
    end

    def last_modified
      category_last_modified = @category&.updated_at&.utc
      current_store_last_modified = current_store.updated_at.utc

      [category_last_modified, current_store_last_modified].compact.max
    end
  end
end
